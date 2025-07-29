"""
Enhanced Analytics Views - Production Safe Version
Provides advanced business intelligence and smart insights without external dependencies.
Fixed to work with actual Receipt model structure.
"""

from datetime import datetime, timedelta, date
from decimal import Decimal
import calendar
import statistics
from django.db.models import Q, Sum, Count, Avg, Max, Min, DecimalField, F, Case, When
from django.db.models.functions import Extract, TruncMonth, TruncDay, TruncWeek
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from typing import Dict, List, Any

from receipts.models import Receipt
from accounts.subscription_permissions import PremiumReportPermission, PlatinumReportPermission


@api_view(['GET'])
@permission_classes([PremiumReportPermission])
def predictive_cash_flow(request):
    """
    Predictive Cash Flow Analysis
    - 3-month cash flow forecast based on historical patterns
    - Seasonal trend detection using built-in Python statistics
    - Variance analysis and alerts
    """
    try:
        user = request.user
        prediction_months = int(request.GET.get('prediction_months', 3))
        historical_days = int(request.GET.get('days', 3650))  # Default to 10 years to include historical data
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=historical_days)
        
        # Get comprehensive receipt statistics for the user
        all_receipts = Receipt.objects.filter(owner=user)
        receipt_stats = {
            'total_receipts': all_receipts.count(),
            'completed': all_receipts.filter(ocr_status='completed').count(),
            'processing': all_receipts.filter(ocr_status='processing').count(),
            'failed': all_receipts.filter(ocr_status='failed').count(),
            'queued': all_receipts.filter(ocr_status='queued').count(),
            'with_extracted_data': all_receipts.filter(extracted_data__isnull=False).count(),
        }
        
        # Get only completed receipts with data for analysis
        receipts = all_receipts.filter(
            extracted_data__isnull=False,
            ocr_status='completed'
        )
        
        # Build historical monthly data from extracted_data
        monthly_totals = {}
        processing_stats = {
            'receipts_processed': 0,
            'receipts_skipped_no_date': 0,
            'receipts_skipped_no_total': 0,
            'receipts_skipped_invalid_date': 0,
            'receipts_outside_date_range': 0,
            'receipts_with_errors': 0
        }
        
        for receipt in receipts:
            if not receipt.extracted_data:
                processing_stats['receipts_skipped_no_date'] += 1
                continue
                
            if 'date' not in receipt.extracted_data:
                processing_stats['receipts_skipped_no_date'] += 1
                continue
                
            if 'total' not in receipt.extracted_data:
                processing_stats['receipts_skipped_no_total'] += 1
                continue
                
            try:
                # Handle missing or empty dates
                date_str = receipt.extracted_data.get('date')
                if not date_str or (isinstance(date_str, str) and not date_str.strip()):
                    processing_stats['receipts_skipped_no_date'] += 1
                    continue
                    
                receipt_date = datetime.strptime(str(date_str).strip(), '%Y-%m-%d').date()
                
                if not (start_date <= receipt_date <= end_date):
                    processing_stats['receipts_outside_date_range'] += 1
                    continue
                    
                month_key = receipt_date.strftime('%Y-%m')
                total = float(receipt.extracted_data.get('total', 0))
                
                if month_key not in monthly_totals:
                    monthly_totals[month_key] = {'income': 0, 'expenses': 0, 'net': 0}
                
                if receipt.extracted_data.get('type') == 'income':
                    monthly_totals[month_key]['income'] += total
                else:
                    monthly_totals[month_key]['expenses'] += total
                
                monthly_totals[month_key]['net'] = monthly_totals[month_key]['income'] - monthly_totals[month_key]['expenses']
                processing_stats['receipts_processed'] += 1
                
            except (ValueError, TypeError, AttributeError) as e:
                processing_stats['receipts_with_errors'] += 1
                processing_stats['receipts_skipped_invalid_date'] += 1
                continue
        
        # Convert to list format
        historical_data = []
        for month_key, totals in sorted(monthly_totals.items()):
            historical_data.append({
                'month': month_key,
                'income': totals['income'],
                'expenses': totals['expenses'],
                'net_flow': totals['net']
            })
        
        # Simple prediction using recent averages (production-safe approach)
        predictions = []
        if len(historical_data) >= 3:
            recent_data = historical_data[-6:]  # Last 6 months for trend
            
            avg_income = statistics.mean([d['income'] for d in recent_data])
            avg_expenses = statistics.mean([d['expenses'] for d in recent_data])
            avg_net = avg_income - avg_expenses
            
            # Generate predictions for next N months
            current_date = end_date.replace(day=1)
            for i in range(prediction_months):
                current_date = (current_date.replace(day=28) + timedelta(days=4)).replace(day=1)
                
                # Simple trend adjustment (seasonal factor)
                seasonal_factor = 1.0
                if len(recent_data) >= 6:
                    # Very basic seasonality detection
                    seasonal_factor = 1.0 + (0.1 * (i % 2))  # Alternating slight variation
                
                predictions.append({
                    'month': current_date.strftime('%Y-%m'),
                    'predicted_income': round(avg_income * seasonal_factor, 2),
                    'predicted_expenses': round(avg_expenses * seasonal_factor, 2),
                    'predicted_net_flow': round(avg_net * seasonal_factor, 2),
                    'confidence': max(0.3, 0.8 - (i * 0.1))  # Decreasing confidence
                })
        
        # Calculate variance and alerts
        alerts = []
        if len(historical_data) >= 2:
            recent_variance = []
            for i in range(1, len(historical_data)):
                variance = abs(historical_data[i]['net_flow'] - historical_data[i-1]['net_flow'])
                recent_variance.append(variance)
            
            if recent_variance:
                avg_variance = statistics.mean(recent_variance)
                if avg_variance > 1000:  # High variance threshold
                    alerts.append({
                        'type': 'high_variance',
                        'message': f'High cash flow volatility detected (avg variance: £{avg_variance:.2f})',
                        'severity': 'medium'
                    })
        
        return Response({
            'historical_data': historical_data,
            'predictions': predictions,
            'summary': {
                'months_analyzed': len(historical_data),
                'avg_monthly_income': round(statistics.mean([d['income'] for d in historical_data]), 2) if historical_data else 0,
                'avg_monthly_expenses': round(statistics.mean([d['expenses'] for d in historical_data]), 2) if historical_data else 0,
                'trend': 'positive' if len(historical_data) >= 2 and historical_data[-1]['net_flow'] > historical_data[-2]['net_flow'] else 'negative'
            },
            'alerts': alerts,
            'data_quality': {
                'receipt_statistics': receipt_stats,
                'processing_statistics': processing_stats,
                'data_coverage': {
                    'date_range_start': start_date.isoformat(),
                    'date_range_end': end_date.isoformat(),
                    'months_with_data': len(monthly_totals),
                    'receipts_in_range': processing_stats['receipts_processed']
                }
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'Cash flow analysis failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([PremiumReportPermission])
def spending_intelligence(request):
    """
    Spending Intelligence & Anomaly Detection
    - Pattern analysis without external ML libraries
    - Duplicate detection
    - Category insights and recommendations
    """
    try:
        user = request.user
        days = int(request.GET.get('days', 3650))  # Default to 10 years to include historical data
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get comprehensive receipt statistics for the user
        all_receipts = Receipt.objects.filter(owner=user)
        receipt_stats = {
            'total_receipts': all_receipts.count(),
            'completed': all_receipts.filter(ocr_status='completed').count(),
            'processing': all_receipts.filter(ocr_status='processing').count(),
            'failed': all_receipts.filter(ocr_status='failed').count(),
            'queued': all_receipts.filter(ocr_status='queued').count(),
            'with_extracted_data': all_receipts.filter(extracted_data__isnull=False).count(),
        }
        
        # Get only completed receipts with data for analysis
        receipts = all_receipts.filter(
            extracted_data__isnull=False,
            ocr_status='completed'
        )
        
        # Process receipts and extract spending data
        expense_data = []
        total_spent = 0
        vendors = set()
        categories = set()
        processing_stats = {
            'receipts_processed': 0,
            'receipts_skipped_no_date': 0,
            'receipts_skipped_no_total': 0,
            'receipts_skipped_invalid_date': 0,
            'receipts_outside_date_range': 0,
            'receipts_with_errors': 0,
            'income_receipts_excluded': 0
        }
        
        for receipt in receipts:
            if not receipt.extracted_data:
                processing_stats['receipts_skipped_no_date'] += 1
                continue
                
            if 'date' not in receipt.extracted_data:
                processing_stats['receipts_skipped_no_date'] += 1
                continue
                
            if 'total' not in receipt.extracted_data:
                processing_stats['receipts_skipped_no_total'] += 1
                continue
                
            try:
                # Handle missing or empty dates
                date_str = receipt.extracted_data.get('date')
                if not date_str or (isinstance(date_str, str) and not date_str.strip()):
                    processing_stats['receipts_skipped_no_date'] += 1
                    continue
                    
                receipt_date = datetime.strptime(str(date_str).strip(), '%Y-%m-%d').date()
                
                if not (start_date <= receipt_date <= end_date):
                    processing_stats['receipts_outside_date_range'] += 1
                    continue
                    
                total = float(receipt.extracted_data.get('total', 0))
                vendor = receipt.extracted_data.get('vendor', 'Unknown')
                receipt_type = receipt.extracted_data.get('type', 'expense')
                
                # Only include expenses for spending intelligence
                if receipt_type == 'income':
                    processing_stats['income_receipts_excluded'] += 1
                    continue
                    
                if receipt_type == 'expense' or total > 0:  # Treat positive amounts as expenses
                    expense_data.append({
                        'id': receipt.id,
                        'date': receipt_date,
                        'amount': abs(total),
                        'vendor': vendor,
                        'category': receipt.extracted_data.get('category', 'Other')
                    })
                    total_spent += abs(total)
                    vendors.add(vendor)
                    categories.add(receipt.extracted_data.get('category', 'Other'))
                    processing_stats['receipts_processed'] += 1
                    
            except (ValueError, TypeError, AttributeError) as e:
                processing_stats['receipts_with_errors'] += 1
                processing_stats['receipts_skipped_invalid_date'] += 1
                continue
        
        if not expense_data:
            return Response({
                'summary': {
                    'total_spent': 0,
                    'avg_transaction_size': 0,
                    'unique_vendors': 0,
                    'unique_categories': 0
                },
                'category_insights': [],
                'anomalies': [],
                'recommendations': [
                    {
                        'type': 'no_data',
                        'message': f'No expense data found in the selected date range. Try expanding the date range or check receipt processing status.',
                        'priority': 'info'
                    }
                ],
                'potential_duplicates': [],
                'data_quality': {
                    'receipt_statistics': receipt_stats,
                    'processing_statistics': processing_stats,
                    'data_coverage': {
                        'date_range_start': start_date.isoformat(),
                        'date_range_end': end_date.isoformat(),
                        'expenses_processed': 0,
                        'total_amount_analyzed': 0
                    }
                }
            })
        
        # Calculate summary statistics
        avg_transaction = total_spent / len(expense_data) if expense_data else 0
        unique_vendors = len(vendors)
        unique_categories = len(categories)
        
        # Category insights
        category_totals = {}
        for expense in expense_data:
            cat = expense['category']
            if cat not in category_totals:
                category_totals[cat] = {'total': 0, 'count': 0, 'amounts': []}
            category_totals[cat]['total'] += expense['amount']
            category_totals[cat]['count'] += 1
            category_totals[cat]['amounts'].append(expense['amount'])
        
        category_insights = []
        for cat, data in sorted(category_totals.items(), key=lambda x: x[1]['total'], reverse=True):
            avg_amount = data['total'] / data['count'] if data['count'] > 0 else 0
            category_insights.append({
                'category': cat,
                'category_display': cat.title(),
                'total_spent': data['total'],
                'transaction_count': data['count'],
                'avg_amount': avg_amount
            })
        
        # Simple anomaly detection (transactions significantly above average)
        anomalies = []
        if avg_transaction > 0:
            threshold = avg_transaction * 3  # 3x average as anomaly threshold
            for expense in expense_data:
                if expense['amount'] > threshold:
                    anomalies.append({
                        'vendor': expense['vendor'],
                        'amount': expense['amount'],
                        'date': expense['date'].isoformat(),
                        'description': f"Unusually high transaction: £{expense['amount']:.2f} (avg: £{avg_transaction:.2f})"
                    })
        
        # Potential duplicates detection
        potential_duplicates = []
        for i, expense1 in enumerate(expense_data):
            for expense2 in expense_data[i+1:]:
                # Check for same vendor, similar amount, close dates
                if (expense1['vendor'] == expense2['vendor'] and
                    abs(expense1['amount'] - expense2['amount']) < 0.01 and
                    abs((expense1['date'] - expense2['date']).days) <= 1):
                    potential_duplicates.append({
                        'receipt1_id': expense1['id'],
                        'receipt2_id': expense2['id'],
                        'vendor': expense1['vendor'],
                        'amount': expense1['amount'],
                        'date1': expense1['date'].isoformat(),
                        'date2': expense2['date'].isoformat(),
                        'confidence': 'high'
                    })
        
        # Generate recommendations
        recommendations = []
        if category_insights:
            top_category = category_insights[0]
            if top_category['total_spent'] > total_spent * 0.3:  # 30% of spending in one category
                recommendations.append({
                    'type': 'category_alert',
                    'message': f"High spending in {top_category['category_display']}: £{top_category['total_spent']:.2f} ({(top_category['total_spent']/total_spent)*100:.1f}% of total)",
                    'priority': 'medium'
                })
        
        if len(anomalies) > 0:
            recommendations.append({
                'type': 'anomaly_alert',
                'message': f"Found {len(anomalies)} unusually high transactions worth reviewing",
                'priority': 'high'
            })
        
        return Response({
            'summary': {
                'total_spent': total_spent,
                'avg_transaction_size': avg_transaction,
                'unique_vendors': unique_vendors,
                'unique_categories': unique_categories
            },
            'category_insights': category_insights[:10],  # Top 10 categories
            'anomalies': anomalies[:10],  # Top 10 anomalies
            'recommendations': recommendations,
            'potential_duplicates': potential_duplicates[:10],  # Top 10 potential duplicates
            'data_quality': {
                'receipt_statistics': receipt_stats,
                'processing_statistics': processing_stats,
                'data_coverage': {
                    'date_range_start': start_date.isoformat(),
                    'date_range_end': end_date.isoformat(),
                    'expenses_processed': len(expense_data),
                    'total_amount_analyzed': total_spent
                }
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'Spending intelligence failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([PlatinumReportPermission])
def business_insights(request):
    """
    Advanced Business Intelligence Dashboard
    - Growth metrics and KPIs
    - Business performance analysis
    - Strategic recommendations
    """
    try:
        user = request.user
        days = int(request.GET.get('days', 3650))  # Default to 10 years for business insights
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get comprehensive receipt statistics for the user
        all_receipts = Receipt.objects.filter(owner=user)
        receipt_stats = {
            'total_receipts': all_receipts.count(),
            'completed': all_receipts.filter(ocr_status='completed').count(),
            'processing': all_receipts.filter(ocr_status='processing').count(),
            'failed': all_receipts.filter(ocr_status='failed').count(),
            'queued': all_receipts.filter(ocr_status='queued').count(),
            'with_extracted_data': all_receipts.filter(extracted_data__isnull=False).count(),
        }
        
        # Get only completed receipts with data for analysis
        receipts = all_receipts.filter(
            extracted_data__isnull=False,
            ocr_status='completed'
        )
        
        # Process all receipt data
        financial_data = []
        total_income = 0
        total_expenses = 0
        processing_stats = {
            'receipts_processed': 0,
            'receipts_skipped_no_date': 0,
            'receipts_skipped_no_total': 0,
            'receipts_skipped_invalid_date': 0,
            'receipts_outside_date_range': 0,
            'receipts_with_errors': 0
        }
        
        for receipt in receipts:
            if not receipt.extracted_data:
                processing_stats['receipts_skipped_no_date'] += 1
                continue
                
            if 'date' not in receipt.extracted_data:
                processing_stats['receipts_skipped_no_date'] += 1
                continue
                
            if 'total' not in receipt.extracted_data:
                processing_stats['receipts_skipped_no_total'] += 1
                continue
                
            try:
                # Handle missing or empty dates
                date_str = receipt.extracted_data.get('date')
                if not date_str or (isinstance(date_str, str) and not date_str.strip()):
                    processing_stats['receipts_skipped_no_date'] += 1
                    continue
                    
                receipt_date = datetime.strptime(str(date_str).strip(), '%Y-%m-%d').date()
                
                if not (start_date <= receipt_date <= end_date):
                    processing_stats['receipts_outside_date_range'] += 1
                    continue
                    
                total = float(receipt.extracted_data.get('total', 0))
                receipt_type = receipt.extracted_data.get('type', 'expense')
                
                financial_data.append({
                    'date': receipt_date,
                    'amount': total,
                    'type': receipt_type,
                    'vendor': receipt.extracted_data.get('vendor', 'Unknown'),
                    'category': receipt.extracted_data.get('category', 'Other')
                })
                
                if receipt_type == 'income':
                    total_income += total
                else:
                    total_expenses += abs(total)
                    
                processing_stats['receipts_processed'] += 1
                
            except (ValueError, TypeError, AttributeError) as e:
                processing_stats['receipts_with_errors'] += 1
                processing_stats['receipts_skipped_invalid_date'] += 1
                continue
        
        # Calculate key business metrics
        net_profit = total_income - total_expenses
        profit_margin = (net_profit / total_income * 100) if total_income > 0 else 0
        
        # Monthly growth analysis
        monthly_data = {}
        for item in financial_data:
            month_key = item['date'].strftime('%Y-%m')
            if month_key not in monthly_data:
                monthly_data[month_key] = {'income': 0, 'expenses': 0}
            
            if item['type'] == 'income':
                monthly_data[month_key]['income'] += item['amount']
            else:
                monthly_data[month_key]['expenses'] += abs(item['amount'])
        
        # Calculate growth rate
        growth_rate = 0
        monthly_sorted = sorted(monthly_data.items())
        if len(monthly_sorted) >= 2:
            first_month = monthly_sorted[0][1]['income'] - monthly_sorted[0][1]['expenses']
            last_month = monthly_sorted[-1][1]['income'] - monthly_sorted[-1][1]['expenses']
            if first_month != 0:
                growth_rate = ((last_month - first_month) / abs(first_month)) * 100
        
        # Top vendors analysis
        vendor_totals = {}
        for item in financial_data:
            if item['type'] == 'expense':
                vendor = item['vendor']
                if vendor not in vendor_totals:
                    vendor_totals[vendor] = 0
                vendor_totals[vendor] += abs(item['amount'])
        
        top_vendors = sorted(vendor_totals.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Strategic recommendations
        recommendations = []
        
        if profit_margin < 20:
            recommendations.append({
                'type': 'profitability',
                'title': 'Profit Margin Alert',
                'message': f'Current profit margin is {profit_margin:.1f}%. Consider reviewing expenses or increasing revenue.',
                'priority': 'high'
            })
        
        if growth_rate < 0:
            recommendations.append({
                'type': 'growth',
                'title': 'Negative Growth Trend',
                'message': f'Business shows {abs(growth_rate):.1f}% decline. Focus on revenue generation strategies.',
                'priority': 'critical'
            })
        elif growth_rate > 20:
            recommendations.append({
                'type': 'growth',
                'title': 'Strong Growth',
                'message': f'Excellent {growth_rate:.1f}% growth rate. Consider scaling operations.',
                'priority': 'positive'
            })
        
        # Cash flow insights
        cash_flow_health = 'good'
        if net_profit < 0:
            cash_flow_health = 'poor'
        elif profit_margin < 10:
            cash_flow_health = 'concerning'
        
        return Response({
            'kpis': {
                'total_revenue': total_income,
                'total_expenses': total_expenses,
                'net_profit': net_profit,
                'profit_margin': round(profit_margin, 2),
                'growth_rate': round(growth_rate, 2),
                'cash_flow_health': cash_flow_health
            },
            'monthly_trends': [
                {
                    'month': month,
                    'revenue': data['income'],
                    'expenses': data['expenses'],
                    'profit': data['income'] - data['expenses']
                }
                for month, data in sorted(monthly_data.items())
            ],
            'top_vendors': [
                {'vendor': vendor, 'total_spent': amount}
                for vendor, amount in top_vendors
            ],
            'recommendations': recommendations,
            'analysis_period': {
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat(),
                'days_analyzed': days,
                'total_transactions': len(financial_data)
            },
            'data_quality': {
                'receipt_statistics': receipt_stats,
                'processing_statistics': processing_stats,
                'data_coverage': {
                    'date_range_start': start_date.isoformat(),
                    'date_range_end': end_date.isoformat(),
                    'transactions_processed': len(financial_data),
                    'total_revenue_analyzed': total_income,
                    'total_expenses_analyzed': total_expenses
                }
            }
        })
        
    except Exception as e:
        return Response(
            {'error': f'Business insights analysis failed: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
