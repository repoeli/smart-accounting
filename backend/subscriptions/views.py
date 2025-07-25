"""
Subscription Views for Smart Accounting
Provides API endpoints for subscription management and Stripe integration.
"""

import json
import logging
from decimal import Decimal
from typing import Dict, Any

from django.conf import settings
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model
from django.http import JsonResponse, HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.views.generic import TemplateView

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from .models import Subscription, PaymentHistory
from .services.subscription_service import SubscriptionService
from .services.stripe_service import StripeService
from .utils.webhook_handler import StripeWebhookHandler

logger = logging.getLogger(__name__)

User = get_user_model()


# API Views for subscription management
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_checkout_session(request):
    """
    Create a Stripe checkout session for subscription purchase.
    
    Expected payload:
    {
        "plan_id": "basic|premium|platinum",
        "success_url": "optional custom success URL",
        "cancel_url": "optional custom cancel URL"
    }
    """
    try:
        plan_id = request.data.get('plan_id')
        if not plan_id:
            return Response(
                {'error': 'plan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate plan
        if plan_id not in StripeService.PLAN_CONFIG:
            return Response(
                {'error': f'Invalid plan_id: {plan_id}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Optional custom URLs
        success_url = request.data.get('success_url')
        cancel_url = request.data.get('cancel_url')
        
        # Create checkout session
        result = SubscriptionService.create_subscription_checkout(
            user=request.user,
            plan_id=plan_id,
            success_url=success_url,
            cancel_url=cancel_url
        )
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'success': True,
            'session_id': result['session_id'],
            'checkout_url': result['checkout_url'],
            'plan_id': result['plan_id']
        })
        
    except Exception as e:
        logger.error(f"Error creating checkout session: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subscription_details(request):
    """
    Get current user's subscription details.
    """
    try:
        subscription = SubscriptionService.get_user_subscription(request.user)
        
        if not subscription:
            return Response({
                'subscription': None,
                'features': StripeService.get_plan_features('basic')
            })
        
        # Get subscription features
        features = SubscriptionService.get_subscription_features(request.user)
        
        subscription_data = {
            'id': subscription.id,
            'plan': subscription.plan,
            'status': subscription.status,
            'amount': str(subscription.amount),
            'currency': subscription.currency,
            'current_period_start': subscription.current_period_start.isoformat(),
            'current_period_end': subscription.current_period_end.isoformat(),
            'cancel_at_period_end': subscription.cancel_at_period_end,
            'stripe_subscription_id': subscription.stripe_subscription_id,
            'created_at': subscription.created_at.isoformat(),
        }
        
        return Response({
            'subscription': subscription_data,
            'features': features
        })
        
    except Exception as e:
        logger.error(f"Error getting subscription details: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """
    Cancel user's subscription.
    
    Expected payload:
    {
        "immediate": false  // Optional, defaults to false (cancel at period end)
    }
    """
    try:
        immediate = request.data.get('immediate', False)
        
        result = SubscriptionService.cancel_user_subscription(
            user=request.user,
            immediate=immediate
        )
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'success': True,
            'subscription_id': result['subscription_id'],
            'cancelled_immediately': immediate,
            'cancel_at_period_end': result['cancel_at_period_end']
        })
        
    except Exception as e:
        logger.error(f"Error cancelling subscription: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_subscription_plan(request):
    """
    Change user's subscription plan.
    
    Expected payload:
    {
        "new_plan_id": "basic|premium|platinum"
    }
    """
    try:
        new_plan_id = request.data.get('new_plan_id')
        if not new_plan_id:
            return Response(
                {'error': 'new_plan_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = SubscriptionService.change_user_plan(
            user=request.user,
            new_plan_id=new_plan_id
        )
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # If result contains checkout URL, it means we need to go through checkout
        if 'checkout_url' in result:
            return Response({
                'requires_checkout': True,
                'checkout_url': result['checkout_url'],
                'session_id': result['session_id']
            })
        
        return Response({
            'success': True,
            'subscription_id': result['subscription_id'],
            'old_plan': result['old_plan'],
            'new_plan': result['new_plan']
        })
        
    except Exception as e:
        logger.error(f"Error changing subscription plan: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_customer_portal_url(request):
    """
    Get Stripe customer portal URL for subscription management.
    """
    try:
        return_url = request.GET.get('return_url')
        
        result = SubscriptionService.get_customer_portal_url(
            user=request.user,
            return_url=return_url
        )
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'portal_url': result['portal_url']
        })
        
    except Exception as e:
        logger.error(f"Error getting customer portal URL: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_history(request):
    """
    Get user's payment history.
    """
    try:
        payments = PaymentHistory.objects.filter(
            user=request.user
        ).order_by('-payment_date')[:50]  # Last 50 payments
        
        payment_data = []
        for payment in payments:
            payment_data.append({
                'id': payment.id,
                'amount_paid': str(payment.amount_paid),
                'currency': payment.currency,
                'status': payment.status,
                'invoice_number': payment.invoice_number,
                'invoice_pdf_url': payment.invoice_pdf_url,
                'period_start': payment.period_start.isoformat(),
                'period_end': payment.period_end.isoformat(),
                'payment_date': payment.payment_date.isoformat(),
            })
        
        return Response({
            'payments': payment_data,
            'total_count': PaymentHistory.objects.filter(user=request.user).count()
        })
        
    except Exception as e:
        logger.error(f"Error getting payment history: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def get_subscription_plans(request):
    """
    Get available subscription plans and their features.
    """
    try:
        plans = {}
        for plan_id, config in StripeService.PLAN_CONFIG.items():
            plans[plan_id] = {
                'name': config['name'],
                'price': config['price'] / 100,  # Convert from pence to pounds
                'currency': config['currency'].upper(),
                'interval': config['interval'],
                'features': config['features']
            }
        
        return Response({
            'plans': plans
        })
        
    except Exception as e:
        logger.error(f"Error getting subscription plans: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def process_checkout_success(request):
    """
    Process successful checkout completion.
    This endpoint is called after user returns from Stripe checkout.
    
    Expected payload:
    {
        "session_id": "stripe_session_id"
    }
    """
    try:
        session_id = request.data.get('session_id')
        if not session_id:
            return Response(
                {'error': 'session_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        result = SubscriptionService.process_successful_checkout(session_id)
        
        if 'error' in result:
            return Response(
                {'error': result['error']},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return Response({
            'success': True,
            'subscription_id': result['subscription_id'],
            'plan': result['plan'],
            'type': result['type']
        })
        
    except Exception as e:
        logger.error(f"Error processing checkout success: {str(e)}")
        return Response(
            {'error': 'Internal server error'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Stripe Webhook Handler
@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook_dev(request):
    """
    Development webhook endpoint that skips signature verification.
    This endpoint should ONLY be used in development mode.
    """
    if not settings.DEBUG:
        logger.error("Development webhook endpoint accessed in production mode")
        return HttpResponse(status=403)
    
    try:
        payload = request.body
        
        # Parse payload directly without signature verification
        import json
        event = json.loads(payload.decode('utf-8'))
        
        # Process the event
        result = StripeWebhookHandler.handle_webhook_event(event)
        
        # Log event summary for monitoring
        event_summary = StripeWebhookHandler.get_event_summary(event)
        logger.info(f"Dev webhook processed: {event_summary}")
        
        if result.get('status') == 'error':
            logger.error(f"Dev webhook processing error: {result.get('message')}")
            return HttpResponse(status=500)
        
        return HttpResponse(status=200)
        
    except Exception as e:
        logger.error(f"Unexpected dev webhook error: {str(e)}")
        return HttpResponse(status=500)


@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook(request):
    """
    Handle Stripe webhook events.
    This endpoint receives and processes webhook events from Stripe.
    """
    try:
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        # Development mode: If no webhook secret configured, skip signature verification
        if not settings.STRIPE_WEBHOOK_SECRET:
            logger.warning("Webhook signature verification skipped - no webhook secret configured")
            try:
                import json
                event = json.loads(payload.decode('utf-8'))
            except Exception as e:
                logger.error(f"Failed to parse webhook payload: {str(e)}")
                return HttpResponse(status=400)
        else:
            # Production mode: Verify webhook signature
            if not sig_header:
                logger.error("Missing Stripe signature header")
                return HttpResponse(status=400)
        
            try:
                # Validate webhook signature and construct event
                event = StripeService.validate_webhook_signature(
                    payload=payload,
                    sig_header=sig_header,
                    endpoint_secret=settings.STRIPE_WEBHOOK_SECRET
                )
            except Exception as e:
                logger.error(f"Webhook signature verification failed: {str(e)}")
                return HttpResponse(status=400)
        
        # Process the event
        result = StripeWebhookHandler.handle_webhook_event(event)
        
        # Log event summary for monitoring
        event_summary = StripeWebhookHandler.get_event_summary(event)
        logger.info(f"Webhook processed: {event_summary}")
        
        if result.get('status') == 'error':
            logger.error(f"Webhook processing error: {result.get('message')}")
            return HttpResponse(status=500)
        
        return HttpResponse(status=200)
        
    except Exception as e:
        logger.error(f"Unexpected webhook error: {str(e)}")
        return HttpResponse(status=500)


# Frontend Integration Views
class SubscriptionSuccessView(TemplateView):
    """
    Success page after subscription purchase.
    This can be customized based on your frontend needs.
    """
    template_name = 'subscriptions/success.html'
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        session_id = self.request.GET.get('session_id')
        
        if session_id:
            try:
                # Process the successful checkout
                result = SubscriptionService.process_successful_checkout(session_id)
                context['checkout_result'] = result
            except Exception as e:
                logger.error(f"Error processing checkout in success view: {str(e)}")
                context['error'] = str(e)
        
        return context


class SubscriptionCancelView(TemplateView):
    """
    Cancel page after subscription purchase cancellation.
    """
    template_name = 'subscriptions/cancel.html'


# Health check endpoint
@api_view(['GET'])
@permission_classes([AllowAny])
def subscription_health_check(request):
    """
    Health check endpoint for subscription service.
    """
    try:
        # Check if Stripe keys are configured
        stripe_configured = bool(
            settings.STRIPE_API_SECRET_KEY and 
            settings.STRIPE_API_PUBLISHABLE_KEY
        )
        
        # Check database connectivity
        subscription_count = Subscription.objects.count()
        
        return Response({
            'status': 'healthy',
            'stripe_configured': stripe_configured,
            'database_connected': True,
            'subscription_count': subscription_count,
            'timestamp': request.build_absolute_uri()
        })
        
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return Response(
            {
                'status': 'unhealthy',
                'error': str(e)
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
