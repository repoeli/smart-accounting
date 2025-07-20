"""
Authentication Service - Business logic for user authentication operations.
"""
import logging
from datetime import datetime, timedelta
from django.contrib.auth import authenticate
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from ..models import Account
from .email_service import EmailService
from .token_service import TokenService

logger = logging.getLogger(__name__)


class AuthService:
    """Service for handling authentication operations."""
    
    def __init__(self):
        self.email_service = EmailService()
        self.token_service = TokenService()
    
    def register_user(self, validated_data):
        """
        Register a new user with email verification.
        
        Args:
            validated_data (dict): Validated user registration data
            
        Returns:
            tuple: (user_instance, success_message)
            
        Raises:
            ValidationError: If registration fails
        """
        try:
            # Remove password confirmation
            validated_data.pop('password_confirm', None)
            
            # Ensure username is set to email
            if 'username' not in validated_data:
                validated_data['username'] = validated_data.get('email', '')
            
            # Create inactive user
            user = Account.objects.create_user(
                email=validated_data.pop('email'),
                password=validated_data.pop('password'),
                is_active=False,  # Require email verification
                **validated_data
            )
            
            # Generate and send verification email
            verification_token = self.token_service.generate_verification_token(user)
            self.email_service.send_verification_email_async(user, verification_token)
            
            logger.info(f"User registered successfully: {user.email}")
            return user, "Registration successful! Please check your email to verify your account."
            
        except Exception as e:
            logger.error(f"Registration failed for email {validated_data.get('email', 'unknown')}: {str(e)}")
            raise ValidationError(f"Registration failed: {str(e)}")
    
    def verify_email(self, token):
        """
        Verify user email with token.
        
        Args:
            token (str): Verification token
            
        Returns:
            tuple: (success_bool, message)
        """
        try:
            user_id = self.token_service.verify_email_token(token)
            user = Account.objects.get(id=user_id)
            
            if user.is_active:
                return False, "Email is already verified."
            
            user.is_active = True
            user.email_verified = True
            user.email_verification_token = None
            user.save()
            
            logger.info(f"Email verified successfully for user: {user.email}")
            return True, "Email verified successfully! You can now log in."
            
        except Account.DoesNotExist:
            logger.warning(f"Email verification failed - user not found for token")
            return False, "Invalid verification token."
        except Exception as e:
            logger.error(f"Email verification failed: {str(e)}")
            return False, "Email verification failed. Please try again."
    
    def authenticate_user(self, email, password):
        """
        Authenticate user and return tokens.
        
        Args:
            email (str): User email
            password (str): User password
            
        Returns:
            dict: Authentication result with tokens or error
        """
        try:
            user = authenticate(username=email, password=password)
            
            if not user:
                logger.warning(f"Authentication failed for email: {email}")
                return {
                    'success': False,
                    'error': 'Invalid email or password.'
                }
            
            if not user.is_active:
                logger.warning(f"Inactive user attempted login: {email}")
                return {
                    'success': False,
                    'error': 'Account is not activated. Please verify your email.'
                }
            
            # Generate tokens
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"User authenticated successfully: {email}")
            return {
                'success': True,
                'tokens': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)
                },
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            }
            
        except Exception as e:
            logger.error(f"Authentication error for {email}: {str(e)}")
            return {
                'success': False,
                'error': 'Authentication failed. Please try again.'
            }
    
    def change_password(self, user, old_password, new_password):
        """
        Change user password.
        
        Args:
            user (Account): User instance
            old_password (str): Current password
            new_password (str): New password
            
        Returns:
            tuple: (success_bool, message)
        """
        try:
            if not user.check_password(old_password):
                return False, "Current password is incorrect."
            
            user.set_password(new_password)
            user.save()
            
            logger.info(f"Password changed successfully for user: {user.email}")
            return True, "Password changed successfully."
            
        except Exception as e:
            logger.error(f"Password change failed for {user.email}: {str(e)}")
            return False, "Password change failed. Please try again."
    
    def request_password_reset(self, email):
        """
        Send password reset email.
        
        Args:
            email (str): User email
            
        Returns:
            tuple: (success_bool, message)
        """
        try:
            user = Account.objects.get(email=email)
            
            # Generate reset token
            reset_token = self.token_service.generate_password_reset_token(user)
            
            # Send reset email
            self.email_service.send_password_reset_email_async(user, reset_token)
            
            logger.info(f"Password reset requested for: {email}")
            return True, "Password reset link sent to your email."
            
        except Account.DoesNotExist:
            # Don't reveal if email exists for security
            logger.warning(f"Password reset requested for non-existent email: {email}")
            return True, "If an account with this email exists, a password reset link has been sent."
        except Exception as e:
            logger.error(f"Password reset request failed for {email}: {str(e)}")
            return False, "Password reset request failed. Please try again."
    
    def reset_password(self, token, new_password):
        """
        Reset password using token.
        
        Args:
            token (str): Reset token
            new_password (str): New password
            
        Returns:
            tuple: (success_bool, message)
        """
        try:
            user_id = self.token_service.verify_password_reset_token(token)
            user = Account.objects.get(id=user_id)
            
            user.set_password(new_password)
            user.save()
            
            logger.info(f"Password reset successfully for user: {user.email}")
            return True, "Password reset successfully! You can now log in with your new password."
            
        except Account.DoesNotExist:
            logger.warning("Password reset failed - user not found")
            return False, "Invalid reset token."
        except Exception as e:
            logger.error(f"Password reset failed: {str(e)}")
            return False, "Password reset failed. Please try again."
    
    def resend_verification_email(self, email):
        """
        Resend verification email with rate limiting.
        
        Args:
            email (str): User email
            
        Returns:
            tuple: (success_bool, message)
        """
        try:
            user = Account.objects.get(email=email)
            
            if user.is_active:
                return False, "Email is already verified."
            
            # Rate limiting check
            if user.email_verification_sent_at:
                time_since_last = timezone.now() - user.email_verification_sent_at
                if time_since_last < timedelta(minutes=5):
                    minutes_left = 5 - time_since_last.total_seconds() / 60
                    return False, f"Please wait {int(minutes_left)} more minutes before requesting another email."
            
            # Generate new token and send email
            verification_token = self.token_service.generate_verification_token(user)
            self.email_service.send_verification_email_async(user, verification_token)
            
            # Update sent timestamp
            user.email_verification_sent_at = timezone.now()
            user.save()
            
            logger.info(f"Verification email resent for: {email}")
            return True, "Verification email sent successfully."
            
        except Account.DoesNotExist:
            logger.warning(f"Resend verification requested for non-existent email: {email}")
            return False, "User with this email does not exist."
        except Exception as e:
            logger.error(f"Resend verification failed for {email}: {str(e)}")
            return False, "Failed to send verification email. Please try again."
