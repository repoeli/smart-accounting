from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.utils import timezone
from django.db import models
from asgiref.sync import sync_to_async
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import httpx
import json
import uuid
import os

from .models import Receipt, Transaction
from .serializers import ReceiptSerializer, TransactionSerializer, ReceiptUploadSerializer


class AsyncReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and uploading receipts.
    Implements asynchronous processing for OCR via Veryfi API.
    """
    serializer_class = ReceiptSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """
        Filter queryset to return only the current user's receipts
        unless the user is a staff member.
        """
        if self.request.user.is_staff:
            return Receipt.objects.all().select_related('transaction')
        return Receipt.objects.filter(owner=self.request.user).select_related('transaction')
    
    @swagger_auto_schema(
        operation_summary="Upload a receipt for OCR processing",
        operation_description="Upload a receipt image for automatic data extraction",
        request_body=ReceiptUploadSerializer,
        responses={
            201: ReceiptSerializer,
            400: "Invalid input data"
        }
    )
    async def create(self, request, *args, **kwargs):
        """
        Asynchronously upload a new receipt and start OCR processing.
        """
        # Use sync_to_async for the serializer operations
        @sync_to_async
        def validate_and_save():
            serializer = ReceiptUploadSerializer(
                data=request.data, 
                context={'request': request}
            )
            serializer.is_valid(raise_exception=True)
            receipt = serializer.save(
                owner=request.user,
                ocr_status=Receipt.PENDING
            )
            return receipt, ReceiptSerializer(receipt).data
        
        # Create the receipt record
        receipt, receipt_data = await validate_and_save()
        
        # Start async OCR processing
        # This will run in the background without blocking the response
        self.process_receipt_async(receipt.id)
        
        return Response(receipt_data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    @swagger_auto_schema(
        operation_summary="Verify a receipt manually",
        operation_description="Mark a receipt as manually verified",
        responses={
            200: "Receipt verified successfully",
            400: "Invalid operation",
            404: "Receipt not found"
        }
    )
    async def verify(self, request, pk=None):
        """
        Asynchronously mark a receipt as manually verified.
        """
        @sync_to_async
        def get_and_update_receipt():
            try:
                receipt = self.get_queryset().get(pk=pk)
                receipt.is_manually_verified = True
                receipt.verified_by = request.user
                receipt.verified_at = timezone.now()
                receipt.save()
                return True, ReceiptSerializer(receipt).data
            except Receipt.DoesNotExist:
                return False, {"error": "Receipt not found"}
        
        success, data = await get_and_update_receipt()
        if success:
            return Response(data)
        return Response(data, status=status.HTTP_404_NOT_FOUND)
    
    @action(detail=True, methods=['post'])
    @swagger_auto_schema(
        operation_summary="Reprocess a receipt with OCR",
        operation_description="Send a receipt back for OCR processing",
        responses={
            200: "Receipt sent for reprocessing",
            400: "Invalid operation",
            404: "Receipt not found"
        }
    )
    async def reprocess(self, request, pk=None):
        """
        Asynchronously reprocess a receipt with OCR.
        """
        @sync_to_async
        def get_and_update_for_reprocessing():
            try:
                receipt = self.get_queryset().get(pk=pk)
                receipt.ocr_status = Receipt.PENDING
                receipt.save()
                return True, receipt.id, ReceiptSerializer(receipt).data
            except Receipt.DoesNotExist:
                return False, None, {"error": "Receipt not found"}
        
        success, receipt_id, data = await get_and_update_for_reprocessing()
        if success:
            # Start async OCR processing
            self.process_receipt_async(receipt_id)
            return Response(data)
        return Response(data, status=status.HTTP_404_NOT_FOUND)
    
    async def process_receipt_async(self, receipt_id):
        """
        Process receipt asynchronously using Veryfi API.
        This function does not block the response and runs in the background.
        """
        @sync_to_async
        def get_receipt_for_processing():
            try:
                return Receipt.objects.get(id=receipt_id), True
            except Receipt.DoesNotExist:
                return None, False
                
        @sync_to_async
        def update_receipt_status(receipt, status, **kwargs):
            receipt.ocr_status = status
            for key, value in kwargs.items():
                setattr(receipt, key, value)
            receipt.save()
            
        @sync_to_async
        def create_transaction_from_veryfi_data(receipt, veryfi_data):
            # Extract transaction data from Veryfi response
            try:
                # Create or update transaction
                transaction_data = {
                    'receipt': receipt,
                    'owner': receipt.owner,
                    'vendor_name': veryfi_data.get('vendor', {}).get('name', ''),
                    'transaction_date': veryfi_data.get('date', timezone.now().date()),
                    'total_amount': veryfi_data.get('total', 0),
                    'currency': veryfi_data.get('currency_code', 'GBP'),
                    'vat_amount': veryfi_data.get('tax', 0),
                    'is_vat_registered': bool(veryfi_data.get('vendor', {}).get('vat_number')),
                    'category': map_veryfi_category_to_internal(veryfi_data.get('category')),
                    'line_items': veryfi_data.get('line_items', []),
                }
                
                # Create or update transaction
                Transaction.objects.update_or_create(
                    receipt=receipt,
                    defaults=transaction_data
                )
                return True
            except Exception as e:
                print(f"Error creating transaction: {str(e)}")
                return False
        
        # Get the receipt
        receipt, exists = await get_receipt_for_processing()
        if not exists:
            return
            
        # Update status to processing
        await update_receipt_status(receipt, Receipt.PROCESSING)
        
        try:
            # Get the file path
            file_path = receipt.file.path
            
            # Process with Veryfi API asynchronously
            async with httpx.AsyncClient(timeout=60.0) as client:
                # First, prepare for file upload
                headers = {
                    "CLIENT-ID": settings.VERYFI_CLIENT_ID,
                    "AUTHORIZATION": f"apikey {settings.VERYFI_USERNAME}:{settings.VERYFI_API_KEY}",
                    "Content-Type": "application/json"
                }
                
                # Read file as binary and prepare for sending
                with open(file_path, 'rb') as f:
                    file_data = f.read()
                
                # Get filename from path
                filename = os.path.basename(file_path)
                
                # Create request data
                request_data = {
                    "file_name": filename,
                    "file_data": httpx._utils.encode_bytes(file_data),  # Base64 encode
                    "categories": ["Expense", "Meals", "Travel"],
                    "auto_delete": False,
                    "boost_mode": 1,  # Enable boost mode for faster processing
                }
                
                # Send to Veryfi API
                response = await client.post(
                    f"{settings.VERYFI_ENVIRONMENT_URL}/api/v8/partner/documents/",
                    headers=headers,
                    json=request_data
                )
                
                if response.status_code == 200:
                    veryfi_data = response.json()
                    
                    # Update receipt with OCR results
                    await update_receipt_status(
                        receipt, 
                        Receipt.COMPLETED,
                        veryfi_response_data=veryfi_data,
                        veryfi_document_id=veryfi_data.get('id'),
                        ocr_confidence=veryfi_data.get('ocr_confidence', 0) * 100,  # Convert 0-1 to 0-100
                        is_auto_approved=veryfi_data.get('ocr_confidence', 0) >= 0.85  # Auto-approve if confidence > 85%
                    )
                    
                    # Create transaction from the data
                    await create_transaction_from_veryfi_data(receipt, veryfi_data)
                else:
                    # Handle error
                    await update_receipt_status(receipt, Receipt.FAILED)
        except Exception as e:
            # Update status to failed on exception
            await update_receipt_status(receipt, Receipt.FAILED)
            print(f"Error processing receipt: {str(e)}")


class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing transactions.
    Supports filtering for unverified transactions and manual verification.
    """
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter queryset to return only the current user's transactions
        unless the user is a staff member.
        Supports filtering by verification status.
        """
        if self.request.user.is_staff:
            queryset = Transaction.objects.all()
        else:
            queryset = Transaction.objects.filter(owner=self.request.user)
        
        # Add filtering based on query parameters
        status_filter = self.request.query_params.get('status', None)
        if status_filter == 'unverified':
            queryset = queryset.filter(is_verified=False)
        elif status_filter == 'verified':
            queryset = queryset.filter(is_verified=True)
        elif status_filter == 'needs_review':
            # Filter for transactions that need review (low confidence or missing data)
            queryset = queryset.filter(
                models.Q(is_verified=False) & 
                (models.Q(receipt__ocr_confidence__lt=85) | 
                 models.Q(vendor_name__isnull=True) | 
                 models.Q(vendor_name='') |
                 models.Q(total_amount__isnull=True) |
                 models.Q(total_amount__lte=0))
            )
        
        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        if date_from:
            queryset = queryset.filter(transaction_date__gte=date_from)
        if date_to:
            queryset = queryset.filter(transaction_date__lte=date_to)
            
        # Filter by vendor
        vendor = self.request.query_params.get('vendor', None)
        if vendor:
            queryset = queryset.filter(vendor_name__icontains=vendor)
            
        return queryset.select_related('receipt', 'verified_by')
    
    @action(detail=True, methods=['post'])
    @swagger_auto_schema(
        operation_summary="Verify a transaction manually",
        operation_description="Mark a transaction as manually verified by the current user",
        responses={
            200: TransactionSerializer,
            400: "Invalid operation",
            404: "Transaction not found"
        }
    )
    def verify(self, request, pk=None):
        """
        Mark a transaction as manually verified.
        """
        transaction = self.get_object()
        transaction.is_verified = True
        transaction.verified_by = request.user
        transaction.verified_at = timezone.now()
        transaction.save()
        
        serializer = self.get_serializer(transaction)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post']) 
    @swagger_auto_schema(
        operation_summary="Unverify a transaction",
        operation_description="Remove verification status from a transaction",
        responses={
            200: TransactionSerializer,
            400: "Invalid operation", 
            404: "Transaction not found"
        }
    )
    def unverify(self, request, pk=None):
        """
        Remove verification status from a transaction.
        """
        transaction = self.get_object()
        transaction.is_verified = False
        transaction.verified_by = None
        transaction.verified_at = None
        transaction.save()
        
        serializer = self.get_serializer(transaction)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    @swagger_auto_schema(
        operation_summary="Get transaction statistics",
        operation_description="Get counts of verified, unverified, and needs review transactions",
        responses={
            200: openapi.Response(
                description="Transaction statistics",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'total': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'verified': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'unverified': openapi.Schema(type=openapi.TYPE_INTEGER),
                        'needs_review': openapi.Schema(type=openapi.TYPE_INTEGER),
                    }
                )
            )
        }
    )
    def stats(self, request):
        """
        Get transaction statistics for the current user.
        """
        queryset = self.get_queryset()
        
        total = queryset.count()
        verified = queryset.filter(is_verified=True).count()
        unverified = queryset.filter(is_verified=False).count()
        needs_review = queryset.filter(
            models.Q(is_verified=False) & 
            (models.Q(receipt__ocr_confidence__lt=85) | 
             models.Q(vendor_name__isnull=True) | 
             models.Q(vendor_name='') |
             models.Q(total_amount__isnull=True) |
             models.Q(total_amount__lte=0))
        ).count()
        
        return Response({
            'total': total,
            'verified': verified,
            'unverified': unverified,
            'needs_review': needs_review
        })


def map_veryfi_category_to_internal(veryfi_category):
    """
    Map Veryfi categories to our internal categories.
    """
    mapping = {
        'Meals & Entertainment': Transaction.MEALS,
        'Travel': Transaction.TRAVEL,
        'Supplies & Materials': Transaction.OFFICE_SUPPLIES,
        'Utilities': Transaction.UTILITIES,
        'Software': Transaction.SOFTWARE,
        'Equipment': Transaction.HARDWARE,
        'Professional Services': Transaction.PROFESSIONAL_SERVICES,
        'Advertising': Transaction.MARKETING,
        'Rent or Lease': Transaction.RENT,
    }
    
    if not veryfi_category:
        return Transaction.OTHER
        
    return mapping.get(veryfi_category, Transaction.OTHER)
