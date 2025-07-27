import asyncio
import json
import logging
import tempfile
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Q, Sum, Avg, Count
from django.http import JsonResponse
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.cache import never_cache
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from .models import Receipt, Transaction
from .serializers import ReceiptSerializer, TransactionSerializer
from .services.openai_service import OpenAIVisionService
from .services.cloudinary_service import cloudinary_service
from .utils import DecimalEncoder

logger = logging.getLogger(__name__)

# Initialize OpenAI service lazily to avoid import-time errors
openai_service = None

def get_openai_service():
    """Get OpenAI service instance, creating it if needed."""
    global openai_service
    if openai_service is None:
        openai_service = OpenAIVisionService()
    return openai_service

# Advanced process_receipt function using the optimized OpenAI service
async def process_receipt(image_path_or_url, use_url=False):
    """
    Process receipt using the advanced OpenAI Vision service.
    Returns extracted data in the new flat schema format.
    """
    try:
        service = get_openai_service()
        if use_url:
            # Process using URL (Cloudinary)
            result = await service.process_receipt_from_url(image_path_or_url)
        else:
            # Process using local file path
            result = await service.process_receipt_from_file(image_path_or_url)
        
        # Convert to new schema format
        if result and result.get('success'):
            data = result.get('data', {})
            return {
                'success': True,
                'extracted_data': {
                    'vendor': data.get('merchant_name', 'Unknown'),
                    'date': data.get('transaction_date'),
                    'total': float(data.get('total_amount', 0)),
                    'tax': float(data.get('tax_amount', 0)) if data.get('tax_amount') else None,
                    'type': 'expense',
                    'currency': data.get('currency', 'GBP')
                },
                'processing_metadata': {
                    'processing_time': result.get('processing_time', 0),
                    'cost_usd': result.get('cost_usd', 0),
                    'token_usage': result.get('token_usage', 0),
                    'confidence': result.get('confidence', 0)
                }
            }
        else:
            return {
                'success': False,
                'extracted_data': {},
                'processing_metadata': {'error': result.get('message', 'Processing failed')}
            }
    except Exception as e:
        logger.error(f"OpenAI processing error: {e}")
        return {
            'success': False,
            'extracted_data': {},
            'processing_metadata': {'error': str(e)}
        }


class ReceiptViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing receipts with OpenAI-powered extraction.
    
    Supports the new flat schema:
    {
        "extracted_data": {
            "vendor": "Store Name",
            "date": "2024-01-15",
            "total": 45.67,
            "tax": 3.45,
            "type": "expense",
            "currency": "USD"
        },
        "processing_metadata": {
            "processing_time": 2.5,
            "cost_usd": 0.02,
            "token_usage": 150,
            "segments_processed": 1
        }
    }
    """
    serializer_class = ReceiptSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Return receipts for the authenticated user, ordered by newest first"""
        queryset = Receipt.objects.filter(owner=self.request.user).order_by('-uploaded_at')
        logger.info(f"ReceiptViewSet.get_queryset: Found {queryset.count()} receipts for user {self.request.user.id}")
        return queryset

    def list(self, request, *args, **kwargs):
        """Override list to add debug logging"""
        logger.info(f"ReceiptViewSet.list called by user {request.user.id}")
        queryset = self.get_queryset()
        logger.info(f"ReceiptViewSet.list: Queryset has {queryset.count()} receipts")
        
        # Add detailed logging for each receipt
        for receipt in queryset[:5]:  # Log first 5 receipts
            logger.info(f"Receipt {receipt.id}: filename={receipt.original_filename}, status={receipt.ocr_status}, extracted_data={bool(receipt.extracted_data)}")
        
        serializer = self.get_serializer(queryset, many=True)
        logger.info(f"ReceiptViewSet.list: Serialized {len(serializer.data)} receipts")
        return Response(serializer.data)

    @method_decorator(csrf_exempt)
    def dispatch(self, request, *args, **kwargs):
        return super().dispatch(request, *args, **kwargs)

    def create(self, request, *args, **kwargs):
        """
        Upload and process receipt with OpenAI Vision API.
        
        Expected input:
        - image: Receipt image file
        - description: Optional description
        
        Returns new schema with extracted_data and processing_metadata.
        """
        try:
            logger.info("Receipt upload started")
            
            if 'image' not in request.FILES:
                logger.error("No image file provided in request")
                return Response(
                    {'error': 'No image file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            image_file = request.FILES['image']
            description = getattr(request, 'data', {}).get('description', '') or request.POST.get('description', '')
            logger.info(f"Processing upload for file: {image_file.name}, size: {image_file.size}")

            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if image_file.content_type not in allowed_types:
                logger.error(f"Invalid file type: {image_file.content_type}")
                return Response(
                    {'error': f'Invalid file type. Allowed: {", ".join(allowed_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate file size (10MB limit)
            if image_file.size > 10 * 1024 * 1024:
                logger.error(f"File too large: {image_file.size}")
                return Response(
                    {'error': 'File too large. Maximum size: 10MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create receipt record with initial data
            try:
                logger.info("Creating receipt record in database")
                receipt = Receipt.objects.create(
                    owner=request.user,
                    file=image_file,  # Keep local storage as backup
                    original_filename=image_file.name,
                    ocr_status='processing'
                )
                logger.info(f"Receipt record created with ID: {receipt.id}")
            except Exception as db_error:
                logger.error(f"Database creation failed: {db_error}")
                return Response(
                    {'error': f'Database error: {str(db_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Upload to Cloudinary with optimization
            cloudinary_success = False
            try:
                if cloudinary_service.is_configured:
                    cloudinary_result = cloudinary_service.upload_receipt_image(
                        file=image_file,
                        receipt_id=receipt.id,
                        user_id=request.user.id,
                        filename=image_file.name
                    )
                    
                    # Update receipt with Cloudinary data
                    receipt.cloudinary_public_id = cloudinary_result['public_id']
                    receipt.cloudinary_url = cloudinary_result['original_url']
                    receipt.cloudinary_display_url = cloudinary_result['urls'].get('display', cloudinary_result['original_url'])
                    receipt.cloudinary_thumbnail_url = cloudinary_result['urls'].get('thumbnail', cloudinary_result['original_url'])
                    receipt.image_width = cloudinary_result.get('width')
                    receipt.image_height = cloudinary_result.get('height')
                    receipt.file_size_bytes = cloudinary_result.get('size_bytes')
                    cloudinary_success = True
                    
                    logger.info(f"Successfully uploaded receipt {receipt.id} to Cloudinary: {cloudinary_result['public_id']}")
                else:
                    logger.info(f"Cloudinary not configured, using local storage for receipt {receipt.id}")
                    
            except Exception as cloudinary_error:
                logger.warning(f"Cloudinary upload failed for receipt {receipt.id}: {cloudinary_error}")
                # Local storage is already set as backup
                logger.info(f"Falling back to local storage for receipt {receipt.id}")
            
            receipt.save()

            # Process with Celery background task (ASYNC) or fallback to sync
            from .services.openai_service import queue_ocr_task
            
            # Set initial status to processing
            receipt.ocr_status = 'processing'
            receipt.save()
            
            logger.info(f"About to queue OCR task for receipt {receipt.id}")
            
            # Try to queue the task safely
            queue_result = queue_ocr_task(receipt.id)
            
            logger.info(f"Queue result for receipt {receipt.id}: {queue_result}")
            
            if queue_result["queued"]:
                # Successfully queued (either async or eager)
                receipt.processing_metadata = {
                    'status': 'queued',
                    'queued_at': datetime.now().isoformat(),
                    'processing_method': 'eager' if queue_result.get('eager') else 'async',
                    'task_id': queue_result.get('task_id')
                }
                receipt.save()
                
                logger.info(f"✅ Queued OCR processing for receipt {receipt.id} (method: {receipt.processing_metadata['processing_method']})")
                
            elif queue_result.get("deferred"):
                # Queue unavailable, return 202 for client retry
                receipt.ocr_status = 'queued'
                receipt.processing_metadata = {
                    'status': 'deferred',
                    'queued_at': datetime.now().isoformat(),
                    'message': 'Queue busy, will retry automatically'
                }
                receipt.save()
                
                logger.info(f"Queue deferred for receipt {receipt.id}, returning 202")
                serializer = self.get_serializer(receipt)
                return Response({
                    **serializer.data,
                    "queued": False, 
                    "detail": "Queue busy, processing will retry automatically."
                }, status=status.HTTP_202_ACCEPTED)
                
            else:
                # Queue error, fallback to synchronous processing
                logger.error(f"❌ Queue failed for receipt {receipt.id}: {queue_result.get('error', 'Unknown error')}")
                logger.warning(f"Attempting synchronous fallback for receipt {receipt.id}")
                
                # Fallback to synchronous processing when Celery is unavailable
                try:
                    # Process receipt synchronously using asyncio
                    service = get_openai_service()
                    
                    # Check if we're in test mode (OpenAI service disabled)
                    if service.async_client is None:
                        # In test mode, create mock result
                        result = {
                            'vendor_name': 'Test Vendor',
                            'total_amount': 10.00,
                            'transaction_type': 'expense',
                            'date': datetime.now().date().isoformat(),
                            'currency': 'GBP',
                            'processing_metadata': {
                                'processing_method': 'test_mode',
                                'processing_time': 0.1,
                                'cost_usd': 0.00
                            }
                        }
                        logger.info(f"Test mode: created mock result for receipt {receipt.id}")
                    else:
                        # Define async processing function
                        async def process_sync():
                            # Use the local file for processing (Cloudinary is just for display)
                            return await service.process_receipt(receipt.file, receipt.original_filename)
                        
                        # Run the async processing
                        result = asyncio.run(process_sync())
                    
                    # Update receipt with extracted data
                    if result:
                        receipt.extracted_data = result
                        receipt.ocr_status = 'completed'
                        receipt.processing_metadata = result.get('processing_metadata', {})
                        receipt.processing_metadata['processing_method'] = 'synchronous_fallback'
                        
                        # Create transaction if we have valid data
                        if result.get('vendor_name') and result.get('total_amount'):
                            try:
                                Transaction.objects.create(
                                    receipt=receipt,
                                    owner=request.user,
                                    total_amount=Decimal(str(result.get('total_amount', 0))),
                                    transaction_type=result.get('transaction_type', 'expense'),
                                    vendor_name=result.get('vendor_name', 'Unknown'),
                                    transaction_date=self._parse_date(result.get('date'))
                                )
                                logger.info(f"Created transaction for receipt {receipt.id}")
                            except Exception as tx_error:
                                logger.warning(f"Could not create transaction for receipt {receipt.id}: {tx_error}")
                    else:
                        receipt.ocr_status = 'failed'
                        receipt.processing_metadata = {
                            'error': 'Synchronous processing failed',
                            'processing_method': 'synchronous_fallback'
                        }
                    
                    receipt.save()
                    
                except Exception as sync_error:
                    logger.error(f"Synchronous processing also failed for receipt {receipt.id}: {sync_error}")
                    receipt.ocr_status = 'failed'
                    receipt.processing_metadata = {
                        'error': f'Both async and sync processing failed: {str(sync_error)}',
                        'processing_method': 'failed_fallback'
                    }
                    receipt.save()
            
            # Always return success if receipt was uploaded and stored
            serializer = self.get_serializer(receipt)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as e:
            logger.error(f"Receipt upload failed: {e}")
            return Response(
                {'error': 'Upload failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'])
    def processing_status(self, request, pk=None):
        """
        Get the current processing status of a receipt
        Used by frontend to poll for completion
        """
        receipt = self.get_object()
        
        # Check Celery task status if we have a task ID
        task_info = receipt.processing_metadata or {}
        task_id = task_info.get('task_id')
        
        response_data = {
            'receipt_id': receipt.id,
            'ocr_status': receipt.ocr_status,
            'processing_metadata': receipt.processing_metadata
        }
        
        if task_id:
            from celery.result import AsyncResult
            try:
                task_result = AsyncResult(task_id)
                response_data['task_status'] = task_result.status
                response_data['task_info'] = task_result.info if task_result.info else {}
            except Exception as e:
                logger.warning(f"Could not get task status for {task_id}: {e}")
        
        return Response(response_data)

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """
        Reprocess a receipt with OCR using Celery background task
        """
        receipt = self.get_object()
        
        if not receipt.file and not receipt.cloudinary_url:
            return Response(
                {'error': 'No image available for reprocessing'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .services.openai_service import queue_ocr_task
        
        # Reset status
        receipt.ocr_status = 'processing'
        receipt.extracted_data = {}
        
        # Try to queue the reprocessing task safely
        queue_result = queue_ocr_task(receipt.id)
        
        if queue_result["queued"]:
            # Successfully queued (either async or eager)
            receipt.processing_metadata = {
                'status': 'queued',
                'queued_at': datetime.now().isoformat(),
                'reprocessed': True,
                'processing_method': 'eager' if queue_result.get('eager') else 'async'
            }
            receipt.save()
            
            logger.info(f"Queued reprocessing for receipt {receipt.id} (method: {receipt.processing_metadata['processing_method']})")
            serializer = self.get_serializer(receipt)
            return Response(serializer.data)
            
        elif queue_result.get("deferred"):
            # Queue unavailable, return 202 for client retry
            receipt.ocr_status = 'queued'
            receipt.processing_metadata = {
                'status': 'deferred',
                'queued_at': datetime.now().isoformat(),
                'reprocessed': True,
                'message': 'Queue busy, will retry automatically'
            }
            receipt.save()
            
            logger.info(f"Reprocessing queue deferred for receipt {receipt.id}, returning 202")
            serializer = self.get_serializer(receipt)
            return Response({
                **serializer.data,
                "queued": False, 
                "detail": "Queue busy, reprocessing will retry automatically."
            }, status=status.HTTP_202_ACCEPTED)
            
        else:
            # Queue error, fallback to synchronous processing
            logger.warning(f"Reprocessing queue failed for receipt {receipt.id}, attempting synchronous fallback")
            
            # Fallback to synchronous processing when Celery is unavailable
            try:
                # Process receipt synchronously using asyncio
                service = get_openai_service()
                
                # Check if we're in test mode (OpenAI service disabled)
                if service.async_client is None:
                    # In test mode, create mock result
                    result = {
                        'vendor_name': 'Test Vendor',
                        'total_amount': 10.00,
                        'transaction_type': 'expense',
                        'date': datetime.now().date().isoformat(),
                        'currency': 'GBP',
                        'processing_metadata': {
                            'processing_method': 'test_mode',
                            'processing_time': 0.1,
                            'cost_usd': 0.00,
                            'reprocessed': True
                        }
                    }
                    logger.info(f"Test mode: created mock result for reprocessing receipt {receipt.id}")
                else:
                    # Define async processing function
                    async def process_sync():
                        # Use the local file for processing (Cloudinary is just for display)
                        return await service.process_receipt(receipt.file, receipt.original_filename)
                    
                    # Run the async processing
                    result = asyncio.run(process_sync())
                
                # Update receipt with extracted data
                if result:
                    receipt.extracted_data = result
                    receipt.ocr_status = 'completed'
                    receipt.processing_metadata = result.get('processing_metadata', {})
                    receipt.processing_metadata['processing_method'] = 'synchronous_fallback'
                    receipt.processing_metadata['reprocessed'] = True
                    
                    # Create or update transaction if we have valid data
                    if result.get('vendor_name') and result.get('total_amount'):
                        try:
                            # Try to get existing transaction first
                            try:
                                transaction = Transaction.objects.get(receipt=receipt)
                                transaction.total_amount = Decimal(str(result.get('total_amount', 0)))
                                transaction.transaction_type = result.get('transaction_type', 'expense')
                                transaction.vendor_name = result.get('vendor_name', 'Unknown')
                                transaction.transaction_date = self._parse_date(result.get('date'))
                                transaction.save()
                                logger.info(f"Updated transaction for receipt {receipt.id}")
                            except Transaction.DoesNotExist:
                                Transaction.objects.create(
                                    receipt=receipt,
                                    owner=self.request.user,
                                    total_amount=Decimal(str(result.get('total_amount', 0))),
                                    transaction_type=result.get('transaction_type', 'expense'),
                                    vendor_name=result.get('vendor_name', 'Unknown'),
                                    transaction_date=self._parse_date(result.get('date'))
                                )
                                logger.info(f"Created transaction for receipt {receipt.id}")
                        except Exception as tx_error:
                            logger.warning(f"Could not create/update transaction for receipt {receipt.id}: {tx_error}")
                else:
                    receipt.ocr_status = 'failed'
                    receipt.processing_metadata = {
                        'error': 'Synchronous reprocessing failed',
                        'processing_method': 'synchronous_fallback',
                        'reprocessed': True
                    }
                
                receipt.save()
                serializer = self.get_serializer(receipt)
                return Response(serializer.data)
                
            except Exception as sync_error:
                logger.error(f"Synchronous reprocessing also failed for receipt {receipt.id}: {sync_error}")
                receipt.ocr_status = 'failed'
                receipt.processing_metadata = {
                    'error': f'Both async and sync reprocessing failed: {str(sync_error)}',
                    'processing_method': 'failed_fallback',
                    'reprocessed': True
                }
                receipt.save()
                
                return Response(
                    {'error': f'Reprocessing failed: {str(sync_error)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

    @action(detail=True, methods=['patch'])
    def update_extracted_data(self, request, pk=None):
        """
        Update extracted data with manual corrections.
        
        Expected input:
        {
            "vendor": "Corrected Vendor Name",
            "date": "2024-01-15",
            "total": 45.67,
            "tax": 3.45,
            "type": "expense",
            "currency": "USD"
        }
        """
        receipt = self.get_object()
        
        if not receipt.extracted_data:
            receipt.extracted_data = {}
        
        # Update extracted data with provided corrections
        for field in ['vendor', 'date', 'total', 'tax', 'type', 'currency']:
            if field in request.data:
                old_value = receipt.extracted_data.get(field)
                new_value = request.data[field]
                receipt.extracted_data[field] = new_value
        
        receipt.save()

        # Update associated transaction if total changed
        if 'total' in request.data or 'type' in request.data or 'vendor' in request.data or 'date' in request.data or 'category' in request.data:
            try:
                transaction = Transaction.objects.get(receipt=receipt)
                
                if 'total' in request.data:
                    transaction.total_amount = Decimal(str(request.data['total']))
                if 'type' in request.data:
                    transaction.transaction_type = request.data['type']
                if 'vendor' in request.data:
                    transaction.vendor_name = request.data['vendor']
                if 'date' in request.data:
                    transaction.transaction_date = self._parse_date(request.data['date'])
                if 'category' in request.data:
                    transaction.category = request.data['category']
                
                transaction.save()
            except Transaction.DoesNotExist:
                # Create new transaction if it doesn't exist
                extracted_data = receipt.extracted_data
                if extracted_data.get('total'):
                    Transaction.objects.create(
                        receipt=receipt,
                        owner=request.user,
                        total_amount=Decimal(str(extracted_data['total'])),
                        transaction_type=extracted_data.get('type', 'expense'),
                        vendor_name=extracted_data.get('vendor', 'Unknown'),
                        transaction_date=self._parse_date(extracted_data.get('date'))
                    )
            except (InvalidOperation, ValueError) as e:
                logger.warning(f"Could not update transaction for receipt {receipt.id}: {e}")

        serializer = self.get_serializer(receipt)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get summary statistics for user's receipts.
        """
        receipts = self.get_queryset()
        
        # Basic counts
        total_receipts = receipts.count()
        processed_receipts = receipts.filter(ocr_status='completed').count()
        failed_receipts = receipts.filter(ocr_status='failed').count()
        
        # Financial summary from transactions
        transactions = Transaction.objects.filter(owner=request.user)
        total_expenses = transactions.filter(transaction_type='expense').aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')
        
        total_income = transactions.filter(transaction_type='income').aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')
        
        avg_amount = transactions.aggregate(avg=Avg('total_amount'))['avg'] or Decimal('0')
        
        # Category breakdown
        category_stats = transactions.values('vendor_name').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        ).order_by('-total')[:10]
        
        # Type breakdown
        type_stats = transactions.values('transaction_type').annotate(
            count=Count('id'),
            total=Sum('total_amount')
        )

        return Response({
            'receipt_stats': {
                'total_receipts': total_receipts,
                'processed_receipts': processed_receipts,
                'failed_receipts': failed_receipts,
                'success_rate': round(processed_receipts / total_receipts * 100, 1) if total_receipts > 0 else 0
            },
            'financial_summary': {
                'total_expenses': float(total_expenses),
                'total_income': float(total_income),
                'net_amount': float(total_income - total_expenses),
                'average_amount': float(avg_amount)
            },
            'category_breakdown': list(category_stats),
            'type_breakdown': list(type_stats)
        })

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Get dashboard metrics for the user"""
        try:
            # Get user's receipts
            receipts = self.get_queryset()
            total_receipts = receipts.count()
            
            # Get user's transactions
            transactions = Transaction.objects.filter(receipt__owner=request.user)
            
            # Calculate totals
            total_expenses = transactions.filter(
                transaction_type='expense'
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            total_income = transactions.filter(
                transaction_type='income'
            ).aggregate(total=Sum('total_amount'))['total'] or 0
            
            # Recent activity
            recent_receipts = receipts[:5]
            recent_transactions = transactions.order_by('-updated_at')[:5]
            
            # Monthly summary (last 6 months)
            from django.db.models.functions import TruncMonth
            from django.utils import timezone
            from dateutil.relativedelta import relativedelta
            
            six_months_ago = timezone.now() - relativedelta(months=6)
            monthly_data = transactions.filter(
                updated_at__gte=six_months_ago
            ).annotate(
                month=TruncMonth('transaction_date')
            ).values('month').annotate(
                count=Count('id'),
                total_expenses=Sum('total_amount', filter=Q(transaction_type='expense')),
                total_income=Sum('total_amount', filter=Q(transaction_type='income'))
            ).order_by('-month')[:6]
            
            return Response({
                'total_receipts': total_receipts,
                'total_expenses': float(total_expenses),
                'total_income': float(total_income),
                'net_income': float(total_income - total_expenses),
                'recent_receipts': ReceiptSerializer(recent_receipts, many=True).data,
                'recent_transactions': TransactionSerializer(recent_transactions, many=True).data,
                'monthly_summary': list(monthly_data)
            })
            
        except Exception as e:
            logger.error(f"Dashboard error for user {request.user.id}: {str(e)}")
            return Response({
                'total_receipts': 0,
                'total_expenses': 0,
                'total_income': 0,
                'net_income': 0,
                'recent_receipts': [],
                'recent_transactions': [],
                'monthly_summary': []
            })

    @action(detail=False, methods=['get'])
    def test_auth(self, request):
        """Simple test endpoint to verify authentication is working"""
        return Response({
            'authenticated': True,
            'user_id': request.user.id,
            'user_email': request.user.email,
            'message': 'Authentication is working correctly'
        })

    def _parse_date(self, date_str):
        """Parse date string into date object"""
        if not date_str:
            return date.today()
        
        try:
            # Try different date formats
            for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']:
                try:
                    parsed = datetime.strptime(date_str, fmt)
                    return parsed.date()
                except ValueError:
                    continue
            
            # If no format works, return today
            return date.today()
        except:
            return date.today()


class TransactionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing transactions.
    """
    serializer_class = TransactionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter transactions by user"""
        return Transaction.objects.filter(owner=self.request.user).order_by('-transaction_date')

    def perform_create(self, serializer):
        """Ensure user is set when creating transaction"""
        serializer.save(owner=self.request.user)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get transactions grouped by merchant/category"""
        transactions = self.get_queryset()
        
        # Group by merchant
        merchants = transactions.values('vendor_name').annotate(
            count=Count('id'),
            total_amount=Sum('total_amount'),
            avg_amount=Avg('total_amount')
        ).order_by('-total_amount')
        
        return Response(list(merchants))

    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get transactions grouped by type (expense/income)"""
        transactions = self.get_queryset()
        
        # Group by type
        types = transactions.values('transaction_type').annotate(
            count=Count('id'),
            total_amount=Sum('total_amount'),
            avg_amount=Avg('total_amount')
        )
        
        return Response(list(types))

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Get monthly transaction summary"""
        from django.db.models.functions import TruncMonth
        
        transactions = self.get_queryset()
        
        # Group by month
        monthly_data = transactions.annotate(
            month=TruncMonth('transaction_date')
        ).values('month').annotate(
            count=Count('id'),
            total_expenses=Sum('total_amount', filter=Q(transaction_type='expense')),
            total_income=Sum('total_amount', filter=Q(transaction_type='income'))
        ).order_by('-month')
        
        return Response(list(monthly_data))
