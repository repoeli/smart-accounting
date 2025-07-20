"""
Token Service - Handle JWT token generation and verification.
"""
import jwt
import uuid
from datetime import datetime, timedelta
from django.conf import settings
from django.core.exceptions import ValidationError

import logging
logger = logging.getLogger(__name__)


class TokenService:
    """Service for handling JWT token operations."""
    
    @staticmethod
    def generate_verification_token(user):
        """
        Generate JWT token for email verification.
        
        Args:
            user (Account): User instance
            
        Returns:
            str: JWT token
        """
        payload = {
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(days=1),
            'token_type': 'email_verification',
            'jti': str(uuid.uuid4())
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    
    @staticmethod
    def verify_email_token(token):
        """
        Verify email verification token.
        
        Args:
            token (str): JWT token
            
        Returns:
            int: User ID
            
        Raises:
            ValidationError: If token is invalid
        """
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            
            if payload.get('token_type') != 'email_verification':
                raise ValidationError("Invalid token type")
            
            return payload['user_id']
            
        except jwt.ExpiredSignatureError:
            logger.warning("Email verification token expired")
            raise ValidationError("Verification link has expired")
        except jwt.InvalidTokenError:
            logger.warning("Invalid email verification token")
            raise ValidationError("Invalid verification token")
    
    @staticmethod
    def generate_password_reset_token(user):
        """
        Generate JWT token for password reset.
        
        Args:
            user (Account): User instance
            
        Returns:
            str: JWT token
        """
        payload = {
            'user_id': user.id,
            'email': user.email,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'token_type': 'password_reset',
            'jti': str(uuid.uuid4())
        }
        return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')
    
    @staticmethod
    def verify_password_reset_token(token):
        """
        Verify password reset token.
        
        Args:
            token (str): JWT token
            
        Returns:
            int: User ID
            
        Raises:
            ValidationError: If token is invalid
        """
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            
            if payload.get('token_type') != 'password_reset':
                raise ValidationError("Invalid token type")
            
            return payload['user_id']
            
        except jwt.ExpiredSignatureError:
            logger.warning("Password reset token expired")
            raise ValidationError("Password reset link has expired")
        except jwt.InvalidTokenError:
            logger.warning("Invalid password reset token")
            raise ValidationError("Invalid reset token")
