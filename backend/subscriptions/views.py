import stripe
from django.conf import settings
from django.http import Http404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Subscription, PaymentHistory
from .serializers import (
    SubscriptionSerializer, 
    PaymentHistorySerializer, 
    CustomerPortalLinkSerializer
)

# Configure Stripe
stripe.api_key = settings.STRIPE_API_SECRET_KEY


class SubscriptionDetailView(APIView):
    """
    Retrieve the current user's subscription details
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            subscription = Subscription.objects.get(user=request.user)
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response({
                'detail': 'No active subscription found'
            }, status=status.HTTP_404_NOT_FOUND)


class PaymentHistoryListView(APIView):
    """
    Retrieve the current user's payment history
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        payments = PaymentHistory.objects.filter(user=request.user)
        serializer = PaymentHistorySerializer(payments, many=True)
        return Response(serializer.data)


class CustomerPortalView(APIView):
    """
    Generate a link to the Stripe customer portal for subscription management
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Get user's subscription to find their Stripe customer ID
            subscription = Subscription.objects.get(user=request.user)
            
            if not subscription.stripe_customer_id:
                return Response({
                    'error': 'No Stripe customer ID found for this user'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            # Create the customer portal session
            session = stripe.billing_portal.Session.create(
                customer=subscription.stripe_customer_id,
                return_url=request.build_absolute_uri('/subscription/'),
            )
            
            serializer = CustomerPortalLinkSerializer({'url': session.url})
            return Response(serializer.data)
            
        except Subscription.DoesNotExist:
            return Response({
                'error': 'No subscription found for this user'
            }, status=status.HTTP_404_NOT_FOUND)
            
        except stripe.error.StripeError as e:
            return Response({
                'error': f'Stripe error: {str(e)}'
            }, status=status.HTTP_400_BAD_REQUEST)
            
        except Exception as e:
            return Response({
                'error': f'An error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def cancel_subscription(request):
    """
    Cancel the user's subscription at the end of the current billing period
    """
    try:
        subscription = Subscription.objects.get(user=request.user)
        
        if not subscription.stripe_subscription_id:
            return Response({
                'error': 'No Stripe subscription ID found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the subscription to cancel at period end
        stripe_subscription = stripe.Subscription.modify(
            subscription.stripe_subscription_id,
            cancel_at_period_end=True
        )
        
        # Update our local subscription model
        subscription.cancel_at_period_end = True
        subscription.save()
        
        return Response({
            'message': 'Subscription will be cancelled at the end of the current billing period',
            'cancel_at_period_end': True,
            'current_period_end': subscription.current_period_end
        })
        
    except Subscription.DoesNotExist:
        return Response({
            'error': 'No subscription found for this user'
        }, status=status.HTTP_404_NOT_FOUND)
        
    except stripe.error.StripeError as e:
        return Response({
            'error': f'Stripe error: {str(e)}'
        }, status=status.HTTP_400_BAD_REQUEST)
        
    except Exception as e:
        return Response({
            'error': f'An error occurred: {str(e)}'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
