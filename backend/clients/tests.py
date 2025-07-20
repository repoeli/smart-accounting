from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Client

Account = get_user_model()


class ClientModelTest(TestCase):
    """
    Test the Client model.
    """
    
    def setUp(self):
        self.accounting_firm = Account.objects.create_user(
            username='testfirm@example.com',
            email='testfirm@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Firm',
            user_type=Account.ACCOUNTING_FIRM
        )
        
        self.client_data = {
            'accounting_firm': self.accounting_firm,
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'phone_number': '+44 20 7946 0958',
            'company_name': 'Doe Enterprises Ltd',
            'business_type': 'Limited Company',
            'vat_number': 'GB123456789',
            'address_line_1': '123 Test Street',
            'city': 'London',
            'postal_code': 'SW1A 1AA',
            'country': 'United Kingdom'
        }
    
    def test_create_client(self):
        """Test creating a client."""
        client = Client.objects.create(**self.client_data)
        self.assertEqual(client.first_name, 'John')
        self.assertEqual(client.last_name, 'Doe')
        self.assertEqual(client.email, 'john.doe@example.com')
        self.assertEqual(client.accounting_firm, self.accounting_firm)
        self.assertTrue(client.is_active)
    
    def test_client_full_name(self):
        """Test the full_name property."""
        client = Client.objects.create(**self.client_data)
        self.assertEqual(client.full_name, 'John Doe')
    
    def test_client_full_address(self):
        """Test the full_address property."""
        client = Client.objects.create(**self.client_data)
        expected_address = '123 Test Street, London, SW1A 1AA, United Kingdom'
        self.assertEqual(client.full_address, expected_address)
    
    def test_client_str_representation(self):
        """Test the string representation of client."""
        client = Client.objects.create(**self.client_data)
        expected_str = 'John Doe (Doe Enterprises Ltd)'
        self.assertEqual(str(client), expected_str)
    
    def test_client_deactivate(self):
        """Test deactivating a client."""
        client = Client.objects.create(**self.client_data)
        self.assertTrue(client.is_active)
        
        client.deactivate()
        self.assertFalse(client.is_active)
    
    def test_client_reactivate(self):
        """Test reactivating a client."""
        client = Client.objects.create(**self.client_data)
        client.deactivate()
        self.assertFalse(client.is_active)
        
        client.reactivate()
        self.assertTrue(client.is_active)


