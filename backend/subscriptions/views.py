from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.conf import settings
import stripe
import json

from .models import Subscription, PaymentHistory
from .serializers import (
    SubscriptionSerializer, PaymentHistorySerializer, SubscriptionPlanSerializer,
    CreateSubscriptionSerializer, UpdateSubscriptionSerializer, PaymentMethodSerializer
)
from .services import StripeService


class SubscriptionPlansView(APIView):
    """
    Get available subscription plans
    """
    permission_classes = [permissions.AllowAny]
    
    def get(self, request):
        """Get all available subscription plans"""
        plans = StripeService.get_available_plans()
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)


class UserSubscriptionView(APIView):
    """
    Get or manage user's current subscription
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's current subscription"""
        try:
            subscription = request.user.subscription_details
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response({
                'error': 'No subscription found',
                'has_subscription': False
            }, status=status.HTTP_404_NOT_FOUND)
    
    def post(self, request):
        """Create a new subscription"""
        serializer = CreateSubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Check if user already has a subscription
                if hasattr(request.user, 'subscription_details') and request.user.subscription_details:
                    return Response({
                        'error': 'User already has an active subscription'
                    }, status=status.HTTP_400_BAD_REQUEST)
                
                # Create subscription
                subscription, stripe_subscription = StripeService.create_subscription(
                    user=request.user,
                    plan=serializer.validated_data['plan'],
                    payment_method_id=serializer.validated_data['payment_method_id']
                )
                
                response_serializer = SubscriptionSerializer(subscription)
                return Response({
                    'subscription': response_serializer.data,
                    'stripe_subscription': {
                        'id': stripe_subscription.id,
                        'status': stripe_subscription.status,
                        'client_secret': stripe_subscription.latest_invoice.payment_intent.client_secret
                    }
                }, status=status.HTTP_201_CREATED)
                
            except Exception as e:
                return Response({
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def put(self, request):
        """Update existing subscription"""
        try:
            subscription = request.user.subscription_details
        except Subscription.DoesNotExist:
            return Response({
                'error': 'No subscription found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = UpdateSubscriptionSerializer(data=request.data)
        if serializer.is_valid():
            try:
                if 'plan' in serializer.validated_data:
                    # Update subscription plan
                    updated_subscription = StripeService.update_subscription(
                        user=request.user,
                        new_plan=serializer.validated_data['plan']
                    )
                    subscription = updated_subscription
                
                if 'cancel_at_period_end' in serializer.validated_data:
                    # Update cancellation setting
                    StripeService.cancel_subscription(
                        user=request.user,
                        at_period_end=serializer.validated_data['cancel_at_period_end']
                    )
                    subscription.refresh_from_db()
                
                response_serializer = SubscriptionSerializer(subscription)
                return Response(response_serializer.data)
                
            except Exception as e:
                return Response({
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request):
        """Cancel subscription immediately"""
        try:
            subscription = request.user.subscription_details
        except Subscription.DoesNotExist:
            return Response({
                'error': 'No subscription found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            StripeService.cancel_subscription(
                user=request.user,
                at_period_end=False
            )
            return Response({
                'message': 'Subscription cancelled successfully'
            })
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


class PaymentHistoryView(APIView):
    """
    Get user's payment history
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's payment history"""
        payments = PaymentHistory.objects.filter(user=request.user).order_by('-payment_date')
        serializer = PaymentHistorySerializer(payments, many=True)
        return Response(serializer.data)


class PaymentMethodsView(APIView):
    """
    Manage user's payment methods
    """
    permission_classes = [permissions.IsAuthenticated]
    
    def get(self, request):
        """Get user's payment methods"""
        try:
            payment_methods = StripeService.get_payment_methods(request.user)
            serializer = PaymentMethodSerializer(payment_methods, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handle Stripe webhooks
    """
    permission_classes = [permissions.AllowAny]
    
    def post(self, request):
        """Handle Stripe webhook events"""
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        try:
            # Verify webhook signature
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            # Invalid payload
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            # Invalid signature
            return HttpResponse(status=400)
        
        # Handle the event
        try:
            StripeService.handle_webhook(event)
        except Exception as e:
            # Log the error but return 200 to acknowledge receipt
            print(f"Webhook handling error: {str(e)}")
        
        return HttpResponse(status=200)


@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_setup_intent(request):
    """
    Create a Stripe Setup Intent for adding payment methods
    """
    try:
        # Get or create Stripe customer
        if not request.user.stripe_customer_id:
            customer = StripeService.create_customer(request.user)
            customer_id = customer.id
        else:
            customer_id = request.user.stripe_customer_id
        
        # Create setup intent
        intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=['card'],
        )
        
        return Response({
            'client_secret': intent.client_secret,
            'customer_id': customer_id
        })
        
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([permissions.IsAuthenticated])
def subscription_status(request):
    """
    Get detailed subscription status including usage and limits
    """
    try:
        subscription = request.user.subscription_details
        
        # Get plan details
        plan_details = StripeService.get_plan_details(subscription.plan)
        
        # TODO: Add actual usage counting from receipts/documents
        current_usage = {
            'documents_used': 0,  # Should count actual documents
            'api_calls_used': 0,  # Should count API usage if applicable
        }
        
        response_data = {
            'subscription': SubscriptionSerializer(subscription).data,
            'plan_details': plan_details,
            'current_usage': current_usage,
            'limits': {
                'max_documents': subscription.max_documents,
                'has_api_access': subscription.has_api_access,
                'has_report_export': subscription.has_report_export,
                'has_bulk_upload': subscription.has_bulk_upload,
                'has_white_label': subscription.has_white_label,
            }
        }
        
        return Response(response_data)
        
    except Subscription.DoesNotExist:
        return Response({
            'error': 'No subscription found',
            'has_subscription': False
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            'error': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)
