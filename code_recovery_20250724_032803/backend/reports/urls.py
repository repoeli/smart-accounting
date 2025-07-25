"""
URL patterns for the financial reports app
"""

from django.urls import path
from . import views

urlpatterns = [
    # Summary endpoint
    path('summary/', views.report_summary, name='report_summary'),
    
    # Individual report endpoints
    path('income-expense/', views.income_vs_expense_report, name='income_vs_expense_report'),
    path('category-breakdown/', views.category_breakdown_report, name='category_breakdown_report'),
    path('tax-deductible/', views.tax_deductible_report, name='tax_deductible_report'),
    path('vendor-analysis/', views.vendor_analysis_report, name='vendor_analysis_report'),
    path('audit-log/', views.audit_log_report, name='audit_log_report'),
]
