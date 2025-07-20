from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch, MagicMock
from .models import Subscription

Account = get_user_model()


class SubscriptionViewsTestCase(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = Account.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def test_subscription_plans_view(self):
        """Test that subscription plans are returned correctly"""
        url = reverse('subscription-plans')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 3)  # 3 plans: basic, premium, platinum
        
        # Check basic plan structure
        basic_plan = next(plan for plan in response.data if plan['id'] == 'basic')
        self.assertEqual(basic_plan['name'], 'Basic')
        self.assertEqual(basic_plan['price'], 9.99)
        self.assertEqual(basic_plan['currency'], 'GBP')
        self.assertIn('features', basic_plan)
        self.assertIn('max_documents', basic_plan)
    
    def test_user_subscription_view_no_subscription(self):
        """Test user subscription view when user has no subscription"""
        self.client.force_authenticate(user=self.user)
        url = reverse('user-subscription')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['plan'], None)
        self.assertEqual(response.data['status'], 'no_subscription')
    
    def test_user_subscription_view_with_subscription(self):
        """Test user subscription view when user has a subscription"""
        # Create a subscription for the user
        subscription = Subscription.objects.create(
            user=self.user,
            plan='premium',
            stripe_subscription_id='sub_test123',
            stripe_customer_id='cus_test123',
            status='active',
            current_period_start='2023-01-01T00:00:00Z',
            current_period_end='2023-02-01T00:00:00Z',
            amount=19.99,
            currency='GBP'
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('user-subscription')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['plan'], 'premium')
        self.assertEqual(response.data['status'], 'active')
        self.assertEqual(response.data['amount'], 19.99)
        self.assertEqual(response.data['currency'], 'GBP')
    
    @patch('subscriptions.views.stripe.checkout.Session.create')
    @patch('subscriptions.views.stripe.Customer.create')
    def test_create_checkout_session(self, mock_customer_create, mock_session_create):
        """Test creating a checkout session"""
        # Mock Stripe responses
        mock_customer_create.return_value = MagicMock(id='cus_test123')
        mock_session_create.return_value = MagicMock(
            url='https://checkout.stripe.com/test',
            id='cs_test123'
        )
        
        self.client.force_authenticate(user=self.user)
        url = reverse('create-checkout-session')
        data = {'plan_id': 'premium'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('checkout_url', response.data)
        self.assertIn('session_id', response.data)
        
        # Verify Stripe was called correctly
        mock_customer_create.assert_called_once()
        mock_session_create.assert_called_once()
    
    def test_create_checkout_session_invalid_plan(self):
        """Test creating checkout session with invalid plan ID"""
        self.client.force_authenticate(user=self.user)
        url = reverse('create-checkout-session')
        data = {'plan_id': 'invalid'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_create_checkout_session_unauthenticated(self):
        """Test creating checkout session without authentication"""
        url = reverse('create-checkout-session')
        data = {'plan_id': 'premium'}
        
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
