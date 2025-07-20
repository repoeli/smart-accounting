from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import AsyncReceiptViewSet, TransactionViewSet, CategoryViewSet, ReportViewSet

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'receipts', AsyncReceiptViewSet, basename='receipt')
router.register(r'transactions', TransactionViewSet, basename='transaction')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'reports', ReportViewSet, basename='report')

# URL patterns for the receipts app
urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
]
