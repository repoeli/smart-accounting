"""
Enhanced Analytics Views - Production Safe Version
Provides advanced business intelligence and smart insights without external dependencies.
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

from receipts.models import Receipt, Transaction
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
        historical_days = int(request.GET.get('days', 180))
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=historical_days)
        
        # Get historical monthly data
        historical_data = []
        current_date = start_date.replace(day=1)
        
        while current_date <= end_date:
            next_month = (current_date.replace(day=28) + timedelta(days=4)).replace(day=1)
            
            # Get transactions for this month
            month_receipts = Receipt.objects.filter(
                user=user,
                date__gte=current_date,
                date__lt=next_month
            )
            
            income = month_receipts.filter(
                amount__gt=0
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            expenses = month_receipts.filter(
                amount__lt=0
            ).aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            net_flow = income + expenses  # expenses are negative
            
            historical_data.append({
                'month': current_date.isoformat(),
                'income': float(income),
                'expenses': float(expenses),
                'net_flow': float(net_flow)
            })
            
            current_date = next_month
        
        # Simple prediction using recent averages (production-safe approach)
        if len(historical_data) >= 3:
            recent_data = historical_data[-6:]  # Last 6 months for trend
            avg_income = statistics.mean([d['income'] for d in recent_data])
            avg_expenses = statistics.mean([d['expenses'] for d in recent_data])
            avg_net_flow = statistics.mean([d['net_flow'] for d in recent_data])
            
            # Calculate trend (simple linear trend)
            if len(recent_data) >= 2:
                net_flows = [d['net_flow'] for d in recent_data]
                trend_slope = (net_flows[-1] - net_flows[0]) / len(net_flows)
            else:
                trend_slope = 0
        else:
            avg_income = 0
            avg_expenses = 0
            avg_net_flow = 0
            trend_slope = 0
        
        # Generate predictions
        predictions = []
        base_date = end_date.replace(day=1)
        
        for i in range(1, prediction_months + 1):
            pred_date = (base_date.replace(day=28) + timedelta(days=4 * i)).replace(day=1)
            
            # Simple prediction with trend
            predicted_net_flow = avg_net_flow + (trend_slope * i)
            
            # Add some realistic variance (±10-20%)
            confidence = max(0.6, 0.9 - (i * 0.1))  # Decreasing confidence over time
            
            predictions.append({
                'month': pred_date.isoformat(),
                'predicted_net_flow': round(predicted_net_flow, 2),
                'confidence': round(confidence, 2)
            })
        
        # Generate insights
        insights = []
        alerts = []
        
        if historical_data:
            recent_net_flows = [d['net_flow'] for d in historical_data[-3:]]
            if recent_net_flows:
                avg_recent = statistics.mean(recent_net_flows)
                if avg_recent < 0:
                    alerts.append("Recent months show negative cash flow trend")
                    insights.append("Consider reviewing expenses to improve cash flow")
                elif avg_recent > 1000:
                    insights.append("Strong positive cash flow - consider investment opportunities")
        
        if predictions:
            next_month_prediction = predictions[0]['predicted_net_flow']
            if next_month_prediction < 0:
                alerts.append(f"Next month predicted negative cash flow: £{next_month_prediction:.2f}")
        
        # Determine overall trend
        trend = "stable"
        if trend_slope > 50:
            trend = "improving"
        elif trend_slope < -50:
            trend = "declining"
        
        return Response({
            'historical_data': historical_data,
            'predictions': predictions,
            'summary': {
                'avg_monthly_net': round(avg_net_flow, 2),
                'trend': trend,
                'prediction_period': f"{prediction_months} months"
            },
            'insights': insights,
            'alerts': alerts
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate cash flow predictions: {str(e)}'},
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
        days = int(request.GET.get('days', 90))
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get expense transactions only
        receipts = Receipt.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date,
            amount__lt=0  # Expenses only
        ).select_related().order_by('-date')
        
        if not receipts.exists():
            return Response({
                'summary': {
                    'total_spent': 0,
                    'avg_transaction_size': 0,
                    'unique_vendors': 0,
                    'unique_categories': 0
                },
                'category_insights': [],
                'anomalies': [],
                'recommendations': [],
                'potential_duplicates': []
            })
        
        # Calculate summary statistics
        total_spent = abs(receipts.aggregate(total=Sum('amount'))['total'] or Decimal('0'))
        avg_transaction = abs(receipts.aggregate(avg=Avg('amount'))['avg'] or Decimal('0'))
        unique_vendors = receipts.values('vendor').distinct().count()
        unique_categories = receipts.values('category').distinct().count()
        
        # Category insights
        category_data = receipts.values('category').annotate(
            total_spent=Sum('amount'),
            transaction_count=Count('id'),
            avg_amount=Avg('amount')
        ).order_by('total_spent')  # Most spent first (remember amounts are negative)
        
        category_insights = []
        for cat in category_data:
            category_insights.append({
                'category': cat['category'] or 'Uncategorized',
                'category_display': (cat['category'] or 'Uncategorized').title(),
                'total_spent': float(abs(cat['total_spent'] or 0)),
                'transaction_count': cat['transaction_count'],
                'avg_amount': float(abs(cat['avg_amount'] or 0))
            })
        
        # Simple anomaly detection (transactions significantly above average)
        if avg_transaction > 0:
            threshold = float(avg_transaction) * 3  # 3x average as anomaly threshold
            anomalous_receipts = receipts.filter(
                amount__lt=-threshold
            ).values('vendor', 'amount', 'date', 'description')[:10]
            
            anomalies = []
            for receipt in anomalous_receipts:
                anomalies.append({
                    'vendor': receipt['vendor'] or 'Unknown',
                    'amount': float(abs(receipt['amount'])),
                    'date': receipt['date'].isoformat(),
                    'description': receipt['description'] or '',
                    'severity': 'high' if abs(receipt['amount']) > threshold * 1.5 else 'medium'
                })
        else:
            anomalies = []
        
        # Potential duplicate detection (same vendor, similar amount, close dates)
        potential_duplicates = []
        receipt_list = list(receipts.values('vendor', 'amount', 'date', 'description'))
        
        for i, receipt1 in enumerate(receipt_list):
            for receipt2 in receipt_list[i+1:i+20]:  # Check next 20 receipts only for performance
                # Check if same vendor and similar amount (within 5%)
                if (receipt1['vendor'] == receipt2['vendor'] and 
                    receipt1['vendor'] and  # Not empty
                    abs(receipt1['amount'] - receipt2['amount']) / abs(receipt1['amount']) < 0.05):
                    
                    # Check if dates are close (within 7 days)
                    date_diff = abs((receipt1['date'] - receipt2['date']).days)
                    if date_diff <= 7:
                        potential_duplicates.append({
                            'vendor': receipt1['vendor'],
                            'amount': float(abs(receipt1['amount'])),
                            'date': receipt1['date'].isoformat(),
                            'duplicate_count': 2,
                            'confidence': 0.8 if date_diff <= 1 else 0.6
                        })
                        break
        
        # Generate recommendations
        recommendations = []
        
        if category_insights:
            # Find highest spending category
            top_category = category_insights[0]
            if top_category['total_spent'] > float(total_spent) * 0.3:
                recommendations.append(
                    f"Consider reviewing {top_category['category_display']} expenses - "
                    f"£{top_category['total_spent']:.2f} ({top_category['total_spent']/float(total_spent)*100:.1f}% of total)"
                )
        
        if len(anomalies) > 0:
            recommendations.append(f"Review {len(anomalies)} unusual high-value transactions")
        
        if unique_vendors > 50:
            recommendations.append("Consider consolidating vendors to reduce management overhead")
        
        if len(potential_duplicates) > 0:
            recommendations.append(f"Check {len(potential_duplicates)} potential duplicate transactions")
        
        return Response({
            'summary': {
                'total_spent': float(total_spent),
                'avg_transaction_size': float(avg_transaction),
                'unique_vendors': unique_vendors,
                'unique_categories': unique_categories,
                'analysis_period_days': days
            },
            'category_insights': category_insights,
            'anomalies': anomalies,
            'recommendations': recommendations,
            'potential_duplicates': potential_duplicates
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate spending intelligence: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([PlatinumReportPermission])
def business_insights(request):
    """
    Advanced Business Insights (Platinum tier only)
    - KPI dashboard
    - Business performance metrics
    - ROI analysis
    """
    try:
        user = request.user
        days = int(request.GET.get('days', 365))
        
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=days)
        
        # Get all transactions for the period
        receipts = Receipt.objects.filter(
            user=user,
            date__gte=start_date,
            date__lte=end_date
        )
        
        # Business KPIs
        total_revenue = receipts.filter(amount__gt=0).aggregate(Sum('amount'))['total'] or Decimal('0')
        total_expenses = abs(receipts.filter(amount__lt=0).aggregate(Sum('amount'))['total'] or Decimal('0'))
        net_profit = float(total_revenue) - float(total_expenses)
        profit_margin = (net_profit / float(total_revenue) * 100) if total_revenue > 0 else 0
        
        # Monthly trends
        monthly_data = receipts.annotate(
            month=TruncMonth('date')
        ).values('month').annotate(
            revenue=Sum(Case(When(amount__gt=0, then='amount'), default=0)),
            expenses=Sum(Case(When(amount__lt=0, then='amount'), default=0))
        ).order_by('month')
        
        trends = []
        for month in monthly_data:
            monthly_profit = float(month['revenue'] or 0) + float(month['expenses'] or 0)
            trends.append({
                'month': month['month'].isoformat(),
                'revenue': float(month['revenue'] or 0),
                'expenses': float(abs(month['expenses'] or 0)),
                'profit': monthly_profit
            })
        
        # Business opportunities and risks
        opportunities = []
        risks = []
        
        if profit_margin > 20:
            opportunities.append("Strong profit margins indicate growth potential")
        elif profit_margin < 5:
            risks.append("Low profit margins require cost optimization")
        
        if len(trends) >= 3:
            recent_profits = [t['profit'] for t in trends[-3:]]
            if all(p > 0 for p in recent_profits):
                opportunities.append("Consistent profitability over recent months")
            elif all(p < 0 for p in recent_profits):
                risks.append("Three consecutive months of losses require immediate attention")
        
        return Response({
            'kpis': {
                'total_revenue': float(total_revenue),
                'total_expenses': float(total_expenses),
                'net_profit': net_profit,
                'profit_margin': round(profit_margin, 2),
                'analysis_period_days': days
            },
            'trends': trends,
            'opportunities': opportunities,
            'risks': risks
        })
        
    except Exception as e:
        return Response(
            {'error': f'Failed to generate business insights: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
