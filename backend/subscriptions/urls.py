from django.urls import path
from .views import (
    SubscriptionDetailView,
    PaymentHistoryListView,
    CustomerPortalView,
    cancel_subscription
)
from .webhooks import stripe_webhook

urlpatterns = [
    # Subscription management endpoints
    path('', SubscriptionDetailView.as_view(), name='subscription-detail'),
    path('payments/', PaymentHistoryListView.as_view(), name='payment-history'),
    path('customer-portal/', CustomerPortalView.as_view(), name='customer-portal'),
    path('cancel/', cancel_subscription, name='cancel-subscription'),
    
    # Webhook endpoint
    path('webhooks/stripe/', stripe_webhook, name='stripe-webhook'),
]
