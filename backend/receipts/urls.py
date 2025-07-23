from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import ReceiptViewSet, TransactionViewSet

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'', ReceiptViewSet, basename='receipt')  # Remove 'receipts' prefix
router.register(r'transactions', TransactionViewSet, basename='transaction')

# URL patterns for the receipts app
urlpatterns = [
    # Include the router URLs
    path('', include(router.urls)),
]
