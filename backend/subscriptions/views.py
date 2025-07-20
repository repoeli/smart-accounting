import stripe
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils import timezone
from datetime import datetime
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import Subscription

# Initialize Stripe
stripe.api_key = settings.STRIPE_API_SECRET_KEY


class SubscriptionPlansView(APIView):
    """
    Get available subscription plans with pricing and features
    """
    permission_classes = [AllowAny]  # Allow unauthenticated users to view plans
    
    def get(self, request):
        plans = [
            {
                'id': 'basic',
                'name': 'Basic',
                'price': 9.99,
                'currency': 'GBP',
                'interval': 'month',
                'features': [
                    '50 receipts per month',
                    '1GB storage',
                    'Basic OCR processing',
                    'Email support'
                ],
                'max_documents': 50,
                'stripe_price_id': settings.STRIPE_BASIC_PRICE_ID,
                'popular': False
            },
            {
                'id': 'premium',
                'name': 'Premium',
                'price': 19.99,
                'currency': 'GBP',
                'interval': 'month',
                'features': [
                    '200 receipts per month',
                    '5GB storage',
                    'Advanced OCR processing',
                    'API access',
                    'Report export (PDF/Excel)',
                    'Priority support'
                ],
                'max_documents': 200,
                'stripe_price_id': settings.STRIPE_PREMIUM_PRICE_ID,
                'popular': True
            },
            {
                'id': 'platinum',
                'name': 'Platinum',
                'price': 49.99,
                'currency': 'GBP',
                'interval': 'month',
                'features': [
                    'Unlimited receipts',
                    'Unlimited storage',
                    'Premium OCR processing',
                    'Full API access',
                    'Bulk upload',
                    'White-label solution',
                    'Custom domain',
                    'Dedicated support'
                ],
                'max_documents': 9999999,
                'stripe_price_id': settings.STRIPE_PLATINUM_PRICE_ID,
                'popular': False
            }
        ]
        return Response(plans)


class CreateCheckoutSessionView(APIView):
    """
    Create Stripe checkout session for subscription
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            plan_id = request.data.get('plan_id')
            
            # Map plan IDs to Stripe price IDs
            price_id_map = {
                'basic': settings.STRIPE_BASIC_PRICE_ID,
                'premium': settings.STRIPE_PREMIUM_PRICE_ID,
                'platinum': settings.STRIPE_PLATINUM_PRICE_ID,
            }
            
            if plan_id not in price_id_map:
                return Response(
                    {'error': 'Invalid plan ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            price_id = price_id_map[plan_id]
            
            # Create or retrieve Stripe customer
            user = request.user
            
            # Check if user already has a Stripe customer ID
            try:
                customer_id = user.subscription_details.stripe_customer_id
            except Subscription.DoesNotExist:
                # Create new Stripe customer
                customer = stripe.Customer.create(
                    email=user.email,
                    name=f"{user.first_name} {user.last_name}".strip() or user.email,
                )
                customer_id = customer.id
            
            # Create checkout session
            checkout_session = stripe.checkout.Session.create(
                customer=customer_id,
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url=request.build_absolute_uri('/subscription/success?session_id={CHECKOUT_SESSION_ID}'),
                cancel_url=request.build_absolute_uri('/subscription/cancel'),
                metadata={
                    'user_id': user.id,
                    'plan_id': plan_id,
                }
            )
            
            return Response({
                'checkout_url': checkout_session.url,
                'session_id': checkout_session.id
            })
            
        except stripe.error.StripeError as e:
            return Response(
                {'error': f'Stripe error: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'An error occurred: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class UserSubscriptionView(APIView):
    """
    Get current user's subscription status
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        try:
            subscription = request.user.subscription_details
            return Response({
                'plan': subscription.plan,
                'status': subscription.status,
                'current_period_end': subscription.current_period_end,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'amount': float(subscription.amount),
                'currency': subscription.currency,
                'max_documents': subscription.max_documents,
                'features': {
                    'has_api_access': subscription.has_api_access,
                    'has_report_export': subscription.has_report_export,
                    'has_bulk_upload': subscription.has_bulk_upload,
                    'has_white_label': subscription.has_white_label,
                }
            })
        except Subscription.DoesNotExist:
            return Response({
                'plan': None,
                'status': 'no_subscription',
                'message': 'No active subscription found'
            })


