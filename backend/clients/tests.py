from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Client
from subscriptions.models import Subscription

User = get_user_model()


class ClientModelTestCase(TestCase):
    """Test cases for the Client model"""
    
    def setUp(self):
        """Set up test data"""
        self.firm = User.objects.create_user(
            email='firm@example.com',
            username='firm@example.com',
            password='testpass123',
            user_type=User.ACCOUNTING_FIRM,
            company_name='Test Accounting Firm'
        )
        
        self.individual_user = User.objects.create_user(
            email='individual@example.com',
            username='individual@example.com',
            password='testpass123',
            user_type=User.INDIVIDUAL
        )
    
    def test_create_client_success(self):
        """Test creating a client successfully"""
        client = Client.objects.create(
            name='Test Client',
            firm=self.firm,
            email='client@example.com',
            phone='123-456-7890',
            business_type=Client.LIMITED_COMPANY
        )
        
        self.assertEqual(client.name, 'Test Client')
        self.assertEqual(client.firm, self.firm)
        self.assertEqual(client.email, 'client@example.com')
        self.assertEqual(str(client), f'Test Client ({self.firm.company_name})')
    
    def test_client_unique_constraint(self):
        """Test that client names must be unique per firm"""
        # Create first client
        Client.objects.create(name='Test Client', firm=self.firm)
        
        # Try to create another client with same name for same firm - should fail
        from django.db import IntegrityError
        with self.assertRaises((IntegrityError, ValidationError)):
            Client.objects.create(name='Test Client', firm=self.firm)
    
    def test_client_validation_non_firm_user(self):
        """Test that clients cannot be assigned to non-firm users"""
        from django.core.exceptions import ValidationError
        
        client = Client(
            name='Test Client',
            firm=self.individual_user,
            email='client@example.com'
        )
        
        with self.assertRaises(ValidationError):
            client.full_clean()


class ClientAPITestCase(APITestCase):
    """Test cases for the Client API"""
    
    def setUp(self):
        """Set up test data"""
        self.firm = User.objects.create_user(
            email='firm@example.com',
            username='firm@example.com',
            password='testpass123',
            user_type=User.ACCOUNTING_FIRM,
            company_name='Test Accounting Firm'
        )
        
        self.other_firm = User.objects.create_user(
            email='otherfirm@example.com',
            username='otherfirm@example.com',
            password='testpass123',
            user_type=User.ACCOUNTING_FIRM,
            company_name='Other Accounting Firm'
        )
        
        self.individual_user = User.objects.create_user(
            email='individual@example.com',
            username='individual@example.com',
            password='testpass123',
            user_type=User.INDIVIDUAL
        )
        
        # Create subscription for the firm
        self.subscription = Subscription.objects.create(
            user=self.firm,
            plan=Subscription.BASIC,
            stripe_subscription_id='test_sub_123',
            stripe_customer_id='test_cust_123',
            current_period_start='2024-01-01T00:00:00Z',
            current_period_end='2024-02-01T00:00:00Z',
            amount=29.99
        )
        
        self.client_data = {
            'name': 'Test Client',
            'email': 'client@example.com',
            'phone': '123-456-7890',
            'address': '123 Test Street, Test City',
            'business_type': Client.LIMITED_COMPANY,
            'tax_reference': 'TR123456',
            'vat_number': 'VAT123456'
        }
    
    def get_jwt_token(self, user):
        """Get JWT token for user authentication"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_create_client_success(self):
        """Test creating a client successfully"""
        token = self.get_jwt_token(self.firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.post('/api/v1/clients/', self.client_data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'Test Client')
        self.assertEqual(response.data['email'], 'client@example.com')
        
        # Verify client was created in database
        client = Client.objects.get(id=response.data['id'])
        self.assertEqual(client.firm, self.firm)
    
    def test_create_client_unauthenticated(self):
        """Test that unauthenticated users cannot create clients"""
        response = self.client.post('/api/v1/clients/', self.client_data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_client_individual_user(self):
        """Test that individual users cannot create clients"""
        token = self.get_jwt_token(self.individual_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.post('/api/v1/clients/', self.client_data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_clients_scoped_to_firm(self):
        """Test that firms only see their own clients"""
        # Create clients for both firms
        client1 = Client.objects.create(name='Client 1', firm=self.firm)
        client2 = Client.objects.create(name='Client 2', firm=self.firm)
        client3 = Client.objects.create(name='Client 3', firm=self.other_firm)
        
        # Authenticate as first firm
        token = self.get_jwt_token(self.firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        response = self.client.get('/api/v1/clients/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Verify only clients belonging to the authenticated firm are returned
        client_names = [client['name'] for client in response.data['results']]
        self.assertIn('Client 1', client_names)
        self.assertIn('Client 2', client_names)
        self.assertNotIn('Client 3', client_names)
    
    def test_subscription_limit_enforcement(self):
        """Test that subscription limits are enforced"""
        token = self.get_jwt_token(self.firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create clients up to the basic plan limit (5)
        for i in range(5):
            Client.objects.create(name=f'Client {i+1}', firm=self.firm)
        
        # Try to create one more client - should fail
        response = self.client.post('/api/v1/clients/', self.client_data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Client limit reached', str(response.data))
    
    def test_subscription_info_endpoint(self):
        """Test the subscription info endpoint"""
        token = self.get_jwt_token(self.firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create 2 clients
        Client.objects.create(name='Client 1', firm=self.firm)
        Client.objects.create(name='Client 2', firm=self.firm)
        
        response = self.client.get('/api/v1/clients/subscription_info/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['current_clients'], 2)
        self.assertEqual(response.data['max_clients'], 5)  # Basic plan
        self.assertEqual(response.data['remaining_clients'], 3)
        self.assertEqual(response.data['subscription_plan'], 'basic')
        self.assertTrue(response.data['can_add_clients'])
