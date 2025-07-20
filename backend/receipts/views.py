from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.conf import settings
from django.utils import timezone
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
import json

from .models import Receipt, Transaction
from .serializers import ReceiptSerializer, TransactionSerializer, ReceiptUploadSerializer
from .tasks import process_document_ocr


class AsyncReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and uploading receipts/documents.
    Implements background task processing for OCR via Celery and Tesseract.
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
        operation_summary="Upload a document for OCR processing",
        operation_description="Upload a document (receipt/invoice) for automatic data extraction using Tesseract OCR",
        request_body=ReceiptUploadSerializer,
        responses={
            201: ReceiptSerializer,
            400: "Invalid input data"
        }
    )
    def create(self, request, *args, **kwargs):
        """
        Upload a new document and queue it for background OCR processing.
        Returns immediate feedback that the upload was successful and is being processed.
        """
        serializer = ReceiptUploadSerializer(
            data=request.data, 
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        
        # Extract assigned_client if provided (for accounting firms)
        assigned_client_id = request.data.get('assigned_client')
        assigned_client = None
        
        if assigned_client_id and request.user.user_type == 'accounting_firm':
            from accounts.models import Account
            try:
                assigned_client = Account.objects.get(id=assigned_client_id)
            except Account.DoesNotExist:
                return Response(
                    {"error": "Invalid assigned_client ID"}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create the receipt record with pending status
        receipt = serializer.save(
            owner=request.user,
            assigned_client=assigned_client,
            ocr_status=Receipt.PENDING
        )
        
        # Queue the OCR processing task
        process_document_ocr.delay(receipt.id)
        
        # Return immediate response
        response_data = ReceiptSerializer(receipt).data
        response_data['message'] = "Document uploaded successfully and is being processed"
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
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
    def verify(self, request, pk=None):
        """
        Mark a receipt as manually verified.
        """
        try:
            receipt = self.get_queryset().get(pk=pk)
            receipt.is_manually_verified = True
            receipt.verified_by = request.user
            receipt.verified_at = timezone.now()
            receipt.save()
            return Response(ReceiptSerializer(receipt).data)
        except Receipt.DoesNotExist:
            return Response(
                {"error": "Receipt not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )
    
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
    def reprocess(self, request, pk=None):
        """
        Reprocess a receipt with OCR using Celery task.
        """
        try:
            receipt = self.get_queryset().get(pk=pk)
            receipt.ocr_status = Receipt.PENDING
            receipt.save()
            
            # Queue the OCR processing task
            process_document_ocr.delay(receipt.id)
            
            response_data = ReceiptSerializer(receipt).data
            response_data['message'] = "Document queued for reprocessing"
            return Response(response_data)
            
        except Receipt.DoesNotExist:
            return Response(
                {"error": "Receipt not found"}, 
                status=status.HTTP_404_NOT_FOUND
            )

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
