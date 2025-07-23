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
from .services.openai_service import process_receipt
from .utils import DecimalEncoder

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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter receipts by user"""
        return Receipt.objects.filter(user=self.request.user).order_by('-created_at')

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

            # Create receipt record
            receipt = Receipt.objects.create(
                user=request.user,
                image=image_file,
                description=description,
                status='processing'
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
                receipt.status = 'processed'
                receipt.save()

                # Create transaction if extraction was successful
                extracted_data = receipt.extracted_data or {}
                if extracted_data.get('total'):
                    try:
                        total_amount = Decimal(str(extracted_data['total']))
                        transaction_type = extracted_data.get('type', 'expense')
                        
                        Transaction.objects.create(
                            receipt=receipt,
                            user=request.user,
                            amount=total_amount,
                            transaction_type=transaction_type,
                            merchant_name=extracted_data.get('vendor', 'Unknown'),
                            date=self._parse_date(extracted_data.get('date'))
                        )
                    except (InvalidOperation, ValueError) as e:
                        logger.warning(f"Could not create transaction for receipt {receipt.id}: {e}")

                serializer = self.get_serializer(receipt)
                return Response(serializer.data, status=status.HTTP_201_CREATED)

            except Exception as e:
                logger.error(f"OpenAI processing failed for receipt {receipt.id}: {e}")
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
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filter transactions by user"""
        return Transaction.objects.filter(user=self.request.user).order_by('-date')

    def perform_create(self, serializer):
        """Ensure user is set when creating transaction"""
        serializer.save(user=self.request.user)

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
