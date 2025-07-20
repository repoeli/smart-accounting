import stripe
from django.conf import settings
from django.utils import timezone
from decimal import Decimal
from .models import Subscription, PaymentHistory
from accounts.models import Account


# Configure Stripe
stripe.api_key = settings.STRIPE_API_SECRET_KEY
stripe.api_version = settings.STRIPE_API_VERSION


class StripeService:
    """
    Service class to handle Stripe operations for subscriptions
    """
    
    # Subscription plan configuration
    SUBSCRIPTION_PLANS = {
        Subscription.BASIC: {
            'name': 'Basic Plan',
            'price': Decimal('9.99'),
            'currency': 'GBP',
            'stripe_price_id': settings.STRIPE_BASIC_PRICE_ID,
            'features': {
                'max_documents': 50,
                'has_api_access': False,
                'has_report_export': False,
                'has_bulk_upload': False,
                'has_white_label': False,
            },
            'popular': False
        },
        Subscription.PREMIUM: {
            'name': 'Premium Plan',
            'price': Decimal('19.99'),
            'currency': 'GBP',
            'stripe_price_id': settings.STRIPE_PREMIUM_PRICE_ID,
            'features': {
                'max_documents': 200,
                'has_api_access': True,
                'has_report_export': True,
                'has_bulk_upload': False,
                'has_white_label': False,
            },
            'popular': True
        },
        Subscription.PLATINUM: {
            'name': 'Platinum Plan',
            'price': Decimal('49.99'),
            'currency': 'GBP',
            'stripe_price_id': settings.STRIPE_PLATINUM_PRICE_ID,
            'features': {
                'max_documents': 9999999,  # Unlimited
                'has_api_access': True,
                'has_report_export': True,
                'has_bulk_upload': True,
                'has_white_label': True,
            },
            'popular': False
        },
    }
    
    @classmethod
    def get_available_plans(cls):
        """Get all available subscription plans"""
        plans = []
        for plan_key, plan_data in cls.SUBSCRIPTION_PLANS.items():
            plans.append({
                'plan': plan_key,
                'name': plan_data['name'],
                'price': plan_data['price'],
                'currency': plan_data['currency'],
                'features': plan_data['features'],
                'stripe_price_id': plan_data['stripe_price_id'],
                'popular': plan_data['popular']
            })
        return plans
    
    @classmethod
    def get_plan_details(cls, plan):
        """Get details for a specific plan"""
        return cls.SUBSCRIPTION_PLANS.get(plan)
    
    @classmethod
    def create_customer(cls, user):
        """Create a Stripe customer for the user"""
        try:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.get_full_name(),
                metadata={
                    'user_id': str(user.id),
                    'user_type': user.user_type
                }
            )
            
            # Update user with Stripe customer ID
            user.stripe_customer_id = customer.id
            user.save()
            
            return customer
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create Stripe customer: {str(e)}")
    
    @classmethod
    def create_subscription(cls, user, plan, payment_method_id):
        """Create a new subscription for the user"""
        try:
            # Get or create Stripe customer
            if not user.stripe_customer_id:
                customer = cls.create_customer(user)
            else:
                customer = stripe.Customer.retrieve(user.stripe_customer_id)
            
            # Attach payment method to customer
            stripe.PaymentMethod.attach(
                payment_method_id,
                customer=customer.id
            )
            
            # Set as default payment method
            stripe.Customer.modify(
                customer.id,
                invoice_settings={'default_payment_method': payment_method_id}
            )
            
            # Get plan details
            plan_details = cls.get_plan_details(plan)
            if not plan_details:
                raise Exception(f"Invalid plan: {plan}")
            
            # Create subscription
            subscription = stripe.Subscription.create(
                customer=customer.id,
                items=[{'price': plan_details['stripe_price_id']}],
                expand=['latest_invoice.payment_intent'],
                metadata={
                    'user_id': str(user.id),
                    'plan': plan
                }
            )
            
            # Create or update local subscription record
            local_subscription = cls._create_or_update_subscription_from_stripe(
                user, subscription
            )
            
            return local_subscription, subscription
            
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to create subscription: {str(e)}")
    
    @classmethod
    def update_subscription(cls, user, new_plan):
        """Update an existing subscription to a new plan"""
        try:
            # Get current subscription
            current_subscription = user.subscription_details
            if not current_subscription or not current_subscription.stripe_subscription_id:
                raise Exception("No active subscription found")
            
            # Get plan details
            plan_details = cls.get_plan_details(new_plan)
            if not plan_details:
                raise Exception(f"Invalid plan: {new_plan}")
            
            # Update subscription in Stripe
            stripe_subscription = stripe.Subscription.retrieve(
                current_subscription.stripe_subscription_id
            )
            
            stripe.Subscription.modify(
                current_subscription.stripe_subscription_id,
                items=[{
                    'id': stripe_subscription['items']['data'][0].id,
                    'price': plan_details['stripe_price_id'],
                }],
                proration_behavior='always_invoice',
                metadata={
                    'user_id': str(user.id),
                    'plan': new_plan
                }
            )
            
            # Retrieve updated subscription
            updated_subscription = stripe.Subscription.retrieve(
                current_subscription.stripe_subscription_id
            )
            
            # Update local subscription record
            local_subscription = cls._create_or_update_subscription_from_stripe(
                user, updated_subscription
            )
            
            return local_subscription
            
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to update subscription: {str(e)}")
    
    @classmethod
    def cancel_subscription(cls, user, at_period_end=True):
        """Cancel a subscription"""
        try:
            current_subscription = user.subscription_details
            if not current_subscription or not current_subscription.stripe_subscription_id:
                raise Exception("No active subscription found")
            
            if at_period_end:
                # Cancel at period end
                stripe.Subscription.modify(
                    current_subscription.stripe_subscription_id,
                    cancel_at_period_end=True
                )
                current_subscription.cancel_at_period_end = True
                current_subscription.save()
            else:
                # Cancel immediately
                stripe.Subscription.delete(
                    current_subscription.stripe_subscription_id
                )
                current_subscription.status = Subscription.CANCELED
                current_subscription.save()
            
            return current_subscription
            
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to cancel subscription: {str(e)}")
    
    @classmethod
    def get_payment_methods(cls, user):
        """Get user's payment methods from Stripe"""
        try:
            if not user.stripe_customer_id:
                return []
            
            payment_methods = stripe.PaymentMethod.list(
                customer=user.stripe_customer_id,
                type='card'
            )
            
            # Get default payment method
            customer = stripe.Customer.retrieve(user.stripe_customer_id)
            default_payment_method = customer.get('invoice_settings', {}).get('default_payment_method')
            
            formatted_methods = []
            for pm in payment_methods.data:
                formatted_methods.append({
                    'id': pm.id,
                    'type': pm.type,
                    'card': pm.card if hasattr(pm, 'card') else None,
                    'is_default': pm.id == default_payment_method
                })
            
            return formatted_methods
            
        except stripe.error.StripeError as e:
            raise Exception(f"Failed to retrieve payment methods: {str(e)}")
    
    @classmethod
    def _create_or_update_subscription_from_stripe(cls, user, stripe_subscription):
        """Create or update local subscription from Stripe subscription data"""
        # Extract plan from metadata or determine from price
        plan = stripe_subscription.metadata.get('plan')
        if not plan:
            # Try to determine plan from price ID
            price_id = stripe_subscription['items']['data'][0]['price']['id']
            for plan_key, plan_data in cls.SUBSCRIPTION_PLANS.items():
                if plan_data['stripe_price_id'] == price_id:
                    plan = plan_key
                    break
        
        # Get or create subscription
        subscription, created = Subscription.objects.get_or_create(
            user=user,
            defaults={
                'plan': plan or Subscription.BASIC,
                'stripe_subscription_id': stripe_subscription.id,
                'stripe_customer_id': stripe_subscription.customer,
                'status': stripe_subscription.status,
                'current_period_start': timezone.datetime.fromtimestamp(
                    stripe_subscription.current_period_start,
                    tz=timezone.get_current_timezone()
                ),
                'current_period_end': timezone.datetime.fromtimestamp(
                    stripe_subscription.current_period_end,
                    tz=timezone.get_current_timezone()
                ),
                'cancel_at_period_end': stripe_subscription.cancel_at_period_end,
                'amount': Decimal(str(stripe_subscription['items']['data'][0]['price']['unit_amount'] / 100)),
                'currency': stripe_subscription['items']['data'][0]['price']['currency'].upper(),
            }
        )
        
        if not created:
            # Update existing subscription
            subscription.plan = plan or subscription.plan
            subscription.stripe_subscription_id = stripe_subscription.id
            subscription.stripe_customer_id = stripe_subscription.customer
            subscription.status = stripe_subscription.status
            subscription.current_period_start = timezone.datetime.fromtimestamp(
                stripe_subscription.current_period_start,
                tz=timezone.get_current_timezone()
            )
            subscription.current_period_end = timezone.datetime.fromtimestamp(
                stripe_subscription.current_period_end,
                tz=timezone.get_current_timezone()
            )
            subscription.cancel_at_period_end = stripe_subscription.cancel_at_period_end
            subscription.amount = Decimal(str(stripe_subscription['items']['data'][0]['price']['unit_amount'] / 100))
            subscription.currency = stripe_subscription['items']['data'][0]['price']['currency'].upper()
            subscription.save()
        
        return subscription
    
    @classmethod
    def handle_webhook(cls, event):
        """Handle Stripe webhook events"""
        try:
            if event['type'] == 'customer.subscription.updated':
                subscription = event['data']['object']
                user = Account.objects.get(stripe_customer_id=subscription['customer'])
                cls._create_or_update_subscription_from_stripe(user, subscription)
                
            elif event['type'] == 'customer.subscription.deleted':
                subscription = event['data']['object']
                user = Account.objects.get(stripe_customer_id=subscription['customer'])
                local_subscription = user.subscription_details
                if local_subscription:
                    local_subscription.status = Subscription.CANCELED
                    local_subscription.save()
                    
            elif event['type'] == 'invoice.payment_succeeded':
                invoice = event['data']['object']
                user = Account.objects.get(stripe_customer_id=invoice['customer'])
                cls._create_payment_history_from_invoice(user, invoice)
                
            elif event['type'] == 'invoice.payment_failed':
                invoice = event['data']['object']
                user = Account.objects.get(stripe_customer_id=invoice['customer'])
                # Handle failed payment - could send notification, update subscription status, etc.
                pass
                
        except Account.DoesNotExist:
            # User not found - might be a different customer
            pass
        except Exception as e:
            # Log error but don't raise to avoid webhook failures
            print(f"Webhook handling error: {str(e)}")
    
    @classmethod
    def _create_payment_history_from_invoice(cls, user, invoice):
        """Create payment history record from Stripe invoice"""
        payment_history, created = PaymentHistory.objects.get_or_create(
            user=user,
            stripe_invoice_id=invoice['id'],
            defaults={
                'stripe_payment_intent_id': invoice.get('payment_intent'),
                'amount_paid': Decimal(str(invoice['amount_paid'] / 100)),
                'currency': invoice['currency'].upper(),
                'status': PaymentHistory.PAID if invoice['status'] == 'paid' else PaymentHistory.OPEN,
                'invoice_pdf_url': invoice.get('invoice_pdf'),
                'invoice_number': invoice.get('number'),
                'period_start': timezone.datetime.fromtimestamp(
                    invoice['period_start'],
                    tz=timezone.get_current_timezone()
                ) if invoice.get('period_start') else timezone.now(),
                'period_end': timezone.datetime.fromtimestamp(
                    invoice['period_end'],
                    tz=timezone.get_current_timezone()
                ) if invoice.get('period_end') else timezone.now(),
                'payment_date': timezone.datetime.fromtimestamp(
                    invoice.get('status_transitions', {}).get('paid_at', invoice['created']),
                    tz=timezone.get_current_timezone()
                ),
            }
        )
        return payment_history