from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    # List and create reports
    path('', views.ReportListCreateView.as_view(), name='report-list-create'),
    
    # Report detail
    path('<int:pk>/', views.ReportDetailView.as_view(), name='report-detail'),
    
    # Report status check
    path('<int:pk>/status/', views.report_status, name='report-status'),
    
    # Download report
    path('<int:pk>/download/', views.download_report, name='report-download'),
    
    # Get available report types and formats
    path('types/', views.report_types, name='report-types'),
]