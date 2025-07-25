"""
Subscription URLs for Smart Accounting
Defines URL patterns for subscription management and Stripe integration.
"""

from django.urls import path, include
from . import views

app_name = 'subscriptions'

# API endpoints
api_patterns = [
    # Subscription management
    path('checkout/', views.create_checkout_session, name='create_checkout'),
    path('details/', views.get_subscription_details, name='get_details'),
    path('cancel/', views.cancel_subscription, name='cancel_subscription'),
    path('change-plan/', views.change_subscription_plan, name='change_plan'),
    path('customer-portal/', views.get_customer_portal_url, name='customer_portal'),
    path('payment-history/', views.get_payment_history, name='payment_history'),
    path('plans/', views.get_subscription_plans, name='get_plans'),
    path('process-success/', views.process_checkout_success, name='process_success'),
    
    # Health check
    path('health/', views.subscription_health_check, name='health_check'),
]

# Frontend integration
frontend_patterns = [
    path('success/', views.SubscriptionSuccessView.as_view(), name='success_page'),
    path('cancel/', views.SubscriptionCancelView.as_view(), name='cancel_page'),
]

# Webhook endpoint
webhook_patterns = [
    path('webhook/', views.stripe_webhook, name='stripe_webhook'),
    path('webhook/dev/', views.stripe_webhook_dev, name='stripe_webhook_dev'),
]

urlpatterns = [
    # API endpoints (with /api/ prefix when included in main urls.py)
    path('api/', include(api_patterns)),
    
    # Frontend pages
    path('', include(frontend_patterns)),
    
    # Webhook endpoint
    path('', include(webhook_patterns)),
]
