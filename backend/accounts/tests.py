from django.test import TestCase
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.core import mail
from rest_framework.test import APIClient
from rest_framework import status
import jwt
from datetime import datetime, timedelta
from django.conf import settings
import uuid

Account = get_user_model()


class PasswordResetTestCase(TestCase):
    """Test cases for password reset functionality."""
    
    def setUp(self):
        """Set up test data."""
        self.client = APIClient()
        self.forgot_password_url = '/api/v1/accounts/forgot-password/'
        self.reset_password_url = '/api/v1/accounts/reset-password/'
        
        # Create a test user
        self.user = Account.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User',
            is_active=True
        )
    
    def test_forgot_password_with_valid_email(self):
        """Test forgot password request with valid email."""
        data = {'email': 'test@example.com'}
        response = self.client.post(self.forgot_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('password reset link has been sent', response.data['message'])
        
        # Check that an email was sent
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ['test@example.com'])
        self.assertIn('Password Reset', mail.outbox[0].subject)
    
    def test_forgot_password_with_invalid_email(self):
        """Test forgot password request with non-existent email."""
        data = {'email': 'nonexistent@example.com'}
        response = self.client.post(self.forgot_password_url, data)
        
        # Should still return success for security reasons
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('password reset link has been sent', response.data['message'])
        
        # No email should be sent
        self.assertEqual(len(mail.outbox), 0)
    
    def test_forgot_password_invalid_email_format(self):
        """Test forgot password request with invalid email format."""
        data = {'email': 'invalid-email'}
        response = self.client.post(self.forgot_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_reset_password_with_valid_token(self):
        """Test password reset with valid token."""
        # Generate a valid token
        token_payload = {
            'user_id': self.user.id,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'token_type': 'password_reset',
            'jti': str(uuid.uuid4())
        }
        token = jwt.encode(token_payload, settings.SECRET_KEY, algorithm='HS256')
        
        data = {
            'token': token,
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }
        response = self.client.post(self.reset_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('Password reset successfully', response.data['message'])
        
        # Verify password was changed
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpassword123'))
    
    def test_reset_password_with_expired_token(self):
        """Test password reset with expired token."""
        # Generate an expired token
        token_payload = {
            'user_id': self.user.id,
            'exp': datetime.utcnow() - timedelta(hours=1),  # Expired
            'token_type': 'password_reset',
            'jti': str(uuid.uuid4())
        }
        token = jwt.encode(token_payload, settings.SECRET_KEY, algorithm='HS256')
        
        data = {
            'token': token,
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }
        response = self.client.post(self.reset_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('expired', response.data['error'])
    
    def test_reset_password_with_invalid_token(self):
        """Test password reset with invalid token."""
        data = {
            'token': 'invalid-token',
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }
        response = self.client.post(self.reset_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid', response.data['error'])
    
    def test_reset_password_wrong_token_type(self):
        """Test password reset with wrong token type."""
        # Generate a token with wrong type
        token_payload = {
            'user_id': self.user.id,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'token_type': 'email_verification',  # Wrong type
            'jti': str(uuid.uuid4())
        }
        token = jwt.encode(token_payload, settings.SECRET_KEY, algorithm='HS256')
        
        data = {
            'token': token,
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }
        response = self.client.post(self.reset_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('Invalid', response.data['error'])
    
    def test_reset_password_passwords_dont_match(self):
        """Test password reset with non-matching passwords."""
        # Generate a valid token
        token_payload = {
            'user_id': self.user.id,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'token_type': 'password_reset',
            'jti': str(uuid.uuid4())
        }
        token = jwt.encode(token_payload, settings.SECRET_KEY, algorithm='HS256')
        
        data = {
            'token': token,
            'new_password': 'newpassword123',
            'confirm_password': 'differentpassword123'
        }
        response = self.client.post(self.reset_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("didn't match", str(response.data))
    
    def test_reset_password_weak_password(self):
        """Test password reset with weak password."""
        # Generate a valid token
        token_payload = {
            'user_id': self.user.id,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'token_type': 'password_reset',
            'jti': str(uuid.uuid4())
        }
        token = jwt.encode(token_payload, settings.SECRET_KEY, algorithm='HS256')
        
        data = {
            'token': token,
            'new_password': '123',  # Too weak
            'confirm_password': '123'
        }
        response = self.client.post(self.reset_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_reset_password_nonexistent_user(self):
        """Test password reset with token for non-existent user."""
        # Generate a token with non-existent user ID
        token_payload = {
            'user_id': 99999,  # Non-existent user
            'exp': datetime.utcnow() + timedelta(hours=1),
            'token_type': 'password_reset',
            'jti': str(uuid.uuid4())
        }
        token = jwt.encode(token_payload, settings.SECRET_KEY, algorithm='HS256')
        
        data = {
            'token': token,
            'new_password': 'newpassword123',
            'confirm_password': 'newpassword123'
        }
        response = self.client.post(self.reset_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('User not found', response.data['error'])
    
    def test_forgot_password_missing_email(self):
        """Test forgot password request without email."""
        data = {}
        response = self.client.post(self.forgot_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_reset_password_missing_fields(self):
        """Test password reset with missing required fields."""
        data = {'token': 'some-token'}  # Missing passwords
        response = self.client.post(self.reset_password_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
