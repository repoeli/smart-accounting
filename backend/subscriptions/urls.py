from django.urls import path
from .views import (
    SubscriptionPlansView,
    CreateCheckoutSessionView, 
    CurrentSubscriptionView,
    PaymentHistoryView,
    StripeWebhookView
)

urlpatterns = [
    path('plans/', SubscriptionPlansView.as_view(), name='subscription-plans'),
    path('create-checkout-session/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    path('current/', CurrentSubscriptionView.as_view(), name='current-subscription'),
    path('payment-history/', PaymentHistoryView.as_view(), name='payment-history'),
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
]
