import json
from datetime import datetime, timezone
from unittest.mock import patch, MagicMock

from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Subscription, PaymentHistory
from .webhooks import (
    handle_subscription_updated,
    handle_subscription_deleted, 
    handle_payment_succeeded,
    handle_payment_failed
)

User = get_user_model()


class SubscriptionModelTest(TestCase):
    """Test the Subscription model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
    
    def test_subscription_creation(self):
        """Test creating a subscription"""
        subscription = Subscription.objects.create(
            user=self.user,
            plan=Subscription.BASIC,
            status=Subscription.ACTIVE,
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc),
            amount=9.99,
            currency='GBP'
        )
        
        self.assertEqual(subscription.user, self.user)
        self.assertEqual(subscription.plan, Subscription.BASIC)
        self.assertEqual(subscription.max_documents, 50)  # Basic plan default
        self.assertFalse(subscription.has_api_access)
    
    def test_update_features_for_plan(self):
        """Test that features are updated based on plan"""
        subscription = Subscription(plan=Subscription.PREMIUM)
        subscription.update_features_for_plan()
        
        self.assertEqual(subscription.max_documents, 200)
        self.assertTrue(subscription.has_api_access)
        self.assertTrue(subscription.has_report_export)
        self.assertFalse(subscription.has_bulk_upload)


class SubscriptionAPITest(APITestCase):
    """Test the subscription API endpoints"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        # Create JWT token for authentication
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        # Create a subscription for the user
        self.subscription = Subscription.objects.create(
            user=self.user,
            plan=Subscription.BASIC,
            status=Subscription.ACTIVE,
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc),
            amount=9.99,
            currency='GBP'
        )
    
    def test_get_subscription_detail(self):
        """Test retrieving subscription details"""
        url = reverse('subscription-detail')
        response = self.client.get(url, follow=True)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data['plan'], Subscription.BASIC)
        self.assertEqual(data['status'], Subscription.ACTIVE)
        self.assertEqual(data['plan_display'], 'Basic')
    
    def test_get_subscription_detail_not_found(self):
        """Test retrieving subscription details when none exists"""
        # Delete the subscription
        self.subscription.delete()
        
        url = reverse('subscription-detail')
        response = self.client.get(url, follow=True)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_get_payment_history(self):
        """Test retrieving payment history"""
        # Create a payment history record
        PaymentHistory.objects.create(
            user=self.user,
            stripe_invoice_id='inv_test123',
            amount_paid=9.99,
            currency='GBP',
            status=PaymentHistory.PAID,
            period_start=datetime.now(timezone.utc),
            period_end=datetime.now(timezone.utc),
            payment_date=datetime.now(timezone.utc)
        )
        
        url = reverse('payment-history')
        response = self.client.get(url, follow=True)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['amount_paid'], '9.99')
    
    @patch('stripe.billing_portal.Session.create')
    def test_customer_portal_success(self, mock_stripe_create):
        """Test creating customer portal link successfully"""
        mock_stripe_create.return_value = MagicMock(url='https://billing.stripe.com/session/123')
        
        url = reverse('customer-portal')
        response = self.client.post(url, data={}, format='json', follow=True, secure=True)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('url', data)
        self.assertIn('billing.stripe.com', data['url'])
    
    def test_customer_portal_no_subscription(self):
        """Test customer portal when user has no subscription"""
        self.subscription.delete()
        
        url = reverse('customer-portal')
        response = self.client.post(url, data={}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    @patch('stripe.Subscription.modify')
    def test_cancel_subscription_success(self, mock_stripe_modify):
        """Test canceling subscription successfully"""
        mock_stripe_modify.return_value = MagicMock(cancel_at_period_end=True)
        
        url = reverse('cancel-subscription')
        response = self.client.post(url, data={}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertIn('message', data)
        self.assertTrue(data['cancel_at_period_end'])
        
        # Check that the subscription was updated
        self.subscription.refresh_from_db()
        self.assertTrue(self.subscription.cancel_at_period_end)
    
    def test_cancel_subscription_no_subscription(self):
        """Test canceling subscription when user has no subscription"""
        self.subscription.delete()
        
        url = reverse('cancel-subscription')
        response = self.client.post(url, data={}, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class WebhookTest(TestCase):
    """Test webhook handlers"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        
        self.subscription = Subscription.objects.create(
            user=self.user,
            plan=Subscription.BASIC,
            status=Subscription.ACTIVE,
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            current_period_start=datetime.now(timezone.utc),
            current_period_end=datetime.now(timezone.utc),
            amount=9.99,
            currency='GBP'
        )
    
    def test_handle_subscription_updated(self):
        """Test handling subscription updated webhook"""
        subscription_data = {
            'id': 'sub_test123',
            'status': 'active',
            'cancel_at_period_end': True,
            'current_period_start': 1640995200,  # 2022-01-01
            'current_period_end': 1643673600,    # 2022-02-01
            'items': {
                'data': [{
                    'price': {
                        'id': 'price_basic'
                    }
                }]
            }
        }
        
        with patch('django.conf.settings.STRIPE_BASIC_PRICE_ID', 'price_basic'):
            handle_subscription_updated(subscription_data)
        
        self.subscription.refresh_from_db()
        self.assertTrue(self.subscription.cancel_at_period_end)
        self.assertEqual(self.subscription.status, 'active')
    
    def test_handle_subscription_deleted(self):
        """Test handling subscription deleted webhook"""
        subscription_data = {
            'id': 'sub_test123'
        }
        
        handle_subscription_deleted(subscription_data)
        
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, Subscription.CANCELED)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.subscription_status, 'canceled')
    
    def test_handle_payment_succeeded(self):
        """Test handling payment succeeded webhook"""
        invoice_data = {
            'id': 'inv_test123',
            'customer': 'cus_test123',
            'payment_intent': 'pi_test123',
            'amount_paid': 999,  # 9.99 in cents
            'currency': 'gbp',
            'invoice_pdf': 'https://example.com/invoice.pdf',
            'number': 'INV-001',
            'period_start': 1640995200,
            'period_end': 1643673600,
            'status_transitions': {
                'paid_at': 1640995200
            }
        }
        
        handle_payment_succeeded(invoice_data)
        
        payment = PaymentHistory.objects.get(stripe_invoice_id='inv_test123')
        self.assertEqual(payment.user, self.user)
        self.assertEqual(float(payment.amount_paid), 9.99)
        self.assertEqual(payment.currency, 'GBP')
        self.assertEqual(payment.status, PaymentHistory.PAID)
    
    def test_handle_payment_failed(self):
        """Test handling payment failed webhook"""
        invoice_data = {
            'customer': 'cus_test123'
        }
        
        handle_payment_failed(invoice_data)
        
        self.subscription.refresh_from_db()
        self.assertEqual(self.subscription.status, Subscription.PAST_DUE)
        
        self.user.refresh_from_db()
        self.assertEqual(self.user.subscription_status, 'past_due')