@method_decorator(csrf_exempt, name='dispatch')
class StripeWebhookView(APIView):
    """
    Handle Stripe webhooks for subscription events
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        payload = request.body
        sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
        endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
        
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
        except ValueError:
            return JsonResponse({'error': 'Invalid payload'}, status=400)
        except stripe.error.SignatureVerificationError:
            return JsonResponse({'error': 'Invalid signature'}, status=400)
        
        # Handle the event
        if event['type'] == 'checkout.session.completed':
            self._handle_checkout_session_completed(event['data']['object'])
        elif event['type'] == 'invoice.payment_succeeded':
            self._handle_invoice_payment_succeeded(event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            self._handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            self._handle_subscription_deleted(event['data']['object'])
        
        return JsonResponse({'status': 'success'})
    
    def _handle_checkout_session_completed(self, session):
        """Handle successful checkout session completion"""
        from accounts.models import Account
        
        try:
            user_id = session['metadata']['user_id']
            plan_id = session['metadata']['plan_id']
            user = Account.objects.get(id=user_id)
            
            # Get the subscription from Stripe
            subscription_id = session['subscription']
            stripe_subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Convert timestamps to datetime objects
            current_period_start = timezone.datetime.fromtimestamp(
                stripe_subscription['current_period_start'], tz=timezone.utc
            )
            current_period_end = timezone.datetime.fromtimestamp(
                stripe_subscription['current_period_end'], tz=timezone.utc
            )
            
            # Create or update local subscription record
            subscription, created = Subscription.objects.get_or_create(
                user=user,
                defaults={
                    'plan': plan_id,
                    'stripe_subscription_id': subscription_id,
                    'stripe_customer_id': session['customer'],
                    'status': stripe_subscription['status'],
                    'current_period_start': current_period_start,
                    'current_period_end': current_period_end,
                    'amount': stripe_subscription['items']['data'][0]['price']['unit_amount'] / 100,
                    'currency': stripe_subscription['items']['data'][0]['price']['currency'].upper(),
                }
            )
            
            if not created:
                # Update existing subscription
                subscription.plan = plan_id
                subscription.stripe_subscription_id = subscription_id
                subscription.stripe_customer_id = session['customer']
                subscription.status = stripe_subscription['status']
                subscription.current_period_start = current_period_start
                subscription.current_period_end = current_period_end
                subscription.amount = stripe_subscription['items']['data'][0]['price']['unit_amount'] / 100
                subscription.currency = stripe_subscription['items']['data'][0]['price']['currency'].upper()
                subscription.save()
                
        except Exception as e:
            print(f"Error handling checkout session: {e}")
    
    def _handle_invoice_payment_succeeded(self, invoice):
        """Handle successful invoice payment"""
        # This could be used to record payment history
        pass
    
    def _handle_subscription_updated(self, subscription):
        """Handle subscription updates"""
        try:
            local_subscription = Subscription.objects.get(
                stripe_subscription_id=subscription['id']
            )
            local_subscription.status = subscription['status']
            local_subscription.current_period_start = timezone.datetime.fromtimestamp(
                subscription['current_period_start'], tz=timezone.utc
            )
            local_subscription.current_period_end = timezone.datetime.fromtimestamp(
                subscription['current_period_end'], tz=timezone.utc
            )
            local_subscription.cancel_at_period_end = subscription['cancel_at_period_end']
            local_subscription.save()
        except Subscription.DoesNotExist:
            pass
    
    def _handle_subscription_deleted(self, subscription):
        """Handle subscription cancellation"""
        try:
            local_subscription = Subscription.objects.get(
                stripe_subscription_id=subscription['id']
            )
            local_subscription.status = 'canceled'
            local_subscription.save()
        except Subscription.DoesNotExist:
            pass
