import stripe
from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subscription, PaymentHistory
from .serializers import (
    SubscriptionSerializer, 
    PaymentHistorySerializer, 
    SubscriptionCancelSerializer
)

# Configure Stripe
stripe.api_key = settings.STRIPE_API_SECRET_KEY


class SubscriptionStatusView(APIView):
    """Get current subscription status for authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            subscription = get_object_or_404(Subscription, user=request.user)
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response(
                {"error": "No subscription found for this user"},
                status=status.HTTP_404_NOT_FOUND
            )


class BillingHistoryView(APIView):
    """Get billing history for authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        payment_history = PaymentHistory.objects.filter(user=request.user)
        serializer = PaymentHistorySerializer(payment_history, many=True)
        return Response(serializer.data)


class SubscriptionCancelView(APIView):
    """Cancel subscription for authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            subscription = get_object_or_404(Subscription, user=request.user)
            serializer = SubscriptionCancelSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            cancel_at_period_end = serializer.validated_data.get('cancel_at_period_end', True)
            
            # Update subscription in Stripe
            stripe_subscription = stripe.Subscription.modify(
                subscription.stripe_subscription_id,
                cancel_at_period_end=cancel_at_period_end
            )
            
            # Update local subscription
            subscription.cancel_at_period_end = cancel_at_period_end
            if not cancel_at_period_end:
                subscription.status = Subscription.CANCELED
            subscription.save()
            
            updated_serializer = SubscriptionSerializer(subscription)
            return Response({
                "message": "Subscription cancellation updated successfully",
                "subscription": updated_serializer.data
            })
            
        except Subscription.DoesNotExist:
            return Response(
                {"error": "No subscription found for this user"},
                status=status.HTTP_404_NOT_FOUND
            )
        except stripe.error.StripeError as e:
            return Response(
                {"error": f"Stripe error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class CustomerPortalView(APIView):
    """Create Stripe customer portal session"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            subscription = get_object_or_404(Subscription, user=request.user)
            
            # Create customer portal session
            portal_session = stripe.billing_portal.Session.create(
                customer=subscription.stripe_customer_id,
                return_url=request.build_absolute_uri('/dashboard/subscription/')
            )
            
            return Response({
                "portal_url": portal_session.url
            })
            
        except Subscription.DoesNotExist:
            return Response(
                {"error": "No subscription found for this user"},
                status=status.HTTP_404_NOT_FOUND
            )
        except stripe.error.StripeError as e:
            return Response(
                {"error": f"Stripe error: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"An error occurred: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
