from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from .models import Client

User = get_user_model()


class ClientModelTest(TestCase):
    """
    Test cases for the Client model.
    """
    
    def setUp(self):
        self.accounting_firm = User.objects.create_user(
            username='testfirm@example.com',
            email='testfirm@example.com',
            password='testpass123',
            user_type='accounting_firm',
            first_name='Test',
            last_name='Firm'
        )
        
        self.client_data = {
            'company_name': 'Test Company Ltd',
            'contact_person': 'John Smith',
            'email': 'john@testcompany.com',
            'phone_number': '07700 900000',
            'address_line_1': '123 Test Street',
            'city': 'London',
            'postal_code': 'SW1A 1AA',
            'country': 'United Kingdom',
            'vat_number': 'GB123456789',
            'business_type': Client.LIMITED_COMPANY,
            'companies_house_number': '12345678'
        }
    
    def test_create_client(self):
        """Test creating a client with valid data"""
        client = Client.objects.create(
            accounting_firm=self.accounting_firm,
            **self.client_data
        )
        
        self.assertEqual(client.company_name, 'Test Company Ltd')
        self.assertEqual(client.contact_person, 'John Smith')
        self.assertEqual(client.accounting_firm, self.accounting_firm)
        self.assertTrue(client.is_active)
        self.assertTrue(client.is_vat_registered)
    
    def test_client_str_representation(self):
        """Test string representation of client"""
        client = Client.objects.create(
            accounting_firm=self.accounting_firm,
            **self.client_data
        )
        
        expected_str = f"{self.client_data['company_name']} ({self.client_data['contact_person']})"
        self.assertEqual(str(client), expected_str)
    
    def test_full_address_property(self):
        """Test full address property"""
        client = Client.objects.create(
            accounting_firm=self.accounting_firm,
            **self.client_data
        )
        
        expected_address = "123 Test Street, London, SW1A 1AA, United Kingdom"
        self.assertEqual(client.full_address, expected_address)
    
    def test_deactivate_client(self):
        """Test deactivating a client"""
        client = Client.objects.create(
            accounting_firm=self.accounting_firm,
            **self.client_data
        )
        
        self.assertTrue(client.is_active)
        self.assertIsNone(client.deactivated_at)
        
        client.deactivate()
        
        self.assertFalse(client.is_active)
        self.assertIsNotNone(client.deactivated_at)
    
    def test_reactivate_client(self):
        """Test reactivating a client"""
        client = Client.objects.create(
            accounting_firm=self.accounting_firm,
            **self.client_data
        )
        
        client.deactivate()
        self.assertFalse(client.is_active)
        
        client.reactivate()
        self.assertTrue(client.is_active)
        self.assertIsNone(client.deactivated_at)


