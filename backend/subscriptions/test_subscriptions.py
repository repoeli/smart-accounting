from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from decimal import Decimal
from unittest.mock import patch, MagicMock

from subscriptions.models import Subscription, PaymentHistory
from subscriptions.services import StripeService

User = get_user_model()


class SubscriptionModelTests(TestCase):
    """
    Test cases for Subscription model
    """
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_subscription_creation(self):
        """Test creating a subscription"""
        from django.utils import timezone
        
        subscription = Subscription.objects.create(
            user=self.user,
            plan=Subscription.BASIC,
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            status=Subscription.ACTIVE,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timezone.timedelta(days=30),
            amount=Decimal('9.99'),
            currency='GBP'
        )
        
        self.assertEqual(subscription.user, self.user)
        self.assertEqual(subscription.plan, Subscription.BASIC)
        self.assertEqual(subscription.amount, Decimal('9.99'))
        self.assertTrue(subscription.max_documents == 50)  # Basic plan default
        self.assertFalse(subscription.has_api_access)  # Basic plan default
    
    def test_subscription_features_update(self):
        """Test that features are updated when plan changes"""
        from django.utils import timezone
        
        subscription = Subscription.objects.create(
            user=self.user,
            plan=Subscription.PREMIUM,
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            status=Subscription.ACTIVE,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timezone.timedelta(days=30),
            amount=Decimal('19.99'),
            currency='GBP'
        )
        
        # Premium plan features
        self.assertEqual(subscription.max_documents, 200)
        self.assertTrue(subscription.has_api_access)
        self.assertTrue(subscription.has_report_export)
        self.assertFalse(subscription.has_bulk_upload)  # Only Platinum
        self.assertFalse(subscription.has_white_label)  # Only Platinum


class SubscriptionAPITests(APITestCase):
    """
    Test cases for Subscription API endpoints
    """
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
    
    def test_get_subscription_plans(self):
        """Test getting available subscription plans"""
        response = self.client.get('/api/v1/subscriptions/plans/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(len(response.data) == 3)  # Basic, Premium, Platinum
        
        # Check plan structure
        basic_plan = next(plan for plan in response.data if plan['plan'] == 'basic')
        self.assertEqual(basic_plan['name'], 'Basic Plan')
        self.assertEqual(basic_plan['price'], '9.99')
        self.assertEqual(basic_plan['currency'], 'GBP')
        self.assertFalse(basic_plan['popular'])
    
    def test_get_subscription_no_subscription(self):
        """Test getting subscription when user has none"""
        response = self.client.get('/api/v1/subscriptions/subscription/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('No subscription found', response.data['error'])
        self.assertFalse(response.data['has_subscription'])
    
    def test_get_subscription_with_subscription(self):
        """Test getting subscription when user has one"""
        from django.utils import timezone
        
        subscription = Subscription.objects.create(
            user=self.user,
            plan=Subscription.PREMIUM,
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            status=Subscription.ACTIVE,
            current_period_start=timezone.now(),
            current_period_end=timezone.now() + timezone.timedelta(days=30),
            amount=Decimal('19.99'),
            currency='GBP'
        )
        
        response = self.client.get('/api/v1/subscriptions/subscription/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['plan'], 'premium')
        self.assertEqual(response.data['status'], 'active')
        self.assertEqual(response.data['amount'], '19.99')
        self.assertTrue(response.data['is_active'])
    
    @patch('subscriptions.services.stripe.Customer.create')
    @patch('subscriptions.services.stripe.PaymentMethod.attach')
    @patch('subscriptions.services.stripe.Customer.modify')
    @patch('subscriptions.services.stripe.Subscription.create')
    def test_create_subscription(self, mock_sub_create, mock_cust_modify, 
                               mock_pm_attach, mock_cust_create):
        """Test creating a new subscription"""
        # Mock Stripe responses
        mock_customer = MagicMock()
        mock_customer.id = 'cus_test123'
        mock_cust_create.return_value = mock_customer
        
        mock_subscription = MagicMock()
        mock_subscription.id = 'sub_test123'
        mock_subscription.customer = 'cus_test123'
        mock_subscription.status = 'active'
        mock_subscription.current_period_start = 1640995200  # timestamp
        mock_subscription.current_period_end = 1643673600    # timestamp
        mock_subscription.cancel_at_period_end = False
        mock_subscription.latest_invoice.payment_intent.client_secret = 'pi_test_secret'
        mock_subscription.metadata = {'plan': 'basic'}
        mock_subscription.__getitem__ = lambda self, key: {
            'items': {'data': [{'price': {'id': 'price_test', 'unit_amount': 999, 'currency': 'gbp'}}]}
        }[key]
        mock_sub_create.return_value = mock_subscription
        
        data = {
            'plan': 'basic',
            'payment_method_id': 'pm_test123'
        }
        
        response = self.client.post('/api/v1/subscriptions/subscription/', data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('subscription', response.data)
        self.assertIn('stripe_subscription', response.data)
        
        # Check that subscription was created in database
        subscription = Subscription.objects.get(user=self.user)
        self.assertEqual(subscription.plan, 'basic')
        self.assertEqual(subscription.stripe_subscription_id, 'sub_test123')
    
    def test_create_subscription_invalid_plan(self):
        """Test creating subscription with invalid plan"""
        data = {
            'plan': 'invalid_plan',
            'payment_method_id': 'pm_test123'
        }
        
        response = self.client.post('/api/v1/subscriptions/subscription/', data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('plan', response.data)
    
    def test_payment_history_empty(self):
        """Test getting payment history when user has none"""
        response = self.client.get('/api/v1/subscriptions/payment-history/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
    
    def test_payment_history_with_payments(self):
        """Test getting payment history with existing payments"""
        from django.utils import timezone
        
        payment = PaymentHistory.objects.create(
            user=self.user,
            stripe_invoice_id='in_test123',
            amount_paid=Decimal('19.99'),
            currency='GBP',
            status=PaymentHistory.PAID,
            payment_date=timezone.now(),
            period_start=timezone.now(),
            period_end=timezone.now() + timezone.timedelta(days=30)
        )
        
        response = self.client.get('/api/v1/subscriptions/payment-history/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['amount_paid'], '19.99')
        self.assertEqual(response.data[0]['status'], 'paid')


class StripeServiceTests(TestCase):
    """
    Test cases for StripeService
    """
    
    def test_get_available_plans(self):
        """Test getting available plans"""
        plans = StripeService.get_available_plans()
        
        self.assertEqual(len(plans), 3)
        self.assertTrue(any(plan['plan'] == 'basic' for plan in plans))
        self.assertTrue(any(plan['plan'] == 'premium' for plan in plans))
        self.assertTrue(any(plan['plan'] == 'platinum' for plan in plans))
    
    def test_get_plan_details(self):
        """Test getting specific plan details"""
        basic_plan = StripeService.get_plan_details('basic')
        
        self.assertIsNotNone(basic_plan)
        self.assertEqual(basic_plan['name'], 'Basic Plan')
        self.assertEqual(basic_plan['price'], Decimal('9.99'))
        self.assertEqual(basic_plan['features']['max_documents'], 50)
        self.assertFalse(basic_plan['features']['has_api_access'])
        
        # Test invalid plan
        invalid_plan = StripeService.get_plan_details('invalid')
        self.assertIsNone(invalid_plan)