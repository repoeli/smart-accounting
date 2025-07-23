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
from rest_framework.permissions import IsAuthenticated, AllowAny

from .models import Receipt, Transaction
from .serializers import ReceiptSerializer, TransactionSerializer
from .services.openai_service import process_receipt
from .utils import DecimalEncoder
from .pagination import ReceiptPagination

logger = logging.getLogger(__name__)


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
    permission_classes = [AllowAny]  # Temporarily for testing
    pagination_class = ReceiptPagination  # Use custom pagination

    def get_queryset(self):
        """Filter receipts by owner"""
        return Receipt.objects.all().order_by('-uploaded_at')  # Show all for testing

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
            description = request.data.get('description', '')

            # Validate file type - handle both .jpg and .jpeg properly
            allowed_types = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
            logger.info(f"File content type: {image_file.content_type}")
            logger.info(f"File name: {image_file.name}")
            
            # Get file extension
            file_ext = image_file.name.lower().split('.')[-1] if '.' in image_file.name else ''
            allowed_extensions = ['jpg', 'jpeg', 'png', 'webp']
            
            # Accept if either content type OR extension is valid
            content_type_valid = image_file.content_type in allowed_types
            extension_valid = file_ext in allowed_extensions
            
            if not (content_type_valid or extension_valid):
                return Response(
                    {'error': f'Invalid file. Content-Type: {image_file.content_type}, Extension: {file_ext}. Allowed: {allowed_extensions}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Validate file size (10MB limit)
            if image_file.size > 10 * 1024 * 1024:
                return Response(
                    {'error': 'File too large. Maximum size: 10MB'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create receipt record
            # For testing without auth, use a default owner if available
            from accounts.models import Account
            owner = Account.objects.first() if Account.objects.exists() else None
            
            receipt = Receipt.objects.create(
                owner=owner,
                file=image_file,
                original_filename=image_file.name,
                ocr_status='processing'
            )

            # Process with OpenAI Vision API
            try:
                # Save image to temporary file for processing
                with tempfile.NamedTemporaryFile(delete=False, suffix=f'.{image_file.name.split(".")[-1]}') as temp_file:
                    for chunk in image_file.chunks():
                        temp_file.write(chunk)
                    temp_file.flush()

                    # Process receipt asynchronously
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    try:
                        result = loop.run_until_complete(process_receipt(temp_file.name))
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
                        transaction_date = self._parse_date(extracted_data.get('date'))
                        
                        # For testing without auth, use the same owner as receipt
                        Transaction.objects.create(
                            receipt=receipt,
                            owner=receipt.owner,
                            total_amount=total_amount,
                            transaction_type=transaction_type,
                            vendor_name=extracted_data.get('vendor', 'Unknown'),
                            transaction_date=transaction_date,
                            currency=extracted_data.get('currency', 'GBP'),
                            tax_amount=Decimal(str(extracted_data.get('tax', 0))) if extracted_data.get('tax') else None
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
        
        if not receipt.image:
            return Response(
                {'error': 'No image available for reprocessing'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            receipt.status = 'processing'
            receipt.save()

            # Process with OpenAI Vision API
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            try:
                result = loop.run_until_complete(process_receipt(receipt.image.path))
            finally:
                loop.close()

            # Update receipt with new extracted data
            receipt.extracted_data = result.get('extracted_data', {})
            receipt.processing_metadata = result.get('processing_metadata', {})
            receipt.status = 'processed'
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
                            'amount': total_amount,
                            'transaction_type': transaction_type,
                            'merchant_name': extracted_data.get('vendor', 'Unknown'),
                            'date': self._parse_date(extracted_data.get('date'))
                        }
                    )
                except (InvalidOperation, ValueError) as e:
                    logger.warning(f"Could not update transaction for receipt {receipt.id}: {e}")

            serializer = self.get_serializer(receipt)
            return Response(serializer.data)

        except Exception as e:
            logger.error(f"Reprocessing failed for receipt {receipt.id}: {e}")
            receipt.status = 'failed'
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
                receipt.extracted_data[field] = request.data[field]
        
        receipt.save()

        # Update associated transaction if total changed
        if 'total' in request.data or 'type' in request.data or 'vendor' in request.data or 'date' in request.data:
            try:
                transaction = Transaction.objects.get(receipt=receipt)
                
                if 'total' in request.data:
                    transaction.amount = Decimal(str(request.data['total']))
                if 'type' in request.data:
                    transaction.transaction_type = request.data['type']
                if 'vendor' in request.data:
                    transaction.merchant_name = request.data['vendor']
                if 'date' in request.data:
                    transaction.date = self._parse_date(request.data['date'])
                
                transaction.save()
            except Transaction.DoesNotExist:
                # Create new transaction if it doesn't exist
                extracted_data = receipt.extracted_data
                if extracted_data.get('total'):
                    Transaction.objects.create(
                        receipt=receipt,
                        user=request.user,
                        amount=Decimal(str(extracted_data['total'])),
                        transaction_type=extracted_data.get('type', 'expense'),
                        merchant_name=extracted_data.get('vendor', 'Unknown'),
                        date=self._parse_date(extracted_data.get('date'))
                    )
            except (InvalidOperation, ValueError) as e:
                logger.warning(f"Could not update transaction for receipt {receipt.id}: {e}")

        serializer = self.get_serializer(receipt)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Get dashboard metrics for authenticated user.
        
        Returns comprehensive metrics for the dashboard including:
        - Total receipts processed
        - Financial totals and breakdowns
        - Recent income/expense receipts
        - Pending receipts count
        - Monthly statistics
        """
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        # Get user's receipts and transactions
        receipts = self.get_queryset()
        transactions = Transaction.objects.filter(receipt__in=receipts)
        
        # Calculate date range for "this month"
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Basic receipt metrics
        total_receipts = receipts.count()
        completed_receipts = receipts.filter(ocr_status='completed').count()
        failed_receipts = receipts.filter(ocr_status='failed').count()
        pending_receipts = receipts.filter(ocr_status__in=['processing', 'queued']).count()
        
        # Financial metrics from transactions
        all_transactions = transactions.filter(total_amount__isnull=False)
        total_amount = all_transactions.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')
        
        # This month metrics
        monthly_receipts = receipts.filter(uploaded_at__gte=month_start).count()
        monthly_transactions = transactions.filter(
            receipt__uploaded_at__gte=month_start,
            total_amount__isnull=False
        )
        monthly_total = monthly_transactions.aggregate(
            total=Sum('total_amount')
        )['total'] or Decimal('0')
        
        # Recent income receipts (last 5)
        income_receipts = receipts.filter(
            extracted_data__type='income',
            ocr_status='completed'
        ).order_by('-uploaded_at')[:5]
        
        # Recent expense receipts (last 5)
        expense_receipts = receipts.filter(
            extracted_data__type='expense',
            ocr_status='completed'
        ).order_by('-uploaded_at')[:5]
        
        # Format receipt data for frontend
        def format_receipt_for_dashboard(receipt):
            extracted_data = receipt.extracted_data or {}
            return {
                'id': receipt.id,
                'vendor': extracted_data.get('vendor', 'Unknown Vendor'),
                'amount': float(extracted_data.get('total', 0)),
                'currency': extracted_data.get('currency', 'GBP'),
                'date': receipt.uploaded_at.isoformat(),
                'formatted_amount': f"{extracted_data.get('currency', 'GBP')} {extracted_data.get('total', 0):.2f}"
            }
        
        income_data = [format_receipt_for_dashboard(r) for r in income_receipts]
        expense_data = [format_receipt_for_dashboard(r) for r in expense_receipts]
        
        return Response({
            'totalReceipts': total_receipts,
            'totalAmount': float(total_amount),
            'monthlyReceipts': monthly_receipts,
            'monthlyTotal': float(monthly_total),
            'pendingReceipts': pending_receipts,
            'incomeReceipts': income_data,
            'expenseReceipts': expense_data,
            'success_rate': round(completed_receipts / total_receipts * 100, 1) if total_receipts > 0 else 0,
            'processing_stats': {
                'completed': completed_receipts,
                'failed': failed_receipts,
                'pending': pending_receipts,
                'total': total_receipts
            }
        })

    @action(detail=False, methods=['get'])
    def debug_count(self, request):
        """
        Debug endpoint to check receipt counts and pagination
        """
        queryset = self.get_queryset()
        page_size = request.GET.get('page_size', 100)
        
        return Response({
            'total_receipts_in_db': queryset.count(),
            'requested_page_size': page_size,
            'pagination_class': str(self.pagination_class),
            'queryset_count': queryset.count(),
            'first_5_ids': list(queryset.values_list('id', flat=True)[:5]),
            'last_5_ids': list(queryset.values_list('id', flat=True).order_by('-id')[:5])
        })

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """
        Get summary statistics for user's receipts.
        """
        receipts = self.get_queryset()
        
        # Basic counts
        total_receipts = receipts.count()
        processed_receipts = receipts.filter(status='processed').count()
        failed_receipts = receipts.filter(status='failed').count()
        
        # Financial summary from transactions
        transactions = Transaction.objects.filter(user=request.user)
        total_expenses = transactions.filter(transaction_type='expense').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        total_income = transactions.filter(transaction_type='income').aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0')
        
        avg_amount = transactions.aggregate(avg=Avg('amount'))['avg'] or Decimal('0')
        
        # Category breakdown
        category_stats = transactions.values('merchant_name').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')[:10]
        
        # Type breakdown
        type_stats = transactions.values('transaction_type').annotate(
            count=Count('id'),
            total=Sum('amount')
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
    permission_classes = [AllowAny]  # Temporarily for testing

    def get_queryset(self):
        """Filter transactions by owner"""
        return Transaction.objects.all().order_by('-transaction_date')  # Show all for testing

    def perform_create(self, serializer):
        """Ensure owner is set when creating transaction"""
        # For testing without auth, use a default owner if available
        from accounts.models import Account
        owner = Account.objects.first() if Account.objects.exists() else None
        serializer.save(owner=owner)

    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """Get transactions grouped by merchant/category"""
        transactions = self.get_queryset()
        
        # Group by merchant
        merchants = transactions.values('merchant_name').annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount')
        ).order_by('-total_amount')
        
        return Response(list(merchants))

    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get transactions grouped by type (expense/income)"""
        transactions = self.get_queryset()
        
        # Group by type
        types = transactions.values('transaction_type').annotate(
            count=Count('id'),
            total_amount=Sum('amount'),
            avg_amount=Avg('amount')
        )
        
        return Response(list(types))

    @action(detail=False, methods=['get'])
    def monthly_summary(self, request):
        """Get monthly transaction summary"""
        from django.db.models.functions import TruncMonth
        
        transactions = self.get_queryset()
        
        # Group by month
        monthly_data = transactions.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            count=Count('id'),
            total_expenses=Sum('amount', filter=Q(transaction_type='expense')),
            total_income=Sum('amount', filter=Q(transaction_type='income'))
        ).order_by('-month')
        
        return Response(list(monthly_data))
