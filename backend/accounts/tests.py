from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from django.utils import timezone
from unittest.mock import patch
import json

Account = get_user_model()


class UserProfileManagementTests(APITestCase):
    """Test user profile management functionality"""

    def setUp(self):
        """Set up test data"""
        self.client = APIClient()
        
        # Create test user
        self.user_data = {
            'email': 'test@example.com',
            'password': 'testpass123',
            'first_name': 'John',
            'last_name': 'Doe',
            'company_name': 'Test Company',
            'phone_number': '+44123456789',
            'address': '123 Test Street',
            'city': 'London',
            'postal_code': 'SW1A 1AA',
            'country': 'UK'
        }
        
        self.user = Account.objects.create_user(
            username=self.user_data['email'],  # Username defaults to email
            email=self.user_data['email'],
            password=self.user_data['password'],
            first_name=self.user_data['first_name'],
            last_name=self.user_data['last_name'],
            company_name=self.user_data['company_name'],
            phone_number=self.user_data['phone_number'],
            address=self.user_data['address'],
            city=self.user_data['city'],
            postal_code=self.user_data['postal_code'],
            country=self.user_data['country'],
            is_active=True
        )
        
        # Create second user for testing isolation
        self.other_user = Account.objects.create_user(
            username='other@example.com',
            email='other@example.com',
            password='otherpass123',
            first_name='Jane',
            last_name='Smith',
            company_name='Other Company',
            is_active=True
        )

    def authenticate_user(self, user=None):
        """Helper method to authenticate a user"""
        if user is None:
            user = self.user
        
        response = self.client.post('/api/v1/accounts/token/', {
            'email': user.email,
            'password': 'testpass123' if user == self.user else 'otherpass123'
        })
        
        if response.status_code == 200:
            token = response.json()['access']
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
            return True
        return False

    def test_debug_authentication(self):
        """Debug authentication issue"""
        print(f"User email: {self.user.email}")
        print(f"User username: {self.user.username}")
        
        # Test token endpoint with email
        token_url = '/api/v1/accounts/token/'
        auth_data = {
            'email': self.user.email,
            'password': 'testpass123'
        }
        
        response = self.client.post(token_url, auth_data)
        print(f"Token response status: {response.status_code}")
        print(f"Token response content: {response.content}")
        
        if response.status_code == 200:
            token = response.json()['access']
            print(f"Token received: {token[:50]}...")
            
            self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
            
            # Test me endpoint
            me_url = '/api/v1/accounts/me/'
            response = self.client.get(me_url)
            print(f"Me response status: {response.status_code}")
            print(f"Me response content: {response.content}")

    def test_retrieve_user_profile(self):
        """Test retrieving the current user's profile"""
        success = self.authenticate_user()
        self.assertTrue(success, "Authentication failed")
        
        url = '/api/v1/accounts/me/'
        response = self.client.get(url)
        
        print(f"URL: {url}")
        print(f"Status: {response.status_code}")
        if hasattr(response, 'data'):
            print(f"Response: {response.data}")
        else:
            print(f"Response content: {response.content}")
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check that all expected profile fields are returned
        expected_fields = [
            'id', 'email', 'first_name', 'last_name', 'company_name',
            'address', 'city', 'postal_code', 'country', 'phone_number',
            'subscription_status', 'date_joined', 'is_active'
        ]
        
        for field in expected_fields:
            self.assertIn(field, response.data)
        
        # Check field values
        self.assertEqual(response.data['email'], self.user.email)
        self.assertEqual(response.data['first_name'], self.user.first_name)
        self.assertEqual(response.data['last_name'], self.user.last_name)
        self.assertEqual(response.data['company_name'], self.user.company_name)
        self.assertEqual(response.data['phone_number'], self.user.phone_number)

    def test_retrieve_profile_unauthenticated(self):
        """Test that unauthenticated users cannot access profile"""
        url = reverse('account-me')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_user_profile_put(self):
        """Test updating user profile with PUT request"""
        self.authenticate_user()
        
        # Store original updated_at time
        original_updated_at = self.user.updated_at
        
        url = reverse('account-detail', kwargs={'pk': self.user.id})
        update_data = {
            'first_name': 'Updated John',
            'last_name': 'Updated Doe',
            'company_name': 'Updated Company',
            'phone_number': '+44987654321',
            'address': '456 Updated Street',
            'city': 'Manchester',
            'postal_code': 'M1 1AA',
            'country': 'United Kingdom'
        }
        
        response = self.client.put(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh user from database
        self.user.refresh_from_db()
        
        # Check that fields were updated
        self.assertEqual(self.user.first_name, update_data['first_name'])
        self.assertEqual(self.user.last_name, update_data['last_name'])
        self.assertEqual(self.user.company_name, update_data['company_name'])
        self.assertEqual(self.user.phone_number, update_data['phone_number'])
        self.assertEqual(self.user.address, update_data['address'])
        self.assertEqual(self.user.city, update_data['city'])
        self.assertEqual(self.user.postal_code, update_data['postal_code'])
        self.assertEqual(self.user.country, update_data['country'])
        
        # Check that updated_at was modified
        self.assertGreater(self.user.updated_at, original_updated_at)

    def test_update_user_profile_patch(self):
        """Test partial update of user profile with PATCH request"""
        self.authenticate_user()
        
        original_last_name = self.user.last_name
        original_updated_at = self.user.updated_at
        
        url = reverse('account-detail', kwargs={'pk': self.user.id})
        update_data = {
            'first_name': 'Partially Updated',
            'company_name': 'New Company Name'
        }
        
        response = self.client.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh user from database
        self.user.refresh_from_db()
        
        # Check that only specified fields were updated
        self.assertEqual(self.user.first_name, update_data['first_name'])
        self.assertEqual(self.user.company_name, update_data['company_name'])
        self.assertEqual(self.user.last_name, original_last_name)  # Should remain unchanged
        
        # Check that updated_at was modified
        self.assertGreater(self.user.updated_at, original_updated_at)

    def test_cannot_update_email(self):
        """Test that users cannot update their email address"""
        self.authenticate_user()
        
        original_email = self.user.email
        
        url = reverse('account-detail', kwargs={'pk': self.user.id})
        update_data = {
            'email': 'newemail@example.com',
            'first_name': 'Updated Name'
        }
        
        response = self.client.patch(url, update_data, format='json')
        
        # Should succeed (email field should be ignored)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh user from database
        self.user.refresh_from_db()
        
        # Email should remain unchanged
        self.assertEqual(self.user.email, original_email)
        # But other fields should update
        self.assertEqual(self.user.first_name, update_data['first_name'])

    def test_cannot_update_user_type(self):
        """Test that users cannot update their user type"""
        self.authenticate_user()
        
        original_user_type = self.user.user_type
        
        url = reverse('account-detail', kwargs={'pk': self.user.id})
        update_data = {
            'user_type': 'accounting_firm',
            'first_name': 'Updated Name'
        }
        
        response = self.client.patch(url, update_data, format='json')
        
        # Should succeed (user_type field should be ignored)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh user from database
        self.user.refresh_from_db()
        
        # User type should remain unchanged
        self.assertEqual(self.user.user_type, original_user_type)
        # But other fields should update
        self.assertEqual(self.user.first_name, update_data['first_name'])

    def test_cannot_update_other_users_profile(self):
        """Test that users cannot update other users' profiles"""
        self.authenticate_user()  # Authenticate as first user
        
        # Try to update other user's profile
        url = reverse('account-detail', kwargs={'pk': self.other_user.id})
        update_data = {
            'first_name': 'Hacked Name'
        }
        
        response = self.client.patch(url, update_data, format='json')
        
        # Should return 404 (not found) because of queryset filtering
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify other user's data was not changed
        self.other_user.refresh_from_db()
        self.assertNotEqual(self.other_user.first_name, update_data['first_name'])

    def test_unauthenticated_cannot_update_profile(self):
        """Test that unauthenticated users cannot update profiles"""
        url = reverse('account-detail', kwargs={'pk': self.user.id})
        update_data = {
            'first_name': 'Unauthorized Update'
        }
        
        response = self.client.patch(url, update_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Verify user's data was not changed
        self.user.refresh_from_db()
        self.assertNotEqual(self.user.first_name, update_data['first_name'])

    def test_profile_update_validation(self):
        """Test validation of profile update data"""
        self.authenticate_user()
        
        url = reverse('account-detail', kwargs={'pk': self.user.id})
        
        # Test with invalid email format (should be ignored since it's read-only)
        update_data = {
            'email': 'invalid-email',
            'first_name': '',  # Empty first name
            'phone_number': 'a' * 25  # Phone number too long
        }
        
        response = self.client.patch(url, update_data, format='json')
        
        # Should return validation error
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_profile_fields_in_response(self):
        """Test that profile responses contain expected fields"""
        self.authenticate_user()
        
        # Test me endpoint
        url = reverse('account-me')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Ensure sensitive fields are not included
        sensitive_fields = ['password', 'stripe_customer_id', 'stripe_subscription_id']
        for field in sensitive_fields:
            self.assertNotIn(field, response.data)
        
        # Ensure read-only fields are marked as such in serializer
        readonly_fields = ['id', 'email', 'subscription_status', 'date_joined', 'is_active']
        for field in readonly_fields:
            self.assertIn(field, response.data)

    def test_staff_can_access_all_profiles(self):
        """Test that staff users can access all user profiles"""
        # Make user a staff member
        self.user.is_staff = True
        self.user.save()
        
        self.authenticate_user()
        
        # Staff should be able to access other user's profile
        url = reverse('account-detail', kwargs={'pk': self.other_user.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], self.other_user.email)
