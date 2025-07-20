from django.urls import path
from . import views

app_name = 'subscriptions'

urlpatterns = [
    # Subscription management
    path('plans/', views.SubscriptionPlansView.as_view(), name='subscription-plans'),
    path('subscription/', views.UserSubscriptionView.as_view(), name='user-subscription'),
    path('subscription/status/', views.subscription_status, name='subscription-status'),
    
    # Payment management
    path('payment-history/', views.PaymentHistoryView.as_view(), name='payment-history'),
    path('payment-methods/', views.PaymentMethodsView.as_view(), name='payment-methods'),
    path('setup-intent/', views.create_setup_intent, name='create-setup-intent'),
    
    # Stripe webhooks
    path('webhooks/stripe/', views.StripeWebhookView.as_view(), name='stripe-webhook'),
]
