"""
Financial Reports Views - Smart Accounting SaaS Platform

This module implements comprehensive financial reporting endpoints that transform
extracted receipt data into actionable, exportable reports suitable for:
- Personal finance tracking
- Business accounting  
- Tax preparation
- Auditing
- Subscription-based tiered access

All reports are secure, accurate, filterable, and exportable in standard formats.
"""

import json
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import (
    Q, Sum, Count, Avg, Max, Min, 
    Case, When, Value, IntegerField,
    TruncMonth, TruncYear, TruncDay
)
from django.db.models.functions import Coalesce, Extract
from django.utils import timezone
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from receipts.models import Receipt, Transaction
from accounts.models import Account


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def income_vs_expense_report(request):
    """
    Monthly Income vs Expense Report
    
    Purpose: Track cash flow over time
    Dimensions:
    - Monthly totals
    - Net balance (Income - Expense)
    - Growth trends
    
    Filters: Date range, currency, business/personal
    
    Query Parameters:
    - start_date: YYYY-MM-DD (default: 12 months ago)
    - end_date: YYYY-MM-DD (default: today)
    - currency: GBP, USD, EUR (default: all)
    - is_business: true/false (default: all)
    """
    try:
        # Get filter parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        currency_filter = request.GET.get('currency')
        is_business_filter = request.GET.get('is_business')
        
        # Set default date range (12 months)
        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
        if not start_date:
            start_date = end_date - timedelta(days=365)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        # Get user's transactions
        transactions = Transaction.objects.filter(
            owner=request.user,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        )
        
        # Apply filters
        if currency_filter:
            transactions = transactions.filter(currency=currency_filter)
            
        # Note: is_business logic would need to be added to Transaction model
        # For now, we'll use a placeholder based on category or manual tagging
        
        # Group by month and transaction type
        monthly_data = transactions.annotate(
            month=TruncMonth('transaction_date'),
            year=Extract('transaction_date', 'year'),
            month_num=Extract('transaction_date', 'month')
        ).values('month', 'year', 'month_num').annotate(
            total_income=Coalesce(
                Sum('total_amount', filter=Q(transaction_type='income')), 
                Value(0)
            ),
            total_expenses=Coalesce(
                Sum('total_amount', filter=Q(transaction_type='expense')), 
                Value(0)
            ),
            transaction_count=Count('id'),
            income_count=Count('id', filter=Q(transaction_type='income')),
            expense_count=Count('id', filter=Q(transaction_type='expense'))
        ).order_by('month')
        
        # Calculate net balance and format response
        report_data = []
        previous_net = 0
        
        for month_data in monthly_data:
            income = float(month_data['total_income'])
            expenses = float(month_data['total_expenses'])
            net_balance = income - expenses
            growth_rate = 0
            
            if previous_net != 0:
                growth_rate = ((net_balance - previous_net) / abs(previous_net)) * 100
            
            report_data.append({
                'period': month_data['month'].strftime('%Y-%m'),
                'year': month_data['year'],
                'month': month_data['month_num'],
                'income': income,
                'expenses': expenses,
                'net_balance': net_balance,
                'growth_rate': round(growth_rate, 2),
                'transaction_count': month_data['transaction_count'],
                'income_transactions': month_data['income_count'],
                'expense_transactions': month_data['expense_count']
            })
            
            previous_net = net_balance
        
        # Calculate summary statistics
        total_income = sum(item['income'] for item in report_data)
        total_expenses = sum(item['expenses'] for item in report_data)
        avg_monthly_income = total_income / len(report_data) if report_data else 0
        avg_monthly_expenses = total_expenses / len(report_data) if report_data else 0
        
        return Response({
            'report_type': 'income_vs_expense',
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'total_months': len(report_data)
            },
            'filters': {
                'currency': currency_filter,
                'is_business': is_business_filter
            },
            'summary': {
                'total_income': total_income,
                'total_expenses': total_expenses,
                'net_total': total_income - total_expenses,
                'avg_monthly_income': round(avg_monthly_income, 2),
                'avg_monthly_expenses': round(avg_monthly_expenses, 2),
                'avg_monthly_net': round(avg_monthly_income - avg_monthly_expenses, 2)
            },
            'data': report_data,
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate income vs expense report: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def category_breakdown_report(request):
    """
    Category Breakdown Report
    
    Purpose: Understand spending habits
    Dimensions:
    - Pie chart: % of total by category
    - Bar chart: Top categories by spend
    - Transaction frequency by category
    
    Query Parameters:
    - start_date: YYYY-MM-DD (default: 12 months ago)
    - end_date: YYYY-MM-DD (default: today)
    - transaction_type: income/expense (default: expense)
    - limit: number of categories to return (default: 20)
    """
    try:
        # Get filter parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        transaction_type = request.GET.get('transaction_type', 'expense')
        limit = int(request.GET.get('limit', 20))
        
        # Set default date range
        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
        if not start_date:
            start_date = end_date - timedelta(days=365)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        # Get user's transactions
        transactions = Transaction.objects.filter(
            owner=request.user,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date,
            transaction_type=transaction_type
        )
        
        # Group by category
        category_data = transactions.values('category').annotate(
            total_amount=Sum('total_amount'),
            transaction_count=Count('id'),
            avg_amount=Avg('total_amount'),
            max_amount=Max('total_amount'),
            min_amount=Min('total_amount')
        ).order_by('-total_amount')[:limit]
        
        # Calculate total for percentage calculation
        total_amount = transactions.aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Format response with percentages
        categories = []
        for cat_data in category_data:
            amount = float(cat_data['total_amount'])
            percentage = (amount / float(total_amount)) * 100 if total_amount > 0 else 0
            
            categories.append({
                'category': cat_data['category'],
                'category_display': dict(Transaction.CATEGORY_CHOICES).get(
                    cat_data['category'], cat_data['category']
                ),
                'total_amount': amount,
                'percentage': round(percentage, 2),
                'transaction_count': cat_data['transaction_count'],
                'avg_amount': round(float(cat_data['avg_amount']), 2),
                'max_amount': float(cat_data['max_amount']),
                'min_amount': float(cat_data['min_amount'])
            })
        
        # Get top vendors for context
        top_vendors = transactions.values('vendor_name').annotate(
            total_amount=Sum('total_amount'),
            transaction_count=Count('id')
        ).order_by('-total_amount')[:10]
        
        vendor_data = []
        for vendor in top_vendors:
            vendor_data.append({
                'vendor': vendor['vendor_name'],
                'total_amount': float(vendor['total_amount']),
                'transaction_count': vendor['transaction_count'],
                'percentage': (float(vendor['total_amount']) / float(total_amount)) * 100 if total_amount > 0 else 0
            })
        
        return Response({
            'report_type': 'category_breakdown',
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'filters': {
                'transaction_type': transaction_type,
                'limit': limit
            },
            'summary': {
                'total_amount': float(total_amount),
                'total_transactions': transactions.count(),
                'categories_count': len(categories),
                'avg_per_category': float(total_amount) / len(categories) if categories else 0
            },
            'categories': categories,
            'top_vendors': vendor_data,
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate category breakdown report: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def tax_deductible_report(request):
    """
    Tax-Deductible Expenses Report
    
    Purpose: Prepare for tax season
    Criteria:
    - transaction_type = expense
    - Business-related categories
    - Exclude personal/non-deductible items
    
    Output:
    - Total deductible amount
    - Breakdown by category
    - Exportable for CPA review
    
    Query Parameters:
    - tax_year: YYYY (default: current year)
    - include_categories: comma-separated list of categories to include
    - exclude_categories: comma-separated list of categories to exclude
    """
    try:
        # Get filter parameters
        tax_year = request.GET.get('tax_year')
        include_categories = request.GET.get('include_categories', '').split(',') if request.GET.get('include_categories') else []
        exclude_categories = request.GET.get('exclude_categories', '').split(',') if request.GET.get('exclude_categories') else []
        
        # Set tax year (default to current year)
        if not tax_year:
            tax_year = timezone.now().year
        else:
            tax_year = int(tax_year)
        
        # Define tax-deductible categories (business expenses)
        deductible_categories = [
            'office_supplies', 'software', 'hardware', 'professional_services',
            'marketing', 'travel', 'utilities', 'rent'
        ]
        
        # Apply category filters
        if include_categories and include_categories != ['']:
            deductible_categories = [cat for cat in deductible_categories if cat in include_categories]
        
        if exclude_categories and exclude_categories != ['']:
            deductible_categories = [cat for cat in deductible_categories if cat not in exclude_categories]
        
        # Get transactions for the tax year
        start_date = datetime(tax_year, 1, 1).date()
        end_date = datetime(tax_year, 12, 31).date()
        
        transactions = Transaction.objects.filter(
            owner=request.user,
            transaction_type='expense',
            transaction_date__gte=start_date,
            transaction_date__lte=end_date,
            category__in=deductible_categories
        )
        
        # Group by category
        category_breakdown = transactions.values('category').annotate(
            total_amount=Sum('total_amount'),
            transaction_count=Count('id'),
            avg_amount=Avg('total_amount')
        ).order_by('-total_amount')
        
        deductible_expenses = []
        total_deductible = 0
        
        for cat_data in category_breakdown:
            amount = float(cat_data['total_amount'])
            total_deductible += amount
            
            deductible_expenses.append({
                'category': cat_data['category'],
                'category_display': dict(Transaction.CATEGORY_CHOICES).get(
                    cat_data['category'], cat_data['category']
                ),
                'total_amount': amount,
                'transaction_count': cat_data['transaction_count'],
                'avg_amount': round(float(cat_data['avg_amount']), 2),
                'is_deductible': True
            })
        
        # Get monthly breakdown for tax planning
        monthly_breakdown = transactions.annotate(
            month=TruncMonth('transaction_date')
        ).values('month').annotate(
            total_amount=Sum('total_amount'),
            transaction_count=Count('id')
        ).order_by('month')
        
        monthly_data = []
        for month_data in monthly_breakdown:
            monthly_data.append({
                'month': month_data['month'].strftime('%Y-%m'),
                'total_amount': float(month_data['total_amount']),
                'transaction_count': month_data['transaction_count']
            })
        
        # Get all transactions for this user in the tax year for context
        all_expenses = Transaction.objects.filter(
            owner=request.user,
            transaction_type='expense',
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        deductible_percentage = (total_deductible / float(all_expenses)) * 100 if all_expenses > 0 else 0
        
        return Response({
            'report_type': 'tax_deductible',
            'tax_year': tax_year,
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'filters': {
                'deductible_categories': deductible_categories,
                'include_categories': include_categories,
                'exclude_categories': exclude_categories
            },
            'summary': {
                'total_deductible_amount': total_deductible,
                'total_all_expenses': float(all_expenses),
                'deductible_percentage': round(deductible_percentage, 2),
                'deductible_transaction_count': transactions.count(),
                'categories_with_deductions': len(deductible_expenses)
            },
            'category_breakdown': deductible_expenses,
            'monthly_breakdown': monthly_data,
            'tax_guidance': {
                'estimated_tax_savings': total_deductible * 0.25,  # Rough 25% tax rate estimate
                'note': 'Consult with a tax professional for accurate deduction calculations'
            },
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate tax deductible report: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def vendor_analysis_report(request):
    """
    Vendor Spend Analysis Report
    
    Purpose: Identify top vendors and spending patterns
    Output:
    - Top vendors by spend
    - Frequency of purchases
    - Average transaction size
    - Seasonal patterns
    
    Use Case: Negotiate discounts, detect fraud, budget planning
    
    Query Parameters:
    - start_date: YYYY-MM-DD (default: 12 months ago)
    - end_date: YYYY-MM-DD (default: today)
    - limit: number of vendors to return (default: 50)
    - min_transactions: minimum number of transactions (default: 1)
    """
    try:
        # Get filter parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        limit = int(request.GET.get('limit', 50))
        min_transactions = int(request.GET.get('min_transactions', 1))
        
        # Set default date range
        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
        if not start_date:
            start_date = end_date - timedelta(days=365)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        # Get user's transactions
        transactions = Transaction.objects.filter(
            owner=request.user,
            transaction_date__gte=start_date,
            transaction_date__lte=end_date
        )
        
        # Group by vendor
        vendor_analysis = transactions.values('vendor_name').annotate(
            total_spent=Sum('total_amount'),
            transaction_count=Count('id'),
            avg_transaction=Avg('total_amount'),
            max_transaction=Max('total_amount'),
            min_transaction=Min('total_amount'),
            first_transaction=Min('transaction_date'),
            last_transaction=Max('transaction_date')
        ).filter(
            transaction_count__gte=min_transactions
        ).order_by('-total_spent')[:limit]
        
        # Calculate total spending for percentage calculations
        total_spending = transactions.aggregate(total=Sum('total_amount'))['total'] or 0
        
        vendor_data = []
        for vendor in vendor_analysis:
            total_spent = float(vendor['total_spent'])
            percentage = (total_spent / float(total_spending)) * 100 if total_spending > 0 else 0
            
            # Calculate frequency (transactions per month)
            days_active = (vendor['last_transaction'] - vendor['first_transaction']).days + 1
            frequency_per_month = (vendor['transaction_count'] / (days_active / 30.44)) if days_active > 0 else 0
            
            vendor_data.append({
                'vendor_name': vendor['vendor_name'],
                'total_spent': total_spent,
                'percentage_of_total': round(percentage, 2),
                'transaction_count': vendor['transaction_count'],
                'avg_transaction': round(float(vendor['avg_transaction']), 2),
                'max_transaction': float(vendor['max_transaction']),
                'min_transaction': float(vendor['min_transaction']),
                'first_transaction': vendor['first_transaction'].isoformat(),
                'last_transaction': vendor['last_transaction'].isoformat(),
                'frequency_per_month': round(frequency_per_month, 1),
                'days_active': days_active
            })
        
        # Get spending patterns by category for top vendors
        top_vendor_names = [v['vendor_name'] for v in vendor_data[:10]]
        category_patterns = transactions.filter(
            vendor_name__in=top_vendor_names
        ).values('vendor_name', 'category').annotate(
            total_amount=Sum('total_amount'),
            transaction_count=Count('id')
        ).order_by('vendor_name', '-total_amount')
        
        # Organize category data by vendor
        vendor_categories = {}
        for pattern in category_patterns:
            vendor = pattern['vendor_name']
            if vendor not in vendor_categories:
                vendor_categories[vendor] = []
            
            vendor_categories[vendor].append({
                'category': pattern['category'],
                'category_display': dict(Transaction.CATEGORY_CHOICES).get(
                    pattern['category'], pattern['category']
                ),
                'total_amount': float(pattern['total_amount']),
                'transaction_count': pattern['transaction_count']
            })
        
        # Calculate spending trends (quarterly comparison)
        current_quarter_start = datetime(timezone.now().year, ((timezone.now().month - 1) // 3) * 3 + 1, 1).date()
        previous_quarter_start = current_quarter_start - timedelta(days=90)
        
        current_quarter_spending = transactions.filter(
            transaction_date__gte=current_quarter_start
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        previous_quarter_spending = transactions.filter(
            transaction_date__gte=previous_quarter_start,
            transaction_date__lt=current_quarter_start
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        quarterly_change = 0
        if previous_quarter_spending > 0:
            quarterly_change = ((float(current_quarter_spending) - float(previous_quarter_spending)) / float(previous_quarter_spending)) * 100
        
        return Response({
            'report_type': 'vendor_analysis',
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'filters': {
                'limit': limit,
                'min_transactions': min_transactions
            },
            'summary': {
                'total_spending': float(total_spending),
                'unique_vendors': len(vendor_data),
                'total_transactions': transactions.count(),
                'avg_per_vendor': float(total_spending) / len(vendor_data) if vendor_data else 0,
                'quarterly_change_percent': round(quarterly_change, 2)
            },
            'vendors': vendor_data,
            'vendor_categories': vendor_categories,
            'insights': {
                'top_vendor': vendor_data[0] if vendor_data else None,
                'most_frequent_vendor': max(vendor_data, key=lambda x: x['transaction_count']) if vendor_data else None,
                'highest_avg_transaction': max(vendor_data, key=lambda x: x['avg_transaction']) if vendor_data else None
            },
            'generated_at': timezone.now().isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate vendor analysis report: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def audit_log_report(request):
    """
    Receipt Audit Log Report
    
    Purpose: Compliance and auditing
    Content:
    - List of all receipts with processing status
    - AI confidence scores
    - Manual correction history
    - Export timestamp and user
    
    Query Parameters:
    - start_date: YYYY-MM-DD (default: 30 days ago)
    - end_date: YYYY-MM-DD (default: today)
    - status: pending/processing/completed/failed (default: all)
    - include_metadata: true/false (default: false)
    """
    try:
        # Get filter parameters
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        status_filter = request.GET.get('status')
        include_metadata = request.GET.get('include_metadata', 'false').lower() == 'true'
        
        # Set default date range (30 days)
        if not end_date:
            end_date = timezone.now().date()
        else:
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            
        if not start_date:
            start_date = end_date - timedelta(days=30)
        else:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
        
        # Get user's receipts
        receipts = Receipt.objects.filter(
            owner=request.user,
            uploaded_at__date__gte=start_date,
            uploaded_at__date__lte=end_date
        )
        
        # Apply status filter
        if status_filter:
            receipts = receipts.filter(ocr_status=status_filter)
        
        # Build audit log entries
        audit_entries = []
        
        for receipt in receipts.order_by('-uploaded_at'):
            extracted_data = receipt.extracted_data or {}
            processing_metadata = receipt.processing_metadata or {}
            
            # Basic audit entry
            entry = {
                'receipt_id': receipt.id,
                'original_filename': receipt.original_filename,
                'uploaded_at': receipt.uploaded_at.isoformat(),
                'updated_at': receipt.updated_at.isoformat(),
                'ocr_status': receipt.ocr_status,
                'ocr_confidence': receipt.ocr_confidence,
                'is_verified': receipt.is_verified,
                'is_manually_verified': receipt.is_manually_verified,
                'verified_at': receipt.verified_at.isoformat() if receipt.verified_at else None,
                'verified_by': receipt.verified_by.email if receipt.verified_by else None,
                'processing_errors_count': len(receipt.processing_errors) if receipt.processing_errors else 0
            }
            
            # Add extracted data summary
            if extracted_data:
                entry['extracted_summary'] = {
                    'vendor': extracted_data.get('vendor'),
                    'date': extracted_data.get('date'),
                    'total': extracted_data.get('total'),
                    'currency': extracted_data.get('currency'),
                    'type': extracted_data.get('type')
                }
            
            # Add processing metadata if requested
            if include_metadata and processing_metadata:
                entry['processing_metadata'] = {
                    'model_used': processing_metadata.get('model'),
                    'processing_time': processing_metadata.get('processing_time'),
                    'cost_usd': processing_metadata.get('cost_usd'),
                    'token_usage': processing_metadata.get('token_usage'),
                    'segments_processed': processing_metadata.get('segments_processed')
                }
            
            # Add transaction info if exists
            try:
                transaction = Transaction.objects.get(receipt=receipt)
                entry['transaction_created'] = True
                entry['transaction_id'] = transaction.id
                entry['transaction_amount'] = float(transaction.total_amount)
                entry['transaction_category'] = transaction.category
            except Transaction.DoesNotExist:
                entry['transaction_created'] = False
            
            audit_entries.append(entry)
        
        # Calculate summary statistics
        total_receipts = len(audit_entries)
        status_breakdown = receipts.values('ocr_status').annotate(
            count=Count('id')
        ).order_by('ocr_status')
        
        status_stats = {}
        for stat in status_breakdown:
            status_stats[stat['ocr_status']] = stat['count']
        
        # Calculate processing costs if metadata is available
        total_cost = 0
        total_tokens = 0
        avg_processing_time = 0
        
        if include_metadata:
            cost_data = receipts.exclude(processing_metadata={}).values_list('processing_metadata', flat=True)
            processing_times = []
            
            for metadata in cost_data:
                if isinstance(metadata, dict):
                    total_cost += metadata.get('cost_usd', 0)
                    total_tokens += metadata.get('token_usage', 0)
                    if metadata.get('processing_time'):
                        processing_times.append(metadata.get('processing_time'))
            
            if processing_times:
                avg_processing_time = sum(processing_times) / len(processing_times)
        
        # Compliance checks
        compliance_issues = []
        
        # Check for receipts without verification after 7 days
        old_unverified = receipts.filter(
            uploaded_at__lt=timezone.now() - timedelta(days=7),
            is_manually_verified=False,
            is_auto_approved=False
        ).count()
        
        if old_unverified > 0:
            compliance_issues.append(f"{old_unverified} receipts older than 7 days require manual verification")
        
        # Check for failed processing
        failed_count = status_stats.get('failed', 0)
        if failed_count > 0:
            compliance_issues.append(f"{failed_count} receipts failed processing and need attention")
        
        return Response({
            'report_type': 'audit_log',
            'period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            },
            'filters': {
                'status': status_filter,
                'include_metadata': include_metadata
            },
            'summary': {
                'total_receipts': total_receipts,
                'status_breakdown': status_stats,
                'verification_rate': (receipts.filter(is_manually_verified=True).count() / total_receipts * 100) if total_receipts > 0 else 0,
                'auto_approval_rate': (receipts.filter(is_auto_approved=True).count() / total_receipts * 100) if total_receipts > 0 else 0,
                'avg_confidence_score': receipts.exclude(ocr_confidence__isnull=True).aggregate(avg=Avg('ocr_confidence'))['avg'] or 0
            },
            'processing_costs': {
                'total_cost_usd': round(total_cost, 4),
                'total_tokens': total_tokens,
                'avg_processing_time_seconds': round(avg_processing_time, 2),
                'cost_per_receipt': round(total_cost / total_receipts, 4) if total_receipts > 0 else 0
            },
            'compliance': {
                'issues': compliance_issues,
                'compliance_score': max(0, 100 - len(compliance_issues) * 10)
            },
            'audit_entries': audit_entries,
            'generated_at': timezone.now().isoformat(),
            'generated_by': request.user.email
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate audit log report: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def report_summary(request):
    """
    Reports Summary Dashboard
    
    Provides a quick overview of all available reports and key metrics
    for the user's dashboard.
    """
    try:
        # Get current date for calculations
        now = timezone.now()
        current_year = now.year
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        
        # Get user's data
        receipts = Receipt.objects.filter(owner=request.user)
        transactions = Transaction.objects.filter(owner=request.user)
        
        # Quick metrics
        total_receipts = receipts.count()
        total_transactions = transactions.count()
        
        # Current month vs last month
        current_month_expenses = transactions.filter(
            transaction_type='expense',
            transaction_date__gte=current_month_start.date()
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        last_month_expenses = transactions.filter(
            transaction_type='expense',
            transaction_date__gte=last_month_start.date(),
            transaction_date__lt=current_month_start.date()
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Year to date
        ytd_start = datetime(current_year, 1, 1).date()
        ytd_income = transactions.filter(
            transaction_type='income',
            transaction_date__gte=ytd_start
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        ytd_expenses = transactions.filter(
            transaction_type='expense',
            transaction_date__gte=ytd_start
        ).aggregate(total=Sum('total_amount'))['total'] or 0
        
        # Top categories this year
        top_categories = transactions.filter(
            transaction_date__gte=ytd_start,
            transaction_type='expense'
        ).values('category').annotate(
            total=Sum('total_amount')
        ).order_by('-total')[:5]
        
        # Recent activity
        recent_receipts = receipts.filter(
            uploaded_at__gte=now - timedelta(days=7)
        ).count()
        
        return Response({
            'user': request.user.email,
            'quick_metrics': {
                'total_receipts': total_receipts,
                'total_transactions': total_transactions,
                'current_month_expenses': float(current_month_expenses),
                'last_month_expenses': float(last_month_expenses),
                'month_over_month_change': ((float(current_month_expenses) - float(last_month_expenses)) / float(last_month_expenses) * 100) if last_month_expenses > 0 else 0,
                'ytd_income': float(ytd_income),
                'ytd_expenses': float(ytd_expenses),
                'ytd_net': float(ytd_income) - float(ytd_expenses),
                'recent_receipts_7_days': recent_receipts
            },
            'top_categories_ytd': [
                {
                    'category': cat['category'],
                    'category_display': dict(Transaction.CATEGORY_CHOICES).get(cat['category'], cat['category']),
                    'total': float(cat['total'])
                }
                for cat in top_categories
            ],
            'available_reports': [
                {
                    'name': 'Income vs Expense',
                    'endpoint': '/api/v1/reports/income-expense/',
                    'description': 'Monthly cash flow analysis with growth trends'
                },
                {
                    'name': 'Category Breakdown',
                    'endpoint': '/api/v1/reports/category-breakdown/',
                    'description': 'Spending habits by category with percentages'
                },
                {
                    'name': 'Tax Deductible',
                    'endpoint': '/api/v1/reports/tax-deductible/',
                    'description': 'Business expenses for tax preparation'
                },
                {
                    'name': 'Vendor Analysis',
                    'endpoint': '/api/v1/reports/vendor-analysis/',
                    'description': 'Top vendors and spending patterns'
                },
                {
                    'name': 'Audit Log',
                    'endpoint': '/api/v1/reports/audit-log/',
                    'description': 'Receipt processing history and compliance'
                }
            ],
            'generated_at': now.isoformat()
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate report summary: {str(e)}'}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