class ClientAPITest(APITestCase):
    """
    Test the Client API endpoints.
    """
    
    def setUp(self):
        # Create accounting firm user
        self.accounting_firm = Account.objects.create_user(
            username='testfirm@example.com',
            email='testfirm@example.com',
            password='testpass123',
            first_name='Test',
            last_name='Firm',
            user_type=Account.ACCOUNTING_FIRM
        )
        
        # Create individual user (should not have access)
        self.individual_user = Account.objects.create_user(
            username='individual@example.com',
            email='individual@example.com',
            password='testpass123',
            first_name='Individual',
            last_name='User',
            user_type=Account.INDIVIDUAL
        )
        
        # Create test client
        self.client_data = {
            'first_name': 'John',
            'last_name': 'Doe',
            'email': 'john.doe@example.com',
            'phone_number': '+44 20 7946 0958',
            'company_name': 'Doe Enterprises Ltd',
            'business_type': 'Limited Company',
            'vat_number': 'GB123456789',
            'address_line_1': '123 Test Street',
            'city': 'London',
            'postal_code': 'SW1A 1AA',
            'country': 'United Kingdom'
        }
        
        self.test_client = Client.objects.create(
            accounting_firm=self.accounting_firm,
            **self.client_data
        )
        
        self.client_api = APIClient()
    
    def get_jwt_token(self, user):
        """Helper method to get JWT token for a user."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_list_clients_as_accounting_firm(self):
        """Test listing clients as an accounting firm."""
        token = self.get_jwt_token(self.accounting_firm)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = '/api/v1/clients/'
        response = self.client_api.get(url)
        
        print(f"Response status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        if hasattr(response, 'url'):
            print(f"Redirect to: {response.url}")
        
        # Follow redirect manually
        if response.status_code == 301:
            redirect_url = response.headers.get('Location')
            print(f"Following redirect to: {redirect_url}")
            response = self.client_api.get(redirect_url)
            print(f"After redirect status: {response.status_code}")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['email'], 'john.doe@example.com')
    
    def test_list_clients_as_individual_returns_empty(self):
        """Test that individual users cannot see clients."""
        token = self.get_jwt_token(self.individual_user)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('client-list')
        response = self.client_api.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 0)
    
    def test_create_client_as_accounting_firm(self):
        """Test creating a client as an accounting firm."""
        token = self.get_jwt_token(self.accounting_firm)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        new_client_data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane.smith@example.com',
            'company_name': 'Smith Corp'
        }
        
        url = reverse('client-list')
        response = self.client_api.post(url, new_client_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'jane.smith@example.com')
        
        # Verify client was created in database
        client = Client.objects.get(email='jane.smith@example.com')
        self.assertEqual(client.accounting_firm, self.accounting_firm)
    
    def test_create_client_as_individual_fails(self):
        """Test that individual users cannot create clients."""
        token = self.get_jwt_token(self.individual_user)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        new_client_data = {
            'first_name': 'Jane',
            'last_name': 'Smith',
            'email': 'jane.smith@example.com'
        }
        
        url = reverse('client-list')
        response = self.client_api.post(url, new_client_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_client(self):
        """Test updating a client."""
        token = self.get_jwt_token(self.accounting_firm)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        update_data = {
            'company_name': 'Updated Company Name',
            'phone_number': '+44 20 1234 5678'
        }
        
        url = reverse('client-detail', kwargs={'pk': self.test_client.pk})
        response = self.client_api.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify client was updated
        updated_client = Client.objects.get(pk=self.test_client.pk)
        self.assertEqual(updated_client.company_name, 'Updated Company Name')
        self.assertEqual(updated_client.phone_number, '+44 20 1234 5678')
    
    def test_deactivate_client(self):
        """Test deactivating a client."""
        token = self.get_jwt_token(self.accounting_firm)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('client-deactivate', kwargs={'pk': self.test_client.pk})
        response = self.client_api.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('deactivated successfully', response.data['message'])
        
        # Verify client is deactivated
        updated_client = Client.objects.get(pk=self.test_client.pk)
        self.assertFalse(updated_client.is_active)
    
    def test_reactivate_client(self):
        """Test reactivating a client."""
        token = self.get_jwt_token(self.accounting_firm)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # First deactivate the client
        self.test_client.deactivate()
        
        url = reverse('client-reactivate', kwargs={'pk': self.test_client.pk})
        response = self.client_api.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('reactivated successfully', response.data['message'])
        
        # Verify client is reactivated
        updated_client = Client.objects.get(pk=self.test_client.pk)
        self.assertTrue(updated_client.is_active)
    
    def test_filter_clients_by_active_status(self):
        """Test filtering clients by active status."""
        token = self.get_jwt_token(self.accounting_firm)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        # Create an inactive client
        inactive_client = Client.objects.create(
            accounting_firm=self.accounting_firm,
            first_name='Inactive',
            last_name='Client',
            email='inactive@example.com',
            is_active=False
        )
        
        # Test filtering for active clients
        url = reverse('client-list')
        response = self.client_api.get(url, {'is_active': 'true'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        # Test filtering for inactive clients
        response = self.client_api.get(url, {'is_active': 'false'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['email'], 'inactive@example.com')
    
    def test_search_clients(self):
        """Test searching clients."""
        token = self.get_jwt_token(self.accounting_firm)
        self.client_api.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = reverse('client-list')
        response = self.client_api.get(url, {'search': 'john'})
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['first_name'], 'John')
    
    def test_unauthenticated_access_denied(self):
        """Test that unauthenticated users cannot access client endpoints."""
        url = reverse('client-list')
        response = self.client_api.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
