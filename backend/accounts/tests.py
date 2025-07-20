from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
import json

Account = get_user_model()


class AuthenticationTestCase(APITestCase):
    """Test cases for JWT authentication functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.login_url = reverse('token_obtain_pair')
        self.refresh_url = reverse('token_refresh')
        self.register_url = reverse('register')
        
        # Create test users
        self.active_user = Account.objects.create_user(
            username='active@example.com',
            email='active@example.com',
            password='testpass123',
            first_name='Active',
            last_name='User',
            is_active=True,
            email_verified=True
        )
        
        self.inactive_user = Account.objects.create_user(
            username='inactive@example.com',
            email='inactive@example.com',
            password='testpass123',
            first_name='Inactive',
            last_name='User',
            is_active=False,
            email_verified=True
        )
        
        self.unverified_user = Account.objects.create_user(
            username='unverified@example.com',
            email='unverified@example.com',
            password='testpass123',
            first_name='Unverified',
            last_name='User',
            is_active=True,
            email_verified=False
        )

    def test_successful_login(self):
        """Test successful login with valid credentials."""
        # Ensure last_login is None initially
        self.assertIsNone(self.active_user.last_login)
        
        data = {
            'email': 'active@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        
        # Verify last_login was updated
        self.active_user.refresh_from_db()
        self.assertIsNotNone(self.active_user.last_login)
        
        # Verify the timestamp is recent (within last 10 seconds)
        time_diff = timezone.now() - self.active_user.last_login
        self.assertLess(time_diff.total_seconds(), 10)

    def test_invalid_credentials_login(self):
        """Test login with invalid credentials."""
        data = {
            'email': 'active@example.com',
            'password': 'wrongpassword'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)

    def test_inactive_account_login(self):
        """Test login attempt with inactive account."""
        data = {
            'email': 'inactive@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
        self.assertIn('disabled', response.data['detail'])

    def test_unverified_email_login(self):
        """Test login attempt with unverified email."""
        data = {
            'email': 'unverified@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('detail', response.data)
        self.assertIn('not verified', response.data['detail'])

    def test_missing_email_field(self):
        """Test login with missing email field."""
        data = {
            'password': 'testpass123'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_password_field(self):
        """Test login with missing password field."""
        data = {
            'email': 'active@example.com'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_empty_credentials(self):
        """Test login with empty credentials."""
        data = {
            'email': '',
            'password': ''
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_nonexistent_user_login(self):
        """Test login with non-existent user."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        }
        
        response = self.client.post(self.login_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_success(self):
        """Test successful token refresh."""
        # First, login to get tokens
        login_data = {
            'email': 'active@example.com',
            'password': 'testpass123'
        }
        
        login_response = self.client.post(self.login_url, login_data, format='json')
        refresh_token = login_response.data['refresh']
        
        # Now refresh the token
        refresh_data = {
            'refresh': refresh_token
        }
        
        response = self.client.post(self.refresh_url, refresh_data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_token_refresh_invalid_token(self):
        """Test token refresh with invalid token."""
        data = {
            'refresh': 'invalid.token.here'
        }
        
        response = self.client.post(self.refresh_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_missing_token(self):
        """Test token refresh with missing token."""
        data = {}
        
        response = self.client.post(self.refresh_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_multiple_login_attempts_update_last_login(self):
        """Test that multiple successful logins update last_login each time."""
        data = {
            'email': 'active@example.com',
            'password': 'testpass123'
        }
        
        # First login
        response1 = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        
        self.active_user.refresh_from_db()
        first_login_time = self.active_user.last_login
        
        # Wait a tiny bit and login again
        import time
        time.sleep(0.1)
        
        # Second login
        response2 = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        self.active_user.refresh_from_db()
        second_login_time = self.active_user.last_login
        
        # Verify that last_login was updated
        self.assertGreater(second_login_time, first_login_time)


class RegistrationTestCase(APITestCase):
    """Test cases for user registration."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.register_url = reverse('register')

    def test_successful_registration(self):
        """Test successful user registration."""
        data = {
            'email': 'newuser@example.com',
            'password': 'strongpassword123',
            'password_confirm': 'strongpassword123',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        
        # Verify user was created but is inactive
        user = Account.objects.get(email='newuser@example.com')
        self.assertFalse(user.is_active)
        self.assertFalse(user.email_verified)

    def test_password_mismatch_registration(self):
        """Test registration with password mismatch."""
        data = {
            'email': 'newuser@example.com',
            'password': 'strongpassword123',
            'password_confirm': 'differentpassword',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_duplicate_email_registration(self):
        """Test registration with duplicate email."""
        # Create existing user
        Account.objects.create_user(
            username='existing@example.com',
            email='existing@example.com',
            password='testpass123'
        )
        
        data = {
            'email': 'existing@example.com',
            'password': 'strongpassword123',
            'password_confirm': 'strongpassword123',
            'first_name': 'New',
            'last_name': 'User'
        }
        
        response = self.client.post(self.register_url, data, format='json')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class AccountViewSetTestCase(APITestCase):
    """Test cases for Account ViewSet operations."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.user = Account.objects.create_user(
            username='testuser@example.com',
            email='testuser@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            is_active=True,
            email_verified=True
        )
        
        # Get JWT token for authentication
        refresh = RefreshToken.for_user(self.user)
        self.access_token = str(refresh.access_token)

    def test_get_current_user_profile(self):
        """Test getting current user profile."""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        
        response = self.client.get(reverse('account-me'))
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'testuser@example.com')
        self.assertEqual(response.data['first_name'], 'Test')

    def test_unauthorized_access_to_profile(self):
        """Test unauthorized access to user profile."""
        response = self.client.get(reverse('account-me'))
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
