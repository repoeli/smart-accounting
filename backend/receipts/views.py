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
# Temporarily commented out while fixing deployment issues
# from .services.openai_service import process_receipt
from .services.cloudinary_service import cloudinary_service
from .utils import DecimalEncoder

logger = logging.getLogger(__name__)

# Temporary stub function to replace process_receipt during deployment fix
async def temp_process_receipt_stub(file_path, use_url=False):
    """Temporary stub to replace process_receipt functionality during deployment"""
    return {
        'success': True,
        'message': 'Receipt processing temporarily disabled during backend fix',
        'data': {
            'merchant_name': 'Backend Fixing in Progress',
            'total_amount': '0.00',
            'transaction_date': '2025-01-01',
            'items': []
        }
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
        """Filter receipts by user - simplified for debugging"""
        try:
            return Receipt.objects.filter(owner=self.request.user).order_by('-uploaded_at')
        except Exception as e:
            logger.error(f"Error in get_queryset: {e}")
            # Return empty queryset if there's an issue
            return Receipt.objects.none()

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
            if 'image' not in request.FILES:
                return Response(
                    {'error': 'No image file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            image_file = request.FILES['image']
            description = getattr(request, 'data', {}).get('description', '') or request.POST.get('description', '')

            # Validate file type
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            if image_file.content_type not in allowed_types:
                return Response(
                    {'error': f'Invalid file type. Allowed: {", ".join(allowed_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate file size (10MB limit)
            if image_file.size > 10 * 1024 * 1024:
                return Response(
                    {'error': 'File too large. Maximum size: 10MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create receipt record with initial data
            receipt = Receipt.objects.create(
                owner=request.user,
                file=image_file,  # Keep local storage as backup
                original_filename=image_file.name,
                ocr_status='processing'
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

            # Process with OpenAI Vision API
            try:
                # Use Cloudinary URL if available, otherwise use local file
                if cloudinary_success and receipt.cloudinary_url:
                    # Process using Cloudinary URL directly
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        result = loop.run_until_complete(temp_process_receipt_stub(receipt.cloudinary_url, use_url=True))
                    finally:
                        loop.close()
                else:
                    # Process using temp file from local storage
                    with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{image_file.name.split(".")[-1]}') as temp_file:
                        image_file.seek(0)
                        for chunk in image_file.chunks():
                            temp_file.write(chunk)
                        temp_file.flush()
                        
                        # Process receipt asynchronously
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        try:
                            result = loop.run_until_complete(temp_process_receipt_stub(temp_file.name))
                        finally:
                            loop.close()

                # Update receipt with extracted data
                receipt.extracted_data = result.get('extracted_data', {})
                receipt.processing_metadata = result.get('processing_metadata', {})
                receipt.ocr_status = 'completed'
                receipt.save()

                # Create transaction if extraction was successful
                extracted_data = receipt.extracted_data or {}
                if extracted_data.get('total'):
                    try:
                        total_amount = Decimal(str(extracted_data['total']))
                        transaction_type = extracted_data.get('type', 'expense')
                        
                        Transaction.objects.create(
                            receipt=receipt,
                            owner=request.user,
                            total_amount=total_amount,
                            transaction_type=transaction_type,
                            vendor_name=extracted_data.get('vendor', 'Unknown'),
                            transaction_date=self._parse_date(extracted_data.get('date'))
                        )
                    except (InvalidOperation, ValueError) as e:
                        logger.warning(f"Could not create transaction for receipt {receipt.id}: {e}")

                serializer = self.get_serializer(receipt)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"OpenAI processing failed for receipt {receipt.id}: {e}")
                receipt.ocr_status = 'failed'
                receipt.processing_metadata = {
                    'error': str(e),
                    'processing_time': 0,
                    'cost_usd': 0,
                    'token_usage': 0,
                    'segments_processed': 0
                }
                receipt.save()
                
                return Response(
                    {'error': f'Processing failed: {str(e)}'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

        except Exception as e:
            logger.error(f"Receipt upload failed: {e}")
            return Response(
                {'error': 'Upload failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'])
    def reprocess(self, request, pk=None):
        """
        Reprocess a receipt with OpenAI Vision API.
        """
        receipt = self.get_object()
        
        if not receipt.file:
            return Response(
                {'error': 'No image available for reprocessing'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            receipt.ocr_status = 'processing'
            receipt.save()

            # Process with OpenAI Vision API
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(temp_process_receipt_stub(receipt.file.path))
            finally:
                loop.close()

            # Update receipt with new extracted data
            receipt.extracted_data = result.get('extracted_data', {})
            receipt.processing_metadata = result.get('processing_metadata', {})
            receipt.ocr_status = 'completed'
            receipt.save()

            # Update or create transaction
            extracted_data = receipt.extracted_data or {}
            if extracted_data.get('total'):
                try:
                    total_amount = Decimal(str(extracted_data['total']))
                    transaction_type = extracted_data.get('type', 'expense')
                    
                    # Update existing transaction or create new one
                    transaction, created = Transaction.objects.update_or_create(
                        receipt=receipt,
                        defaults={
                            'total_amount': total_amount,
                            'transaction_type': transaction_type,
                            'vendor_name': extracted_data.get('vendor', 'Unknown'),
                            'transaction_date': self._parse_date(extracted_data.get('date'))
                        }
                    )
                except (InvalidOperation, ValueError) as e:
                    logger.warning(f"Could not update transaction for receipt {receipt.id}: {e}")

            serializer = self.get_serializer(receipt)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Reprocessing failed for receipt {receipt.id}: {e}")
            receipt.ocr_status = 'failed'
            receipt.processing_metadata = {
                'error': str(e),
                'processing_time': 0,
                'cost_usd': 0,
                'token_usage': 0,
                'segments_processed': 0
            }
            receipt.save()
            
            return Response(
                {'error': f'Reprocessing failed: {str(e)}'},
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
