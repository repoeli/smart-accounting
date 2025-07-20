from django.urls import path
from .views import (
    SubscriptionPlansView,
    CreateCheckoutSessionView,
    UserSubscriptionView,
    StripeWebhookView,
)

urlpatterns = [
    # Get available subscription plans
    path('plans/', SubscriptionPlansView.as_view(), name='subscription-plans'),
    
    # Create Stripe checkout session
    path('checkout/', CreateCheckoutSessionView.as_view(), name='create-checkout-session'),
    
    # Get user's current subscription
    path('status/', UserSubscriptionView.as_view(), name='user-subscription'),
    
    # Stripe webhook endpoint
    path('webhook/', StripeWebhookView.as_view(), name='stripe-webhook'),
]
