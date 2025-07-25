"""
Stripe Service Layer for Smart Accounting
Handles all interactions with the Stripe API for subscriptions and payments.
"""

import stripe
import logging
from decimal import Decimal
from typing import Dict, Any, Optional, List
from django.conf import settings
from django.contrib.auth import get_user_model

logger = logging.getLogger(__name__)

# Initialize Stripe with API key
stripe.api_key = settings.STRIPE_SECRET_KEY

User = get_user_model()


class StripeService:
    """
    Service class for handling all Stripe operations.
    Implements loose coupling and robust error handling.
    """
    
    # Plan configuration - matches your Stripe dashboard
    PLAN_CONFIG = {
        'basic': {
            'name': 'Basic Plan',
            'price': 0,
            'currency': 'gbp',
            'interval': 'month',
            'price_id': settings.STRIPE_BASIC_PRICE_ID,
            'features': {
                'max_documents': 50,
                'has_api_access': False,
                'has_report_export': False,
                'has_bulk_upload': False,
                'has_white_label': False,
            }
        },
        'premium': {
            'name': 'Premium Plan',
            'price': 500,  # £5.00 in pence
            'currency': 'gbp',
            'interval': 'month',
            'price_id': settings.STRIPE_PREMIUM_PRICE_ID,
            'features': {
                'max_documents': 200,
                'has_api_access': True,
                'has_report_export': True,
                'has_bulk_upload': False,
                'has_white_label': False,
            }
        },
        'platinum': {
            'name': 'Platinum Plan',
            'price': 1000,  # £10.00 in pence
            'currency': 'gbp',
            'interval': 'month',
            'price_id': settings.STRIPE_PLATINUM_PRICE_ID,
            'features': {
                'max_documents': 999999,
                'has_api_access': True,
                'has_report_export': True,
                'has_bulk_upload': True,
                'has_white_label': True,
            }
        }
    }
    
    @classmethod
    def create_or_get_customer(cls, user: User) -> str:
        """
        Create a new Stripe customer or retrieve existing one.
        
        Args:
            user: Django user instance
            
        Returns:
            str: Stripe customer ID
            
        Raises:
            stripe.error.StripeError: If Stripe API call fails
        """
        try:
            # Check if user already has a Stripe customer ID
            if user.stripe_customer_id:
                try:
                    # Verify the customer still exists in Stripe
                    customer = stripe.Customer.retrieve(user.stripe_customer_id)
                    logger.info(f"Retrieved existing Stripe customer: {customer.id}")
                    return customer.id
                except stripe.error.InvalidRequestError:
                    # Customer doesn't exist, create a new one
                    logger.warning(f"Stripe customer {user.stripe_customer_id} not found, creating new one")
                    user.stripe_customer_id = None
            
            # Create new customer
            customer_data = {
                'email': user.email,
                'name': user.get_full_name() or user.username,
                'metadata': {
                    'user_id': str(user.id),
                    'username': user.username,
                    'user_type': getattr(user, 'user_type', 'individual'),
                }
            }
            
            # Add optional fields if available
            if hasattr(user, 'phone_number') and user.phone_number:
                customer_data['phone'] = user.phone_number
                
            if hasattr(user, 'company_name') and user.company_name:
                customer_data['name'] = user.company_name
                customer_data['metadata']['company_name'] = user.company_name
            
            customer = stripe.Customer.create(**customer_data)
            
            # Save the customer ID to the user
            user.stripe_customer_id = customer.id
            user.save(update_fields=['stripe_customer_id'])
            
            logger.info(f"Created new Stripe customer: {customer.id} for user: {user.id}")
            return customer.id
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating customer for user {user.id}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating customer for user {user.id}: {str(e)}")
            raise
    
    @classmethod
    def create_checkout_session(
        cls, 
        user: User, 
        plan_id: str, 
        success_url: str = None, 
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """
        Create a Stripe Checkout session for subscription.
        
        Args:
            user: Django user instance
            plan_id: Plan identifier ('basic', 'premium', 'platinum')
            success_url: URL to redirect after successful payment
            cancel_url: URL to redirect after cancelled payment
            
        Returns:
            Dict containing session data
            
        Raises:
            ValueError: If plan_id is invalid
            stripe.error.StripeError: If Stripe API call fails
        """
        try:
            # Validate plan
            if plan_id not in cls.PLAN_CONFIG:
                raise ValueError(f"Invalid plan ID: {plan_id}")
            
            plan_config = cls.PLAN_CONFIG[plan_id]
            
            # Get or create customer
            customer_id = cls.create_or_get_customer(user)
            
            # Set default URLs if not provided
            if not success_url:
                success_url = f"{settings.FRONTEND_URL}/subscriptions/success?session_id={{CHECKOUT_SESSION_ID}}"
            if not cancel_url:
                cancel_url = f"{settings.FRONTEND_URL}/subscriptions/cancel"
            
            # For Basic plan (free), handle differently
            if plan_id == 'basic':
                # Create a setup mode session for free plan to collect payment method
                session_data = {
                    'customer': customer_id,
                    'mode': 'setup',
                    'success_url': success_url,
                    'cancel_url': cancel_url,
                    'metadata': {
                        'user_id': str(user.id),
                        'plan_id': plan_id,
                    }
                }
            else:
                # Create subscription session for paid plans
                session_data = {
                    'customer': customer_id,
                    'line_items': [{
                        'price_data': {
                            'currency': plan_config['currency'],
                            'product_data': {
                                'name': plan_config['name'],
                                'description': f"Smart Accounting {plan_config['name']} subscription",
                            },
                            'unit_amount': plan_config['price'],
                            'recurring': {
                                'interval': plan_config['interval'],
                            },
                        },
                        'quantity': 1,
                    }],
                    'mode': 'subscription',
                    'success_url': success_url,
                    'cancel_url': cancel_url,
                    'metadata': {
                        'user_id': str(user.id),
                        'plan_id': plan_id,
                    },
                    'subscription_data': {
                        'metadata': {
                            'user_id': str(user.id),
                            'plan_id': plan_id,
                        }
                    }
                }
            
            session = stripe.checkout.Session.create(**session_data)
            
            logger.info(f"Created checkout session {session.id} for user {user.id}, plan {plan_id}")
            
            return {
                'session_id': session.id,
                'url': session.url,
                'customer_id': customer_id,
                'plan_id': plan_id,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating checkout session: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error creating checkout session: {str(e)}")
            raise
    
    @classmethod
    def retrieve_checkout_session(cls, session_id: str) -> Dict[str, Any]:
        """
        Retrieve a Stripe Checkout session.
        
        Args:
            session_id: Stripe session ID
            
        Returns:
            Dict containing session data
        """
        try:
            session = stripe.checkout.Session.retrieve(
                session_id,
                expand=['customer', 'subscription']
            )
            
            return {
                'session_id': session.id,
                'customer_id': session.customer.id if session.customer else None,
                'subscription_id': session.subscription.id if session.subscription else None,
                'payment_status': session.payment_status,
                'status': session.status,
                'metadata': session.metadata,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving session {session_id}: {str(e)}")
            raise
    
    @classmethod
    def retrieve_subscription(cls, subscription_id: str) -> Dict[str, Any]:
        """
        Retrieve a Stripe subscription.
        
        Args:
            subscription_id: Stripe subscription ID
            
        Returns:
            Dict containing subscription data
        """
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            
            # Extract pricing info from the subscription
            price_id = subscription['items']['data'][0]['price']['id']
            unit_amount = subscription['items']['data'][0]['price']['unit_amount']
            currency = subscription['items']['data'][0]['price']['currency']
            
            return {
                'id': subscription.id,
                'customer_id': subscription.customer,
                'status': subscription.status,
                'current_period_start': subscription.current_period_start,
                'current_period_end': subscription.current_period_end,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'canceled_at': subscription.canceled_at,
                'trial_start': subscription.trial_start,
                'trial_end': subscription.trial_end,
                'metadata': subscription.metadata,
                'price_id': price_id,
                'unit_amount': unit_amount,
                'currency': currency.upper(),
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error retrieving subscription {subscription_id}: {str(e)}")
            raise
    
    @classmethod
    def cancel_subscription(
        cls, 
        subscription_id: str, 
        at_period_end: bool = True
    ) -> Dict[str, Any]:
        """
        Cancel a Stripe subscription.
        
        Args:
            subscription_id: Stripe subscription ID
            at_period_end: Whether to cancel at the end of the current period
            
        Returns:
            Dict containing updated subscription data
        """
        try:
            if at_period_end:
                # Cancel at period end
                subscription = stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
                logger.info(f"Subscription {subscription_id} set to cancel at period end")
            else:
                # Cancel immediately
                subscription = stripe.Subscription.cancel(subscription_id)
                logger.info(f"Subscription {subscription_id} cancelled immediately")
            
            return {
                'id': subscription.id,
                'status': subscription.status,
                'cancel_at_period_end': subscription.cancel_at_period_end,
                'canceled_at': subscription.canceled_at,
                'current_period_end': subscription.current_period_end,
            }
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error cancelling subscription {subscription_id}: {str(e)}")
            raise
    
    @classmethod
    def update_subscription(
        cls, 
        subscription_id: str, 
        new_plan_id: str
    ) -> Dict[str, Any]:
        """
        Update a Stripe subscription to a new plan.
        
        Args:
            subscription_id: Stripe subscription ID
            new_plan_id: New plan identifier
            
        Returns:
            Dict containing updated subscription data
        """
        try:
            if new_plan_id not in cls.PLAN_CONFIG:
                raise ValueError(f"Invalid plan ID: {new_plan_id}")
            
            # Get current subscription
            subscription = stripe.Subscription.retrieve(subscription_id)
            current_item_id = subscription['items']['data'][0]['id']
            
            plan_config = cls.PLAN_CONFIG[new_plan_id]
            
            # Update subscription item
            updated_subscription = stripe.Subscription.modify(
                subscription_id,
                items=[{
                    'id': current_item_id,
                    'price_data': {
                        'currency': plan_config['currency'],
                        'product_data': {
                            'name': plan_config['name'],
                        },
                        'unit_amount': plan_config['price'],
                        'recurring': {
                            'interval': plan_config['interval'],
                        },
                    },
                }],
                metadata={
                    **subscription.metadata,
                    'plan_id': new_plan_id,
                }
            )
            
            logger.info(f"Updated subscription {subscription_id} to plan {new_plan_id}")
            
            return cls.retrieve_subscription(subscription_id)
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error updating subscription {subscription_id}: {str(e)}")
            raise
    
    @classmethod
    def create_customer_portal_session(
        cls, 
        customer_id: str, 
        return_url: str = None
    ) -> str:
        """
        Create a Stripe customer portal session.
        
        Args:
            customer_id: Stripe customer ID
            return_url: URL to return to after managing subscription
            
        Returns:
            str: Customer portal URL
        """
        try:
            if not return_url:
                return_url = f"{settings.FRONTEND_URL}/dashboard"
            
            session = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=return_url,
            )
            
            logger.info(f"Created customer portal session for customer {customer_id}")
            
            return session.url
            
        except stripe.error.StripeError as e:
            logger.error(f"Stripe error creating portal session for customer {customer_id}: {str(e)}")
            raise
    
    @classmethod
    def get_plan_features(cls, plan_id: str) -> Dict[str, Any]:
        """
        Get features for a specific plan.
        
        Args:
            plan_id: Plan identifier
            
        Returns:
            Dict containing plan features
        """
        if plan_id not in cls.PLAN_CONFIG:
            # Default to basic plan features
            plan_id = 'basic'
        
        return cls.PLAN_CONFIG[plan_id]['features'].copy()
    
    @classmethod
    def validate_webhook_signature(cls, payload: bytes, sig_header: str, endpoint_secret: str) -> Dict[str, Any]:
        """
        Validate Stripe webhook signature and construct event.
        
        Args:
            payload: Request body as bytes
            sig_header: Stripe signature header
            endpoint_secret: Webhook endpoint secret
            
        Returns:
            Dict containing event data
            
        Raises:
            stripe.error.SignatureVerificationError: If signature is invalid
        """
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, endpoint_secret
            )
            logger.info(f"Webhook event validated: {event['type']}")
            return event
            
        except ValueError as e:
            logger.error(f"Invalid payload in webhook: {str(e)}")
            raise
        except stripe.error.SignatureVerificationError as e:
            logger.error(f"Invalid signature in webhook: {str(e)}")
            raise
