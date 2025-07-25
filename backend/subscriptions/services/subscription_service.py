"""
Subscription Service Layer for Smart Accounting
Orchestrates subscription business logic and integrates with Stripe service.
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, Optional
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone as django_timezone

from ..models import Subscription, PaymentHistory
from .stripe_service import StripeService

logger = logging.getLogger(__name__)

User = get_user_model()


class SubscriptionService:
    """
    Service class for handling subscription business logic.
    Provides a high-level interface for subscription operations.
    """
    
    @classmethod
    def create_subscription_checkout(
        cls, 
        user: User, 
        plan_id: str,
        success_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """
        Create a checkout session for a new subscription.
        
        Args:
            user: Django user instance
            plan_id: Plan identifier ('basic', 'premium', 'platinum')
            success_url: Custom success URL
            cancel_url: Custom cancel URL
            
        Returns:
            Dict containing checkout session data
        """
        try:
            # Validate plan
            if plan_id not in StripeService.PLAN_CONFIG:
                raise ValueError(f"Invalid plan ID: {plan_id}")
            
            # Check if user already has an active subscription
            existing_subscription = cls.get_user_subscription(user)
            if existing_subscription and existing_subscription.status == Subscription.ACTIVE:
                logger.warning(f"User {user.id} already has active subscription: {existing_subscription.id}")
                return {
                    'error': 'User already has an active subscription',
                    'existing_plan': existing_subscription.plan,
                    'subscription_id': existing_subscription.id
                }
            
            # Create Stripe checkout session
            session_data = StripeService.create_checkout_session(
                user=user,
                plan_id=plan_id,
                success_url=success_url,
                cancel_url=cancel_url
            )
            
            logger.info(f"Created checkout session for user {user.id}, plan {plan_id}")
            
            return {
                'success': True,
                'session_id': session_data['session_id'],
                'checkout_url': session_data['url'],
                'plan_id': plan_id,
                'user_id': user.id
            }
            
        except Exception as e:
            logger.error(f"Error creating subscription checkout for user {user.id}: {str(e)}")
            return {
                'error': str(e)
            }
    
    @classmethod
    def process_successful_checkout(cls, session_id: str) -> Dict[str, Any]:
        """
        Process a successful checkout session and create/update local subscription.
        
        Args:
            session_id: Stripe checkout session ID
            
        Returns:
            Dict containing processing results
        """
        try:
            with transaction.atomic():
                # Retrieve session data from Stripe
                logger.info(f"Processing checkout session: {session_id}")
                session_data = StripeService.retrieve_checkout_session(session_id)
                logger.info(f"Session data: {session_data}")
                
                if session_data['payment_status'] != 'paid' and session_data['status'] != 'complete':
                    logger.warning(f"Session {session_id} not completed: {session_data['status']}")
                    return {
                        'error': 'Payment not completed',
                        'status': session_data['status'],
                        'payment_status': session_data.get('payment_status')
                    }
                
                # Get user from metadata
                user_id = session_data['metadata'].get('user_id')
                plan_id = session_data['metadata'].get('plan_id')
                
                if not user_id or not plan_id:
                    logger.error(f"Missing metadata in session {session_id}: user_id={user_id}, plan_id={plan_id}")
                    return {
                        'error': 'Invalid session metadata'
                    }
                
                try:
                    user = User.objects.get(id=user_id)
                except User.DoesNotExist:
                    logger.error(f"User {user_id} not found for session {session_id}")
                    return {
                        'error': 'User not found'
                    }
                
                # Handle different checkout modes
                if plan_id == 'basic':
                    # Free plan - create subscription without Stripe subscription
                    subscription = cls._create_or_update_subscription(
                        user=user,
                        plan_id=plan_id,
                        stripe_subscription_id=None,
                        stripe_customer_id=session_data['customer_id'],
                        status=Subscription.ACTIVE,
                        amount=Decimal('0.00')
                    )
                    
                    logger.info(f"Created basic subscription for user {user.id}")
                    
                    return {
                        'success': True,
                        'subscription_id': subscription.id,
                        'plan': plan_id,
                        'user_id': user.id,
                        'type': 'free_plan'
                    }
                
                else:
                    # Paid plan - retrieve subscription from Stripe
                    stripe_subscription_id = session_data['subscription_id']
                    if not stripe_subscription_id:
                        logger.error(f"No subscription ID in session {session_id}")
                        return {
                            'error': 'No subscription found in session'
                        }
                    
                    # Get subscription details from Stripe
                    logger.info(f"Retrieving Stripe subscription: {stripe_subscription_id}")
                    try:
                        stripe_subscription = StripeService.retrieve_subscription(stripe_subscription_id)
                        logger.info(f"Stripe subscription retrieved: {stripe_subscription}")
                        
                        # Check if subscription retrieval returned an error (incomplete status)
                        if 'error' in stripe_subscription:
                            logger.warning(f"Subscription {stripe_subscription_id} is incomplete: {stripe_subscription['error']}")
                            # Create a basic subscription record for tracking, but mark it as incomplete
                            subscription = cls._create_or_update_subscription(
                                user=user,
                                plan_id=plan_id,
                                stripe_subscription_id=stripe_subscription_id,
                                stripe_customer_id=session_data['customer_id'],
                                status=Subscription.INCOMPLETE,
                                amount=Decimal('0.00')  # Will be updated when subscription becomes active
                            )
                            
                            return {
                                'error': f'Subscription payment incomplete: {stripe_subscription["error"]}',
                                'subscription_id': subscription.id,
                                'requires_action': True,
                                'status': stripe_subscription['status']
                            }
                        
                    except Exception as e:
                        logger.error(f"Failed to retrieve Stripe subscription {stripe_subscription_id}: {str(e)}")
                        return {
                            'error': f'Failed to retrieve subscription: {str(e)}'
                        }
                    
                    # Create local subscription
                    subscription = cls._create_or_update_subscription(
                        user=user,
                        plan_id=plan_id,
                        stripe_subscription_id=stripe_subscription_id,
                        stripe_customer_id=stripe_subscription['customer_id'],
                        status=cls._map_stripe_status(stripe_subscription['status']),
                        amount=Decimal(stripe_subscription['unit_amount']) / 100,  # Convert from pence
                        current_period_start=datetime.fromtimestamp(
                            stripe_subscription['current_period_start'], 
                            tz=timezone.utc
                        ),
                        current_period_end=datetime.fromtimestamp(
                            stripe_subscription['current_period_end'], 
                            tz=timezone.utc
                        ),
                        cancel_at_period_end=stripe_subscription['cancel_at_period_end']
                    )
                    
                    logger.info(f"Created paid subscription {subscription.id} for user {user.id}")
                    
                    return {
                        'success': True,
                        'subscription_id': subscription.id,
                        'stripe_subscription_id': stripe_subscription_id,
                        'plan': plan_id,
                        'user_id': user.id,
                        'type': 'paid_plan'
                    }
                
        except Exception as e:
            logger.error(f"Error processing checkout session {session_id}: {str(e)}")
            return {
                'error': str(e)
            }
    
    @classmethod
    def get_user_subscription(cls, user: User) -> Optional[Subscription]:
        """
        Get the current subscription for a user.
        
        Args:
            user: Django user instance
            
        Returns:
            Subscription instance or None
        """
        try:
            return Subscription.objects.filter(user=user).first()
        except Subscription.DoesNotExist:
            return None
    
    @classmethod
    def cancel_user_subscription(
        cls, 
        user: User, 
        immediate: bool = False
    ) -> Dict[str, Any]:
        """
        Cancel a user's subscription.
        
        Args:
            user: Django user instance
            immediate: Whether to cancel immediately or at period end
            
        Returns:
            Dict containing cancellation results
        """
        try:
            subscription = cls.get_user_subscription(user)
            if not subscription:
                return {
                    'error': 'No subscription found for user'
                }
            
            if subscription.status == Subscription.CANCELED:
                return {
                    'error': 'Subscription already cancelled'
                }
            
            # If it's a paid subscription, cancel in Stripe
            if subscription.stripe_subscription_id:
                stripe_result = StripeService.cancel_subscription(
                    subscription.stripe_subscription_id,
                    at_period_end=not immediate
                )
                
                # Update local subscription
                subscription.cancel_at_period_end = stripe_result['cancel_at_period_end']
                if stripe_result['canceled_at']:
                    subscription.status = Subscription.CANCELED
                subscription.save()
                
            else:
                # Free subscription - cancel immediately
                subscription.status = Subscription.CANCELED
                subscription.save()
            
            logger.info(f"Cancelled subscription {subscription.id} for user {user.id}")
            
            return {
                'success': True,
                'subscription_id': subscription.id,
                'cancelled_immediately': immediate,
                'cancel_at_period_end': subscription.cancel_at_period_end
            }
            
        except Exception as e:
            logger.error(f"Error cancelling subscription for user {user.id}: {str(e)}")
            return {
                'error': str(e)
            }
    
    @classmethod
    def change_user_plan(
        cls, 
        user: User, 
        new_plan_id: str
    ) -> Dict[str, Any]:
        """
        Change a user's subscription plan.
        
        Args:
            user: Django user instance
            new_plan_id: New plan identifier
            
        Returns:
            Dict containing change results
        """
        try:
            subscription = cls.get_user_subscription(user)
            if not subscription:
                return {
                    'error': 'No subscription found for user'
                }
            
            if subscription.plan == new_plan_id:
                return {
                    'error': 'User already on this plan'
                }
            
            # Validate new plan
            if new_plan_id not in StripeService.PLAN_CONFIG:
                return {
                    'error': f'Invalid plan ID: {new_plan_id}'
                }
            
            # Handle plan changes
            old_plan = subscription.plan
            
            if subscription.stripe_subscription_id and new_plan_id != 'basic':
                # Update paid subscription in Stripe
                stripe_result = StripeService.update_subscription(
                    subscription.stripe_subscription_id,
                    new_plan_id
                )
                
                # Update local subscription
                plan_config = StripeService.PLAN_CONFIG[new_plan_id]
                subscription.plan = new_plan_id
                subscription.amount = Decimal(plan_config['price']) / 100
                subscription.save()
                
            elif new_plan_id == 'basic':
                # Downgrade to free plan - cancel current subscription
                if subscription.stripe_subscription_id:
                    StripeService.cancel_subscription(
                        subscription.stripe_subscription_id,
                        at_period_end=False
                    )
                
                # Update to basic plan
                subscription.plan = new_plan_id
                subscription.amount = Decimal('0.00')
                subscription.stripe_subscription_id = None
                subscription.status = Subscription.ACTIVE
                subscription.save()
                
            else:
                # Upgrade from free to paid - create new checkout session
                return cls.create_subscription_checkout(user, new_plan_id)
            
            logger.info(f"Changed plan for user {user.id} from {old_plan} to {new_plan_id}")
            
            return {
                'success': True,
                'subscription_id': subscription.id,
                'old_plan': old_plan,
                'new_plan': new_plan_id
            }
            
        except Exception as e:
            logger.error(f"Error changing plan for user {user.id}: {str(e)}")
            return {
                'error': str(e)
            }
    
    @classmethod
    def get_customer_portal_url(cls, user: User, return_url: str = None) -> Dict[str, Any]:
        """
        Get customer portal URL for managing subscription.
        
        Args:
            user: Django user instance
            return_url: URL to return to after managing subscription
            
        Returns:
            Dict containing portal URL or error
        """
        try:
            if not user.stripe_customer_id:
                return {
                    'error': 'User does not have a Stripe customer ID'
                }
            
            portal_url = StripeService.create_customer_portal_session(
                user.stripe_customer_id,
                return_url
            )
            
            return {
                'success': True,
                'portal_url': portal_url
            }
            
        except Exception as e:
            logger.error(f"Error creating portal URL for user {user.id}: {str(e)}")
            return {
                'error': str(e)
            }
    
    @classmethod
    def sync_subscription_from_stripe(cls, stripe_subscription_id: str) -> Dict[str, Any]:
        """
        Sync local subscription with Stripe data.
        
        Args:
            stripe_subscription_id: Stripe subscription ID
            
        Returns:
            Dict containing sync results
        """
        try:
            # Get subscription from Stripe
            stripe_subscription = StripeService.retrieve_subscription(stripe_subscription_id)
            
            # Find local subscription
            try:
                subscription = Subscription.objects.get(
                    stripe_subscription_id=stripe_subscription_id
                )
            except Subscription.DoesNotExist:
                logger.error(f"Local subscription not found for Stripe ID: {stripe_subscription_id}")
                return {
                    'error': 'Local subscription not found'
                }
            
            # Update local subscription with Stripe data
            subscription.status = cls._map_stripe_status(stripe_subscription['status'])
            subscription.current_period_start = datetime.fromtimestamp(
                stripe_subscription['current_period_start'],
                tz=timezone.utc
            )
            subscription.current_period_end = datetime.fromtimestamp(
                stripe_subscription['current_period_end'],
                tz=timezone.utc
            )
            subscription.cancel_at_period_end = stripe_subscription['cancel_at_period_end']
            subscription.amount = Decimal(stripe_subscription['unit_amount']) / 100
            subscription.save()
            
            logger.info(f"Synced subscription {subscription.id} with Stripe data")
            
            return {
                'success': True,
                'subscription_id': subscription.id,
                'status': subscription.status
            }
            
        except Exception as e:
            logger.error(f"Error syncing subscription {stripe_subscription_id}: {str(e)}")
            return {
                'error': str(e)
            }
    
    @classmethod
    def _create_or_update_subscription(
        cls,
        user: User,
        plan_id: str,
        stripe_subscription_id: Optional[str],
        stripe_customer_id: str,
        status: str,
        amount: Decimal,
        current_period_start: datetime = None,
        current_period_end: datetime = None,
        cancel_at_period_end: bool = False
    ) -> Subscription:
        """
        Create or update a user's subscription.
        Internal helper method.
        """
        # Set default dates for free plans
        if not current_period_start:
            current_period_start = django_timezone.now()
        if not current_period_end:
            # Set end date to 1 month from now for free plans
            from dateutil.relativedelta import relativedelta
            current_period_end = current_period_start + relativedelta(months=1)
        
        # Get or create subscription
        subscription, created = Subscription.objects.get_or_create(
            user=user,
            defaults={
                'plan': plan_id,
                'status': status,
                'stripe_subscription_id': stripe_subscription_id,
                'stripe_customer_id': stripe_customer_id,
                'current_period_start': current_period_start,
                'current_period_end': current_period_end,
                'cancel_at_period_end': cancel_at_period_end,
                'amount': amount,
                'currency': 'GBP'
            }
        )
        
        if not created:
            # Update existing subscription
            subscription.plan = plan_id
            subscription.status = status
            subscription.stripe_subscription_id = stripe_subscription_id
            subscription.stripe_customer_id = stripe_customer_id
            subscription.current_period_start = current_period_start
            subscription.current_period_end = current_period_end
            subscription.cancel_at_period_end = cancel_at_period_end
            subscription.amount = amount
            subscription.save()
        
        return subscription
    
    @classmethod
    def _map_stripe_status(cls, stripe_status: str) -> str:
        """
        Map Stripe subscription status to local status.
        """
        status_mapping = {
            'active': Subscription.ACTIVE,
            'canceled': Subscription.CANCELED,
            'past_due': Subscription.PAST_DUE,
            'trialing': Subscription.TRIALING,
            'unpaid': Subscription.UNPAID,
            'incomplete': Subscription.INCOMPLETE,
        }
        
        return status_mapping.get(stripe_status, Subscription.ACTIVE)
    
    @classmethod
    def get_subscription_features(cls, user: User) -> Dict[str, Any]:
        """
        Get subscription features for a user.
        
        Args:
            user: Django user instance
            
        Returns:
            Dict containing subscription features
        """
        subscription = cls.get_user_subscription(user)
        
        if subscription and subscription.status == Subscription.ACTIVE:
            plan_id = subscription.plan
        else:
            # Default to basic plan for users without active subscription
            plan_id = 'basic'
        
        features = StripeService.get_plan_features(plan_id)
        
        # Add subscription info
        features.update({
            'current_plan': plan_id,
            'subscription_active': subscription and subscription.status == Subscription.ACTIVE,
            'subscription_id': subscription.id if subscription else None,
        })
        
        return features
