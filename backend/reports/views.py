from django.db.models import Sum, Count
from django.utils.dateparse import parse_date
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny  # Changed for testing
from receipts.models import Transaction
from decimal import Decimal


class ExpenseSummaryView(APIView):
    """
    Generate expense summary report for a specific date range.
    Returns total expenses broken down by category.
    """
    permission_classes = [AllowAny]  # Changed for testing

    def get(self, request):
        # Get date range parameters
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if not start_date_str or not end_date_str:
            return Response(
                {'error': 'Both start_date and end_date parameters are required (YYYY-MM-DD format)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = parse_date(start_date_str)
            end_date = parse_date(end_date_str)
            
            if not start_date or not end_date:
                raise ValueError("Invalid date format")
                
            if start_date > end_date:
                return Response(
                    {'error': 'start_date cannot be after end_date'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter transactions for the authenticated user and date range
        transactions = Transaction.objects.filter(
            owner=request.user,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        )
        
        # Aggregate by category
        category_summary = transactions.values('category').annotate(
            total_amount=Sum('total_amount'),
            transaction_count=Count('id'),
            total_vat=Sum('vat_amount')
        ).order_by('-total_amount')
        
        # Calculate totals
        total_expenses = transactions.aggregate(
            total=Sum('total_amount'),
            total_vat=Sum('vat_amount'),
            count=Count('id')
        )
        
        # Format the response
        formatted_categories = []
        for category in category_summary:
            category_display = dict(Transaction.CATEGORY_CHOICES).get(
                category['category'], 
                category['category']
            )
            formatted_categories.append({
                'category': category['category'],
                'category_display': category_display,
                'total_amount': float(category['total_amount'] or 0),
                'total_vat': float(category['total_vat'] or 0),
                'transaction_count': category['transaction_count']
            })
        
        response_data = {
            'report_type': 'expense_summary',
            'period': {
                'start_date': start_date_str,
                'end_date': end_date_str
            },
            'summary': {
                'total_expenses': float(total_expenses['total'] or 0),
                'total_vat': float(total_expenses['total_vat'] or 0),
                'transaction_count': total_expenses['count']
            },
            'categories': formatted_categories
        }
        
        return Response(response_data, status=status.HTTP_200_OK)


class ProfitLossView(APIView):
    """
    Generate profit and loss report for a specific date range.
    Currently expense-focused as income data is not available in current model.
    """
    permission_classes = [AllowAny]  # Changed for testing

    def get(self, request):
        # Get date range parameters
        start_date_str = request.query_params.get('start_date')
        end_date_str = request.query_params.get('end_date')
        
        if not start_date_str or not end_date_str:
            return Response(
                {'error': 'Both start_date and end_date parameters are required (YYYY-MM-DD format)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            start_date = parse_date(start_date_str)
            end_date = parse_date(end_date_str)
            
            if not start_date or not end_date:
                raise ValueError("Invalid date format")
                
            if start_date > end_date:
                return Response(
                    {'error': 'start_date cannot be after end_date'},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Use YYYY-MM-DD format'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Filter transactions for the authenticated user and date range
        transactions = Transaction.objects.filter(
            owner=request.user,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        )
        
        # Calculate totals
        total_expenses = transactions.aggregate(
            total=Sum('total_amount'),
            total_vat=Sum('vat_amount'),
            count=Count('id')
        )
        
        # Calculate deductible vs non-deductible expenses
        deductible_expenses = transactions.filter(is_tax_deductible=True).aggregate(
            total=Sum('total_amount'),
            count=Count('id')
        )
        
        non_deductible_expenses = transactions.filter(is_tax_deductible=False).aggregate(
            total=Sum('total_amount'),
            count=Count('id')
        )
        
        # Monthly breakdown
        monthly_breakdown = transactions.extra(
            select={'month': "strftime('%%Y-%%m', transaction_date)"}
        ).values('month').annotate(
            total_amount=Sum('total_amount'),
            transaction_count=Count('id')
        ).order_by('month')
        
        formatted_monthly = []
        for month_data in monthly_breakdown:
            formatted_monthly.append({
                'month': month_data['month'],
                'total_expenses': float(month_data['total_amount'] or 0),
                'transaction_count': month_data['transaction_count']
            })
        
        response_data = {
            'report_type': 'profit_loss',
            'period': {
                'start_date': start_date_str,
                'end_date': end_date_str
            },
            'summary': {
                'total_income': 0.0,  # No income data available with current model
                'total_expenses': float(total_expenses['total'] or 0),
                'net_profit_loss': float(-(total_expenses['total'] or 0)),  # Negative since only expenses
                'total_vat': float(total_expenses['total_vat'] or 0),
                'transaction_count': total_expenses['count']
            },
            'expense_breakdown': {
                'tax_deductible': {
                    'amount': float(deductible_expenses['total'] or 0),
                    'count': deductible_expenses['count']
                },
                'non_tax_deductible': {
                    'amount': float(non_deductible_expenses['total'] or 0),
                    'count': non_deductible_expenses['count']
                }
            },
            'monthly_breakdown': formatted_monthly,
            'note': 'This report is expense-focused. Income tracking would require additional transaction types.'
        }
        
        return Response(response_data, status=status.HTTP_200_OK)
