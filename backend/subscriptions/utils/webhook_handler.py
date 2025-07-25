"""
Stripe Webhook Handler for Smart Accounting
Processes Stripe webhook events and updates local database accordingly.
"""

import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timezone

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone as django_timezone

from ..models import Subscription, PaymentHistory
from ..services.stripe_service import StripeService
from ..services.subscription_service import SubscriptionService

logger = logging.getLogger(__name__)

User = get_user_model()


class StripeWebhookHandler:
    """
    Handler for processing Stripe webhook events.
    Ensures data consistency between Stripe and local database.
    """
    
    @classmethod
    def handle_webhook_event(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Main webhook event handler that routes to specific event processors.
        
        Args:
            event_data: Webhook event data from Stripe
            
        Returns:
            Dict containing processing results
        """
        event_type = event_data.get('type')
        event_id = event_data.get('id')
        
        logger.info(f"Processing webhook event: {event_type} (ID: {event_id})")
        
        try:
            # Route to appropriate handler based on event type
            handler_map = {
                'checkout.session.completed': cls._handle_checkout_completed,
                'customer.subscription.created': cls._handle_subscription_created,
                'customer.subscription.updated': cls._handle_subscription_updated,
                'customer.subscription.deleted': cls._handle_subscription_deleted,
                'invoice.payment_succeeded': cls._handle_invoice_payment_succeeded,
                'invoice.payment_failed': cls._handle_invoice_payment_failed,
                'customer.subscription.trial_will_end': cls._handle_trial_will_end,
            }
            
            handler = handler_map.get(event_type)
            if handler:
                result = handler(event_data)
                logger.info(f"Successfully processed {event_type}: {result}")
                return result
            else:
                logger.info(f"Unhandled event type: {event_type}")
                return {
                    'status': 'ignored',
                    'message': f'Event type {event_type} not handled'
                }
                
        except Exception as e:
            logger.error(f"Error processing webhook event {event_type}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @classmethod
    def _handle_checkout_completed(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle checkout.session.completed event.
        This is triggered when a customer completes the checkout process.
        """
        session = event_data['data']['object']
        session_id = session['id']
        
        logger.info(f"Processing checkout completion for session: {session_id}")
        
        try:
            # Process the successful checkout
            result = SubscriptionService.process_successful_checkout(session_id)
            
            if 'error' in result:
                logger.error(f"Error processing checkout {session_id}: {result['error']}")
                return {
                    'status': 'error',
                    'message': result['error']
                }
            
            return {
                'status': 'success',
                'message': f"Checkout processed successfully",
                'subscription_id': result.get('subscription_id'),
                'user_id': result.get('user_id')
            }
            
        except Exception as e:
            logger.error(f"Exception handling checkout completion {session_id}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @classmethod
    def _handle_subscription_created(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle customer.subscription.created event.
        This is triggered when a new subscription is created.
        """
        subscription = event_data['data']['object']
        stripe_subscription_id = subscription['id']
        
        logger.info(f"Processing subscription creation: {stripe_subscription_id}")
        
        try:
            # Get user from subscription metadata
            user_id = subscription.get('metadata', {}).get('user_id')
            if not user_id:
                logger.warning(f"No user_id in subscription metadata: {stripe_subscription_id}")
                return {
                    'status': 'warning',
                    'message': 'No user_id in subscription metadata'
                }
            
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                logger.error(f"User {user_id} not found for subscription {stripe_subscription_id}")
                return {
                    'status': 'error',
                    'message': f'User {user_id} not found'
                }
            
            # Sync subscription data
            result = SubscriptionService.sync_subscription_from_stripe(stripe_subscription_id)
            
            return {
                'status': 'success',
                'message': 'Subscription created and synced',
                'subscription_id': result.get('subscription_id')
            }
            
        except Exception as e:
            logger.error(f"Exception handling subscription creation {stripe_subscription_id}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @classmethod
    def _handle_subscription_updated(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle customer.subscription.updated event.
        This is triggered when a subscription is modified.
        """
        subscription = event_data['data']['object']
        stripe_subscription_id = subscription['id']
        
        logger.info(f"Processing subscription update: {stripe_subscription_id}")
        
        try:
            # Sync subscription data
            result = SubscriptionService.sync_subscription_from_stripe(stripe_subscription_id)
            
            if 'error' in result:
                logger.error(f"Error syncing subscription {stripe_subscription_id}: {result['error']}")
                return {
                    'status': 'error',
                    'message': result['error']
                }
            
            return {
                'status': 'success',
                'message': 'Subscription updated and synced',
                'subscription_id': result.get('subscription_id')
            }
            
        except Exception as e:
            logger.error(f"Exception handling subscription update {stripe_subscription_id}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @classmethod
    def _handle_subscription_deleted(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle customer.subscription.deleted event.
        This is triggered when a subscription is cancelled.
        """
        subscription = event_data['data']['object']
        stripe_subscription_id = subscription['id']
        
        logger.info(f"Processing subscription deletion: {stripe_subscription_id}")
        
        try:
            with transaction.atomic():
                # Find local subscription
                try:
                    local_subscription = Subscription.objects.get(
                        stripe_subscription_id=stripe_subscription_id
                    )
                except Subscription.DoesNotExist:
                    logger.warning(f"Local subscription not found for Stripe ID: {stripe_subscription_id}")
                    return {
                        'status': 'warning',
                        'message': 'Local subscription not found'
                    }
                
                # Update subscription status
                local_subscription.status = Subscription.CANCELED
                local_subscription.save()
                
                logger.info(f"Marked subscription {local_subscription.id} as cancelled")
                
                return {
                    'status': 'success',
                    'message': 'Subscription cancelled',
                    'subscription_id': local_subscription.id
                }
                
        except Exception as e:
            logger.error(f"Exception handling subscription deletion {stripe_subscription_id}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @classmethod
    def _handle_invoice_payment_succeeded(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle invoice.payment_succeeded event.
        This is triggered when an invoice payment is successful.
        """
        invoice = event_data['data']['object']
        invoice_id = invoice['id']
        
        logger.info(f"Processing successful invoice payment: {invoice_id}")
        
        try:
            with transaction.atomic():
                # Get customer and subscription info
                customer_id = invoice['customer']
                subscription_id = invoice.get('subscription')
                
                # Find user by Stripe customer ID
                try:
                    user = User.objects.get(stripe_customer_id=customer_id)
                except User.DoesNotExist:
                    logger.error(f"User not found for customer {customer_id}")
                    return {
                        'status': 'error',
                        'message': f'User not found for customer {customer_id}'
                    }
                
                # Create or update payment history
                payment_history, created = PaymentHistory.objects.get_or_create(
                    stripe_invoice_id=invoice_id,
                    defaults={
                        'user': user,
                        'stripe_payment_intent_id': invoice.get('payment_intent'),
                        'amount_paid': invoice['amount_paid'] / 100,  # Convert from pence
                        'currency': invoice['currency'].upper(),
                        'status': PaymentHistory.PAID,
                        'invoice_pdf_url': invoice.get('invoice_pdf'),
                        'invoice_number': invoice.get('number'),
                        'period_start': datetime.fromtimestamp(
                            invoice['period_start'], 
                            tz=timezone.utc
                        ),
                        'period_end': datetime.fromtimestamp(
                            invoice['period_end'], 
                            tz=timezone.utc
                        ),
                        'payment_date': datetime.fromtimestamp(
                            invoice.get('status_transitions', {}).get('paid_at', invoice['created']),
                            tz=timezone.utc
                        )
                    }
                )
                
                if created:
                    logger.info(f"Created payment history record: {payment_history.id}")
                else:
                    logger.info(f"Updated payment history record: {payment_history.id}")
                
                # If there's a subscription, sync it
                if subscription_id:
                    SubscriptionService.sync_subscription_from_stripe(subscription_id)
                
                return {
                    'status': 'success',
                    'message': 'Invoice payment processed',
                    'payment_history_id': payment_history.id
                }
                
        except Exception as e:
            logger.error(f"Exception handling invoice payment {invoice_id}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @classmethod
    def _handle_invoice_payment_failed(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle invoice.payment_failed event.
        This is triggered when an invoice payment fails.
        """
        invoice = event_data['data']['object']
        invoice_id = invoice['id']
        
        logger.info(f"Processing failed invoice payment: {invoice_id}")
        
        try:
            # Get customer and subscription info
            customer_id = invoice['customer']
            subscription_id = invoice.get('subscription')
            
            # Find user by Stripe customer ID
            try:
                user = User.objects.get(stripe_customer_id=customer_id)
            except User.DoesNotExist:
                logger.error(f"User not found for customer {customer_id}")
                return {
                    'status': 'error',
                    'message': f'User not found for customer {customer_id}'
                }
            
            # If there's a subscription, sync it (status might have changed to past_due)
            if subscription_id:
                SubscriptionService.sync_subscription_from_stripe(subscription_id)
            
            # Log the failed payment for monitoring
            logger.warning(f"Payment failed for user {user.id}, invoice {invoice_id}")
            
            # Here you might want to send notification emails, etc.
            
            return {
                'status': 'success',
                'message': 'Invoice payment failure processed',
                'user_id': user.id
            }
            
        except Exception as e:
            logger.error(f"Exception handling invoice payment failure {invoice_id}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @classmethod
    def _handle_trial_will_end(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Handle customer.subscription.trial_will_end event.
        This is triggered when a subscription trial is about to end.
        """
        subscription = event_data['data']['object']
        stripe_subscription_id = subscription['id']
        
        logger.info(f"Processing trial ending notification: {stripe_subscription_id}")
        
        try:
            # Find local subscription
            try:
                local_subscription = Subscription.objects.get(
                    stripe_subscription_id=stripe_subscription_id
                )
            except Subscription.DoesNotExist:
                logger.warning(f"Local subscription not found for Stripe ID: {stripe_subscription_id}")
                return {
                    'status': 'warning',
                    'message': 'Local subscription not found'
                }
            
            # Log the trial ending
            logger.info(f"Trial ending for subscription {local_subscription.id}, user {local_subscription.user.id}")
            
            # Here you might want to send notification emails, etc.
            
            return {
                'status': 'success',
                'message': 'Trial ending notification processed',
                'subscription_id': local_subscription.id
            }
            
        except Exception as e:
            logger.error(f"Exception handling trial ending {stripe_subscription_id}: {str(e)}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @classmethod
    def get_event_summary(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Get a summary of the webhook event for logging/monitoring.
        
        Args:
            event_data: Webhook event data from Stripe
            
        Returns:
            Dict containing event summary
        """
        event_type = event_data.get('type', 'unknown')
        event_id = event_data.get('id', 'unknown')
        created = event_data.get('created', 0)
        
        # Extract relevant object info based on event type
        data_object = event_data.get('data', {}).get('object', {})
        object_type = data_object.get('object', 'unknown')
        object_id = data_object.get('id', 'unknown')
        
        summary = {
            'event_type': event_type,
            'event_id': event_id,
            'created': datetime.fromtimestamp(created, tz=timezone.utc).isoformat(),
            'object_type': object_type,
            'object_id': object_id,
        }
        
        # Add specific info based on object type
        if object_type == 'checkout.session':
            summary.update({
                'payment_status': data_object.get('payment_status'),
                'customer_id': data_object.get('customer'),
                'subscription_id': data_object.get('subscription'),
            })
        elif object_type == 'subscription':
            summary.update({
                'status': data_object.get('status'),
                'customer_id': data_object.get('customer'),
                'current_period_end': data_object.get('current_period_end'),
            })
        elif object_type == 'invoice':
            summary.update({
                'status': data_object.get('status'),
                'customer_id': data_object.get('customer'),
                'subscription_id': data_object.get('subscription'),
                'amount_paid': data_object.get('amount_paid'),
            })
        
        return summary
