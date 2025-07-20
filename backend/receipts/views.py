from django.shortcuts import render
from django.db import models
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.utils import timezone
from asgiref.sync import sync_to_async
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import httpx
import json
import uuid
import os

from .models import Receipt, Transaction, Category, Report
from .serializers import (
    ReceiptSerializer, TransactionSerializer, ReceiptUploadSerializer,
    CategorySerializer, ReportSerializer, ReportRequestSerializer
)


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
    """
    serializer_class = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter queryset to return only the current user's transactions
        unless the user is a staff member.
        """
        if self.request.user.is_staff:
            return Transaction.objects.all()
        return Transaction.objects.filter(owner=self.request.user)


def map_veryfi_category_to_internal(veryfi_category, user):
    """
    Map Veryfi categories to our internal categories.
    Updated to use the Category model instead of hardcoded choices.
    """
    # Mapping from Veryfi categories to our category names
    mapping = {
        'Meals & Entertainment': 'Meals & Entertainment',
        'Travel': 'Travel',
        'Supplies & Materials': 'Office Supplies',
        'Utilities': 'Utilities',
        'Software': 'Software & Subscriptions',
        'Equipment': 'Hardware & Equipment',
        'Professional Services': 'Professional Services',
        'Advertising': 'Marketing & Advertising',
        'Rent or Lease': 'Rent',
    }
    
    category_name = mapping.get(veryfi_category, 'Other')
    
    # Try to find the category (user's custom or default)
    try:
        category = Category.objects.filter(
            name=category_name,
            type=Category.EXPENSE
        ).filter(
            models.Q(owner=user) | models.Q(owner__isnull=True)
        ).first()
        
        if category:
            return category
    except Category.DoesNotExist:
        pass
    
    # Fallback to 'Other' category if not found
    try:
        return Category.objects.filter(
            name='Other',
            type=Category.EXPENSE
        ).filter(
            models.Q(owner=user) | models.Q(owner__isnull=True)
        ).first()
    except Category.DoesNotExist:
        # This should not happen if default categories are properly created
        return None


class CategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing income and expense categories.
    Supports CRUD operations for user-defined categories.
    """
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Return categories that belong to the current user or are system defaults.
        """
        user = self.request.user
        return Category.objects.filter(
            models.Q(owner=user) | models.Q(owner__isnull=True)
        ).order_by('type', 'name')
    
    def perform_create(self, serializer):
        """Set the owner to the current user when creating categories"""
        serializer.save(owner=self.request.user)
    
    def destroy(self, request, *args, **kwargs):
        """Prevent deletion of default categories and categories with transactions"""
        category = self.get_object()
        
        # Prevent deletion of default categories
        if category.is_default:
            return Response(
                {"error": "Cannot delete default categories"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Prevent deletion if there are transactions using this category
        if category.transactions.exists():
            return Response(
                {"error": f"Cannot delete category '{category.name}' because it is used by {category.transactions.count()} transaction(s)"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get categories grouped by type (income/expense)"""
        queryset = self.get_queryset()
        income_categories = queryset.filter(type=Category.INCOME)
        expense_categories = queryset.filter(type=Category.EXPENSE)
        
        return Response({
            'income': CategorySerializer(income_categories, many=True, context={'request': request}).data,
            'expense': CategorySerializer(expense_categories, many=True, context={'request': request}).data
        })


class ReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for generating and managing financial reports.
    """
    serializer_class = ReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Return reports that belong to the current user"""
        return Report.objects.filter(owner=self.request.user)
    
    def perform_create(self, serializer):
        """Set the owner to the current user when creating reports"""
        serializer.save(owner=self.request.user)
    
    @swagger_auto_schema(
        method='post',
        request_body=ReportRequestSerializer,
        responses={201: ReportSerializer}
    )
    @action(detail=False, methods=['post'])
    def generate(self, request):
        """
        Generate a new financial report based on the provided parameters.
        """
        serializer = ReportRequestSerializer(data=request.data)
        if serializer.is_valid():
            # Create a new report record
            report_data = {
                'report_name': serializer.validated_data['report_name'],
                'report_type': serializer.validated_data['report_type'],
                'period_start': serializer.validated_data['period_start'],
                'period_end': serializer.validated_data['period_end'],
                'format': serializer.validated_data['format'],
                'parameters': {
                    'categories': serializer.validated_data.get('categories', []),
                    'include_income': serializer.validated_data.get('include_income', True),
                    'include_expenses': serializer.validated_data.get('include_expenses', True),
                    'min_amount': str(serializer.validated_data['min_amount']) if serializer.validated_data.get('min_amount') else None,
                    'max_amount': str(serializer.validated_data['max_amount']) if serializer.validated_data.get('max_amount') else None,
                }
            }
            
            report_serializer = ReportSerializer(data=report_data, context={'request': request})
            if report_serializer.is_valid():
                report = report_serializer.save()
                
                # TODO: Implement background task for report generation
                # For now, we'll mark it as pending and return the report object
                # In a production system, this would trigger a Celery task
                
                return Response(
                    ReportSerializer(report, context={'request': request}).data,
                    status=status.HTTP_201_CREATED
                )
            else:
                return Response(report_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download a generated report file.
        """
        report = self.get_object()
        
        if not report.is_generated:
            return Response(
                {"error": "Report is not yet generated or generation failed"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # TODO: Implement actual file download
        # For now, return the file path information
        return Response({
            "message": "Report download would be implemented here",
            "file_path": report.file_path,
            "format": report.format,
            "size": report.file_size
        })
    
    @action(detail=False, methods=['get'])
    def templates(self, request):
        """
        Get available report templates and their descriptions.
        """
        templates = {
            'monthly': {
                'name': 'Monthly Report',
                'description': 'Income and expenses for a specific month',
                'period': 'month'
            },
            'quarterly': {
                'name': 'Quarterly Report', 
                'description': 'Financial summary for a quarter (3 months)',
                'period': 'quarter'
            },
            'annual': {
                'name': 'Annual Report',
                'description': 'Complete financial overview for a tax year',
                'period': 'year'
            },
            'vat_return': {
                'name': 'VAT Return',
                'description': 'VAT calculations for HMRC submission',
                'period': 'quarter'
            },
            'profit_loss': {
                'name': 'Profit & Loss Statement',
                'description': 'Income minus expenses analysis',
                'period': 'custom'
            },
            'expense_summary': {
                'name': 'Expense Summary',
                'description': 'Detailed breakdown of expenses by category',
                'period': 'custom'
            },
            'income_summary': {
                'name': 'Income Summary',
                'description': 'Analysis of income sources and trends',
                'period': 'custom'
            }
        }
        
        return Response(templates)
