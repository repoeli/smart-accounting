import stripe
import json
import logging
from decimal import Decimal
from django.conf import settings
from django.http import HttpResponse
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt
from rest_framework import status, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Subscription, PaymentHistory
from .serializers import (
    SubscriptionPlanSerializer, SubscriptionSerializer,
    CheckoutSessionSerializer, CheckoutSessionResponseSerializer,
    PaymentHistorySerializer
)

# Configure Stripe
stripe.api_key = settings.STRIPE_API_SECRET_KEY
logger = logging.getLogger(__name__)


class SubscriptionPlansView(APIView):
    """
    Get available subscription plans with pricing
    """
    permission_classes = [permissions.AllowAny]

    @swagger_auto_schema(
        operation_description="Get available subscription plans",
        responses={200: SubscriptionPlanSerializer(many=True)}
    )
    def get(self, request):
        plans = [
            {
                'plan_id': 'basic',
                'name': 'Basic',
                'price': Decimal('9.99'),
                'currency': 'GBP',
                'interval': 'month',
                'features': [
                    'Up to 50 receipts per month',
                    '1GB storage',
                    'Basic reporting',
                    'Email support'
                ],
                'max_documents': 50,
                'has_api_access': False,
                'has_report_export': False,
                'has_bulk_upload': False,
                'has_white_label': False,
                'recommended': False
            },
            {
                'plan_id': 'premium',
                'name': 'Premium', 
                'price': Decimal('19.99'),
                'currency': 'GBP',
                'interval': 'month',
                'features': [
                    'Up to 200 receipts per month',
                    '5GB storage',
                    'Advanced reporting',
                    'Report export (PDF/Excel)',
                    'API access',
                    'Priority support'
                ],
                'max_documents': 200,
                'has_api_access': True,
                'has_report_export': True,
                'has_bulk_upload': False,
                'has_white_label': False,
                'recommended': True
            },
            {
                'plan_id': 'platinum',
                'name': 'Platinum',
                'price': Decimal('49.99'),
                'currency': 'GBP', 
                'interval': 'month',
                'features': [
                    'Unlimited receipts',
                    'Unlimited storage',
                    'All reporting features',
                    'Bulk upload',
                    'White-label options',
                    'Custom domain',
                    'Dedicated support'
                ],
                'max_documents': 9999999,
                'has_api_access': True,
                'has_report_export': True,
                'has_bulk_upload': True,
                'has_white_label': True,
                'recommended': False
            }
        ]
        
        serializer = SubscriptionPlanSerializer(plans, many=True)
        return Response(serializer.data)


class CreateCheckoutSessionView(APIView):
    """
    Create a Stripe checkout session for subscription
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Create Stripe checkout session for subscription",
        request_body=CheckoutSessionSerializer,
        responses={
            200: CheckoutSessionResponseSerializer,
            400: 'Bad Request',
            500: 'Internal Server Error'
        }
    )
    def post(self, request):
        serializer = CheckoutSessionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            plan_id = serializer.validated_data['plan_id']
            success_url = serializer.validated_data['success_url']
            cancel_url = serializer.validated_data['cancel_url']

            # Get or create Stripe customer
            customer = self._get_or_create_stripe_customer(request.user)

            # Get Stripe price ID based on plan
            price_id = self._get_stripe_price_id(plan_id)
            if not price_id:
                return Response(
                    {'error': f'Price ID not configured for plan: {plan_id}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Create checkout session
            checkout_session = stripe.checkout.Session.create(
                customer=customer.id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    'user_id': request.user.id,
                    'plan_id': plan_id,
                }
            )

            response_data = {
                'checkout_session_id': checkout_session.id,
                'checkout_url': checkout_session.url
            }
            
            response_serializer = CheckoutSessionResponseSerializer(response_data)
            return Response(response_serializer.data)

        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {e}")
            return Response(
                {'error': 'Payment processing error. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        except Exception as e:
            logger.error(f"Error creating checkout session: {e}")
            return Response(
                {'error': 'Internal server error. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def _get_or_create_stripe_customer(self, user):
        """Get or create Stripe customer for user"""
        if user.stripe_customer_id:
            try:
                customer = stripe.Customer.retrieve(user.stripe_customer_id)
                return customer
            except stripe.error.StripeError:
                # Customer not found, create new one
                pass

        # Create new customer
        customer = stripe.Customer.create(
            email=user.email,
            name=user.get_full_name() or user.email,
            metadata={'user_id': user.id}
        )
        
        # Save customer ID to user
        user.stripe_customer_id = customer.id
        user.save(update_fields=['stripe_customer_id'])
        
        return customer

    def _get_stripe_price_id(self, plan_id):
        """Get Stripe price ID for plan"""
        price_map = {
            'basic': settings.STRIPE_BASIC_PRICE_ID,
            'premium': settings.STRIPE_PREMIUM_PRICE_ID,
            'platinum': settings.STRIPE_PLATINUM_PRICE_ID,
        }
        return price_map.get(plan_id)


class CurrentSubscriptionView(APIView):
    """
    Get current user's subscription details
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get current user subscription",
        responses={
            200: SubscriptionSerializer,
            404: 'No subscription found'
        }
    )
    def get(self, request):
        try:
            subscription = Subscription.objects.get(user=request.user)
            serializer = SubscriptionSerializer(subscription)
            return Response(serializer.data)
        except Subscription.DoesNotExist:
            return Response(
                {'detail': 'No active subscription found'}, 
                status=status.HTTP_404_NOT_FOUND
            )


