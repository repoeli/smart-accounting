from django.urls import path
from . import views

urlpatterns = [
    path('status/', views.SubscriptionStatusView.as_view(), name='subscription-status'),
    path('billing-history/', views.BillingHistoryView.as_view(), name='billing-history'),
    path('cancel/', views.SubscriptionCancelView.as_view(), name='subscription-cancel'),
    path('customer-portal/', views.CustomerPortalView.as_view(), name='customer-portal'),
]