class ClientAPITest(APITestCase):
    """
    Test cases for the Client API endpoints.
    """
    
    def setUp(self):
        # Create accounting firm user
        self.accounting_firm = User.objects.create_user(
            username='testfirm@example.com',
            email='testfirm@example.com',
            password='testpass123',
            user_type='accounting_firm',
            first_name='Test',
            last_name='Firm'
        )
        
        # Create individual user (should not have access)
        self.individual_user = User.objects.create_user(
            username='individual@example.com',
            email='individual@example.com',
            password='testpass123',
            user_type='individual',
            first_name='Individual',
            last_name='User'
        )
        
        # Create another accounting firm
        self.other_firm = User.objects.create_user(
            username='otherfirm@example.com',
            email='otherfirm@example.com',
            password='testpass123',
            user_type='accounting_firm',
            first_name='Other',
            last_name='Firm'
        )
        
        self.client_data = {
            'company_name': 'Test Company Ltd',
            'contact_person': 'John Smith',
            'email': 'john@testcompany.com',
            'phone_number': '07700 900000',
            'address_line_1': '123 Test Street',
            'city': 'London',
            'postal_code': 'SW1A 1AA',
            'country': 'United Kingdom',
            'vat_number': 'GB123456789',
            'business_type': Client.LIMITED_COMPANY,
            'companies_house_number': '12345678'
        }
    
    def get_jwt_token(self, user):
        """Get JWT token for authentication"""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def test_create_client_as_accounting_firm(self):
        """Test creating a client as an accounting firm"""
        token = self.get_jwt_token(self.accounting_firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = '/api/v1/clients/'
        response = self.client.post(url, self.client_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['company_name'], 'Test Company Ltd')
        self.assertEqual(response.data['contact_person'], 'John Smith')
        
        # Verify client was created in database
        client = Client.objects.get(id=response.data['id'])
        self.assertEqual(client.accounting_firm, self.accounting_firm)
    
    def test_create_client_as_individual_forbidden(self):
        """Test that individual users cannot create clients"""
        token = self.get_jwt_token(self.individual_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = '/api/v1/clients/'
        response = self.client.post(url, self.client_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_list_clients_for_accounting_firm(self):
        """Test listing clients for an accounting firm"""
        # Create clients for different firms
        Client.objects.create(accounting_firm=self.accounting_firm, **self.client_data)
        
        other_client_data = self.client_data.copy()
        other_client_data['company_name'] = 'Other Company'
        other_client_data['email'] = 'other@example.com'
        Client.objects.create(accounting_firm=self.other_firm, **other_client_data)
        
        # Test that accounting firm only sees their own clients
        token = self.get_jwt_token(self.accounting_firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = '/api/v1/clients/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['company_name'], 'Test Company Ltd')
    
    def test_list_clients_for_individual_empty(self):
        """Test that individual users get empty client list"""
        Client.objects.create(accounting_firm=self.accounting_firm, **self.client_data)
        
        token = self.get_jwt_token(self.individual_user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = '/api/v1/clients/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 0)
    
    def test_update_client(self):
        """Test updating client information"""
        client = Client.objects.create(accounting_firm=self.accounting_firm, **self.client_data)
        
        token = self.get_jwt_token(self.accounting_firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = f'/api/v1/clients/{client.id}/'
        update_data = {'company_name': 'Updated Company Name'}
        response = self.client.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['company_name'], 'Updated Company Name')
        
        # Verify in database
        client.refresh_from_db()
        self.assertEqual(client.company_name, 'Updated Company Name')
    
    def test_deactivate_client(self):
        """Test deactivating a client"""
        client = Client.objects.create(accounting_firm=self.accounting_firm, **self.client_data)
        
        token = self.get_jwt_token(self.accounting_firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = f'/api/v1/clients/{client.id}/deactivate/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data['is_active'])
        
        # Verify in database
        client.refresh_from_db()
        self.assertFalse(client.is_active)
        self.assertIsNotNone(client.deactivated_at)
    
    def test_reactivate_client(self):
        """Test reactivating a client"""
        client = Client.objects.create(accounting_firm=self.accounting_firm, **self.client_data)
        client.deactivate()
        
        token = self.get_jwt_token(self.accounting_firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = f'/api/v1/clients/{client.id}/reactivate/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['is_active'])
        
        # Verify in database
        client.refresh_from_db()
        self.assertTrue(client.is_active)
        self.assertIsNone(client.deactivated_at)
    
    def test_client_stats(self):
        """Test client statistics endpoint"""
        # Create test clients
        Client.objects.create(accounting_firm=self.accounting_firm, **self.client_data)
        
        inactive_data = self.client_data.copy()
        inactive_data['company_name'] = 'Inactive Company'
        inactive_data['email'] = 'inactive@example.com'
        inactive_client = Client.objects.create(accounting_firm=self.accounting_firm, **inactive_data)
        inactive_client.deactivate()
        
        token = self.get_jwt_token(self.accounting_firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        url = '/api/v1/clients/stats/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total_clients'], 2)
        self.assertEqual(response.data['active_clients'], 1)
        self.assertEqual(response.data['inactive_clients'], 1)
        self.assertEqual(response.data['vat_registered_clients'], 2)
    
    def test_vat_number_validation(self):
        """Test VAT number validation"""
        token = self.get_jwt_token(self.accounting_firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        invalid_data = self.client_data.copy()
        invalid_data['vat_number'] = 'INVALID123'
        
        url = '/api/v1/clients/'
        response = self.client.post(url, invalid_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('vat_number', response.data)
    
    def test_postal_code_formatting(self):
        """Test postal code formatting"""
        token = self.get_jwt_token(self.accounting_firm)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        
        data = self.client_data.copy()
        data['postal_code'] = 'sw1a1aa'  # No space, lowercase
        
        url = '/api/v1/clients/'
        response = self.client.post(url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        # Should be formatted as 'SW1A 1AA'
        client = Client.objects.get(id=response.data['id'])
        self.assertEqual(client.postal_code, 'SW1A 1AA')
