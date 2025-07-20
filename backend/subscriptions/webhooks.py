import stripe
import logging
from django.conf import settings
from django.http import HttpResponse, HttpResponseBadRequest
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.utils.decorators import method_decorator
from django.utils import timezone
from datetime import datetime

from accounts.models import Account
from .models import Subscription, PaymentHistory

# Configure Stripe
stripe.api_key = settings.STRIPE_API_SECRET_KEY

logger = logging.getLogger(__name__)


@csrf_exempt
@require_POST
def stripe_webhook(request):
    """
    Handle Stripe webhook events for subscription management
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError:
        # Invalid payload
        logger.error("Invalid payload in Stripe webhook")
        return HttpResponseBadRequest("Invalid payload")
    except stripe.error.SignatureVerificationError:
        # Invalid signature
        logger.error("Invalid signature in Stripe webhook")
        return HttpResponseBadRequest("Invalid signature")

    # Handle the event
    try:
        if event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        
        elif event['type'] == 'invoice.payment_succeeded':
            handle_payment_succeeded(event['data']['object'])
        
        elif event['type'] == 'invoice.payment_failed':
            handle_payment_failed(event['data']['object'])
        
        else:
            logger.info(f"Unhandled event type: {event['type']}")
    
    except Exception as e:
        logger.error(f"Error handling webhook event {event['type']}: {str(e)}")
        return HttpResponseBadRequest(f"Error processing webhook: {str(e)}")
    
    return HttpResponse(status=200)


def handle_subscription_updated(subscription_data):
    """
    Handle subscription.updated webhook event
    """
    try:
        subscription = Subscription.objects.get(
            stripe_subscription_id=subscription_data['id']
        )
        
        # Update subscription details
        subscription.status = subscription_data['status']
        subscription.cancel_at_period_end = subscription_data['cancel_at_period_end']
        subscription.current_period_start = datetime.fromtimestamp(
            subscription_data['current_period_start'], tz=timezone.utc
        )
        subscription.current_period_end = datetime.fromtimestamp(
            subscription_data['current_period_end'], tz=timezone.utc
        )
        
        # Update plan if changed
        price_id = subscription_data['items']['data'][0]['price']['id']
        if price_id == settings.STRIPE_BASIC_PRICE_ID:
            subscription.plan = Subscription.BASIC
        elif price_id == settings.STRIPE_PREMIUM_PRICE_ID:
            subscription.plan = Subscription.PREMIUM
        elif price_id == settings.STRIPE_PLATINUM_PRICE_ID:
            subscription.plan = Subscription.PLATINUM
        
        subscription.save()
        logger.info(f"Updated subscription {subscription.id}")
        
    except Subscription.DoesNotExist:
        logger.error(f"Subscription not found for Stripe ID: {subscription_data['id']}")


def handle_subscription_deleted(subscription_data):
    """
    Handle subscription.deleted webhook event
    """
    try:
        subscription = Subscription.objects.get(
            stripe_subscription_id=subscription_data['id']
        )
        
        # Mark subscription as canceled
        subscription.status = Subscription.CANCELED
        subscription.save()
        
        # Also update the user's subscription status
        user = subscription.user
        user.subscription_status = 'canceled'
        user.save()
        
        logger.info(f"Canceled subscription {subscription.id}")
        
    except Subscription.DoesNotExist:
        logger.error(f"Subscription not found for Stripe ID: {subscription_data['id']}")


def handle_payment_succeeded(invoice_data):
    """
    Handle invoice.payment_succeeded webhook event
    """
    try:
        # Find the subscription by customer ID
        subscription = Subscription.objects.get(
            stripe_customer_id=invoice_data['customer']
        )
        
        # Create or update payment history record
        payment, created = PaymentHistory.objects.get_or_create(
            stripe_invoice_id=invoice_data['id'],
            defaults={
                'user': subscription.user,
                'stripe_payment_intent_id': invoice_data.get('payment_intent'),
                'amount_paid': invoice_data['amount_paid'] / 100,  # Convert from cents
                'currency': invoice_data['currency'].upper(),
                'status': PaymentHistory.PAID,
                'invoice_pdf_url': invoice_data.get('invoice_pdf'),
                'invoice_number': invoice_data.get('number'),
                'period_start': datetime.fromtimestamp(
                    invoice_data['period_start'], tz=timezone.utc
                ),
                'period_end': datetime.fromtimestamp(
                    invoice_data['period_end'], tz=timezone.utc
                ),
                'payment_date': datetime.fromtimestamp(
                    invoice_data['status_transitions']['paid_at'], tz=timezone.utc
                ),
            }
        )
        
        if created:
            logger.info(f"Created payment history record {payment.id}")
        else:
            logger.info(f"Payment history record already exists for invoice {invoice_data['id']}")
        
    except Subscription.DoesNotExist:
        logger.error(f"Subscription not found for customer: {invoice_data['customer']}")


def handle_payment_failed(invoice_data):
    """
    Handle invoice.payment_failed webhook event
    """
    try:
        # Find the subscription by customer ID
        subscription = Subscription.objects.get(
            stripe_customer_id=invoice_data['customer']
        )
        
        # Update subscription status to past_due
        subscription.status = Subscription.PAST_DUE
        subscription.save()
        
        # Also update the user's subscription status
        user = subscription.user
        user.subscription_status = 'past_due'
        user.save()
        
        logger.info(f"Marked subscription {subscription.id} as past due")
        
    except Subscription.DoesNotExist:
        logger.error(f"Subscription not found for customer: {invoice_data['customer']}")