class PaymentHistoryView(APIView):
    """
    Get user's payment history
    """
    permission_classes = [permissions.IsAuthenticated]

    @swagger_auto_schema(
        operation_description="Get user payment history",
        responses={200: PaymentHistorySerializer(many=True)}
    )
    def get(self, request):
        payments = PaymentHistory.objects.filter(user=request.user)
        serializer = PaymentHistorySerializer(payments, many=True)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handle Stripe webhook events
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        except ValueError:
            logger.error("Invalid payload in webhook")
            return HttpResponse(status=400)
        except stripe.error.SignatureVerificationError:
            logger.error("Invalid signature in webhook")
            return HttpResponse(status=400)

        # Handle the event
        try:
            if event['type'] == 'customer.subscription.created':
                self._handle_subscription_created(event['data']['object'])
            elif event['type'] == 'customer.subscription.updated':
                self._handle_subscription_updated(event['data']['object'])
            elif event['type'] == 'customer.subscription.deleted':
                self._handle_subscription_deleted(event['data']['object'])
            elif event['type'] == 'invoice.payment_succeeded':
                self._handle_payment_succeeded(event['data']['object'])
            elif event['type'] == 'invoice.payment_failed':
                self._handle_payment_failed(event['data']['object'])
            else:
                logger.info(f"Unhandled event type: {event['type']}")

        except Exception as e:
            logger.error(f"Error handling webhook event {event['type']}: {e}")
            return HttpResponse(status=500)

        return HttpResponse(status=200)

    def _handle_subscription_created(self, subscription):
        """Handle subscription.created event"""
        from accounts.models import Account
        
        try:
            customer = stripe.Customer.retrieve(subscription['customer'])
            user = Account.objects.get(stripe_customer_id=customer.id)
            
            # Determine plan from subscription
            plan = self._get_plan_from_stripe_subscription(subscription)
            
            # Create or update subscription record
            subscription_obj, created = Subscription.objects.update_or_create(
                user=user,
                defaults={
                    'plan': plan,
                    'status': subscription['status'],
                    'stripe_subscription_id': subscription['id'],
                    'stripe_customer_id': customer.id,
                    'current_period_start': timezone.datetime.fromtimestamp(
                        subscription['current_period_start'], tz=timezone.utc
                    ),
                    'current_period_end': timezone.datetime.fromtimestamp(
                        subscription['current_period_end'], tz=timezone.utc
                    ),
                    'cancel_at_period_end': subscription.get('cancel_at_period_end', False),
                    'amount': Decimal(str(subscription['items']['data'][0]['price']['unit_amount'] / 100)),
                    'currency': subscription['items']['data'][0]['price']['currency'].upper(),
                }
            )
            
            # Update user subscription fields
            user.subscription_plan = plan
            user.stripe_subscription_id = subscription['id']
            user.subscription_status = subscription['status']
            user.subscription_end_date = subscription_obj.current_period_end
            user.save(update_fields=[
                'subscription_plan', 'stripe_subscription_id', 
                'subscription_status', 'subscription_end_date'
            ])

            logger.info(f"Subscription created for user {user.email}: {plan}")

        except Account.DoesNotExist:
            logger.error(f"User not found for customer {subscription['customer']}")
        except Exception as e:
            logger.error(f"Error creating subscription: {e}")
            raise

    def _handle_subscription_updated(self, subscription):
        """Handle subscription.updated event"""
        try:
            subscription_obj = Subscription.objects.get(
                stripe_subscription_id=subscription['id']
            )
            
            # Update subscription details
            subscription_obj.status = subscription['status']
            subscription_obj.current_period_start = timezone.datetime.fromtimestamp(
                subscription['current_period_start'], tz=timezone.utc
            )
            subscription_obj.current_period_end = timezone.datetime.fromtimestamp(
                subscription['current_period_end'], tz=timezone.utc
            )
            subscription_obj.cancel_at_period_end = subscription.get('cancel_at_period_end', False)
            subscription_obj.save()
            
            # Update user fields
            user = subscription_obj.user
            user.subscription_status = subscription['status']
            user.subscription_end_date = subscription_obj.current_period_end
            user.save(update_fields=['subscription_status', 'subscription_end_date'])

            logger.info(f"Subscription updated for user {user.email}")

        except Subscription.DoesNotExist:
            logger.error(f"Subscription not found: {subscription['id']}")
        except Exception as e:
            logger.error(f"Error updating subscription: {e}")
            raise

    def _handle_subscription_deleted(self, subscription):
        """Handle subscription.deleted event"""
        try:
            subscription_obj = Subscription.objects.get(
                stripe_subscription_id=subscription['id']
            )
            
            # Update subscription status
            subscription_obj.status = 'canceled'
            subscription_obj.save()
            
            # Update user fields
            user = subscription_obj.user
            user.subscription_status = 'canceled'
            user.save(update_fields=['subscription_status'])

            logger.info(f"Subscription canceled for user {user.email}")

        except Subscription.DoesNotExist:
            logger.error(f"Subscription not found: {subscription['id']}")
        except Exception as e:
            logger.error(f"Error deleting subscription: {e}")
            raise

    def _handle_payment_succeeded(self, invoice):
        """Handle invoice.payment_succeeded event"""
        try:
            subscription_id = invoice.get('subscription')
            if not subscription_id:
                return

            subscription_obj = Subscription.objects.get(
                stripe_subscription_id=subscription_id
            )
            
            # Create payment history record
            PaymentHistory.objects.create(
                user=subscription_obj.user,
                stripe_invoice_id=invoice['id'],
                stripe_payment_intent_id=invoice.get('payment_intent'),
                amount_paid=Decimal(str(invoice['amount_paid'] / 100)),
                currency=invoice['currency'].upper(),
                status='paid',
                invoice_pdf_url=invoice.get('invoice_pdf'),
                invoice_number=invoice.get('number'),
                period_start=timezone.datetime.fromtimestamp(
                    invoice['period_start'], tz=timezone.utc
                ),
                period_end=timezone.datetime.fromtimestamp(
                    invoice['period_end'], tz=timezone.utc
                ),
                payment_date=timezone.datetime.fromtimestamp(
                    invoice['created'], tz=timezone.utc
                )
            )

            logger.info(f"Payment recorded for user {subscription_obj.user.email}")

        except Subscription.DoesNotExist:
            logger.error(f"Subscription not found for invoice: {invoice['id']}")
        except Exception as e:
            logger.error(f"Error handling payment success: {e}")
            raise

    def _handle_payment_failed(self, invoice):
        """Handle invoice.payment_failed event"""
        try:
            subscription_id = invoice.get('subscription')
            if not subscription_id:
                return

            subscription_obj = Subscription.objects.get(
                stripe_subscription_id=subscription_id
            )
            
            # Update subscription status
            subscription_obj.status = 'past_due'
            subscription_obj.save()
            
            # Update user status
            user = subscription_obj.user
            user.subscription_status = 'past_due'
            user.save(update_fields=['subscription_status'])

            logger.warning(f"Payment failed for user {user.email}")

        except Subscription.DoesNotExist:
            logger.error(f"Subscription not found for failed invoice: {invoice['id']}")
        except Exception as e:
            logger.error(f"Error handling payment failure: {e}")
            raise

    def _get_plan_from_stripe_subscription(self, subscription):
        """Determine plan type from Stripe subscription"""
        price_id = subscription['items']['data'][0]['price']['id']
        
        if price_id == settings.STRIPE_BASIC_PRICE_ID:
            return 'basic'
        elif price_id == settings.STRIPE_PREMIUM_PRICE_ID:
            return 'premium'
        elif price_id == settings.STRIPE_PLATINUM_PRICE_ID:
            return 'platinum'
        else:
            # Default to basic if price ID not recognized
            logger.warning(f"Unknown price ID: {price_id}, defaulting to basic")
            return 'basic'
