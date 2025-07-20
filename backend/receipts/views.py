from django.shortcuts import render
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

from .models import Receipt, Transaction, BulkUploadJob
from .serializers import (ReceiptSerializer, TransactionSerializer, ReceiptUploadSerializer, 
                         BulkUploadJobSerializer, BulkUploadSerializer)
from .tasks import process_receipt_task


class BulkUploadJobViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing bulk upload jobs and their progress.
    """
    serializer_class = BulkUploadJobSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter queryset to return only the current user's bulk upload jobs
        unless the user is a staff member.
        """
        if self.request.user.is_staff:
            return BulkUploadJob.objects.all()
        return BulkUploadJob.objects.filter(owner=self.request.user)


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
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    @swagger_auto_schema(
        operation_summary="Bulk upload multiple receipts",
        operation_description="Upload multiple receipt files at once (requires subscription with bulk upload enabled)",
        request_body=BulkUploadSerializer,
        responses={
            201: BulkUploadJobSerializer,
            400: "Invalid input data",
            403: "Bulk upload not available for your subscription plan"
        }
    )
    def bulk_upload(self, request, *args, **kwargs):
        """
        Upload multiple receipts at once and create a BulkUploadJob to track progress.
        """
        # Check if user has bulk upload permission
        user = request.user
        try:
            subscription = user.subscription_details
            if not subscription.has_bulk_upload:
                return Response(
                    {"error": "Bulk upload is not available for your subscription plan. Please upgrade to Platinum."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except:
            return Response(
                {"error": "No active subscription found. Bulk upload requires a Platinum subscription."},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate the upload data
        serializer = BulkUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        files = serializer.validated_data['files']
        
        # Create BulkUploadJob
        bulk_job = BulkUploadJob.objects.create(
            owner=user,
            total_files=len(files),
            status=BulkUploadJob.PENDING
        )
        
        # Create Receipt objects and queue processing tasks
        receipt_ids = []
        for file in files:
            receipt = Receipt.objects.create(
                owner=user,
                file=file,
                original_filename=file.name,
                bulk_upload_job=bulk_job,
                ocr_status=Receipt.PENDING
            )
            receipt_ids.append(receipt.id)
        
        # Update job status and start time
        bulk_job.status = BulkUploadJob.PROCESSING
        bulk_job.started_at = timezone.now()
        bulk_job.save()
        
        # Queue Celery tasks for each receipt
        for receipt_id in receipt_ids:
            process_receipt_task.delay(receipt_id, bulk_job.id)
        
        # Return the job details
        return Response(
            BulkUploadJobSerializer(bulk_job).data,
            status=status.HTTP_201_CREATED
        )
    
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
        Upload a new receipt and start OCR processing using Celery.
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
        
        # Queue Celery task for processing
        process_receipt_task.delay(receipt.id)
        
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
        Reprocess a receipt with OCR using Celery.
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
            # Queue Celery task for processing
            process_receipt_task.delay(receipt_id)
            return Response(data)
        return Response(data, status=status.HTTP_404_NOT_FOUND)
    
    async def process_receipt_async(self, receipt_id):
        """
        DEPRECATED: This method is replaced by Celery tasks.
        Keeping for backward compatibility but redirects to Celery.
        """
        process_receipt_task.delay(receipt_id)


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
