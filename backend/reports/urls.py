"""
URL patterns for the financial reports app
"""

from django.urls import path
from . import views
from . import enhanced_analytics_views

urlpatterns = [
    # Summary endpoint
    path('summary/', views.report_summary, name='report_summary'),
    
    # Individual report endpoints
    path('income-expense/', views.income_vs_expense_report, name='income_vs_expense_report'),
    path('category-breakdown/', views.category_breakdown_report, name='category_breakdown_report'),
    path('tax-deductible/', views.tax_deductible_report, name='tax_deductible_report'),
    path('vendor-analysis/', views.vendor_analysis_report, name='vendor_analysis_report'),
    path('audit-log/', views.audit_log_report, name='audit_log_report'),
    
    # Enhanced Analytics endpoints (Premium+)
    path('predictive-cash-flow/', enhanced_analytics_views.predictive_cash_flow, name='predictive_cash_flow'),
    path('spending-intelligence/', enhanced_analytics_views.spending_intelligence, name='spending_intelligence'),
    
    # Business Intelligence endpoints (Platinum)  
    path('business-insights/', enhanced_analytics_views.business_insights, name='business_insights'),
]
