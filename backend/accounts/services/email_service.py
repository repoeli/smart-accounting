"""
Email Service - Handle email sending operations asynchronously.
"""
import os
import logging
from threading import Thread
from django.conf import settings
from django.core.mail import send_mail, EmailMessage
from django.template.loader import render_to_string
from django.utils import timezone

logger = logging.getLogger(__name__)


class EmailService:
    """Service for handling email operations."""
    
    @staticmethod
    def send_email_async(subject, message, recipient_list, html_message=None):
        """
        Send email asynchronously using threading.
        
        Args:
            subject (str): Email subject
            message (str): Plain text message
            recipient_list (list): List of recipient emails
            html_message (str, optional): HTML message
        """
        def _send_email():
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=recipient_list,
                    html_message=html_message,
                    fail_silently=False
                )
                logger.info(f"Email sent successfully to {', '.join(recipient_list)}")
            except Exception as e:
                logger.error(f"Failed to send email to {', '.join(recipient_list)}: {str(e)}")
        
        # Run email sending in background thread
        Thread(target=_send_email, daemon=True).start()
    
    def send_verification_email_async(self, user, verification_token):
        """
        Send email verification email asynchronously.
        
        Args:
            user (Account): User instance
            verification_token (str): Verification token
        """
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        verification_url = f"{frontend_url}/verify-email/{verification_token}"
        
        subject = f"Verify Your Email - {settings.SITE_NAME if hasattr(settings, 'SITE_NAME') else 'Smart Accounting'}"
        
        # Plain text message
        message = f"""
Hi {user.first_name},

Thank you for registering with Smart Accounting!

Please click the link below to verify your email address:
{verification_url}

This link will expire in 24 hours.

If you did not create this account, please ignore this email.

Best regards,
The Smart Accounting Team
        """.strip()
        
        # HTML message (optional - can be enhanced with templates)
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1976d2;">Welcome to Smart Accounting!</h2>
                <p>Hi {user.first_name},</p>
                <p>Thank you for registering with Smart Accounting!</p>
                <p>Please click the button below to verify your email address:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" 
                       style="background-color: #1976d2; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email Address
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 24 hours. If you did not create this account, please ignore this email.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    Best regards,<br>
                    The Smart Accounting Team
                </p>
            </div>
        </body>
        </html>
        """
        
        self.send_email_async(
            subject=subject,
            message=message,
            recipient_list=[user.email],
            html_message=html_message
        )
        
        logger.info(f"Verification email queued for {user.email}")
    
    def send_password_reset_email_async(self, user, reset_token):
        """
        Send password reset email asynchronously.
        
        Args:
            user (Account): User instance
            reset_token (str): Password reset token
        """
        frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
        reset_url = f"{frontend_url}/reset-password/{reset_token}"
        
        subject = f"Reset Your Password - {settings.SITE_NAME if hasattr(settings, 'SITE_NAME') else 'Smart Accounting'}"
        
        # Plain text message
        message = f"""
Hi {user.first_name},

You requested a password reset for your Smart Accounting account.

Please click the link below to reset your password:
{reset_url}

This link will expire in 1 hour.

If you did not request this password reset, please ignore this email and your password will remain unchanged.

Best regards,
The Smart Accounting Team
        """.strip()
        
        # HTML message
        html_message = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1976d2;">Password Reset Request</h2>
                <p>Hi {user.first_name},</p>
                <p>You requested a password reset for your Smart Accounting account.</p>
                <p>Please click the button below to reset your password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" 
                       style="background-color: #dc004e; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p style="color: #666; font-size: 14px;">
                    This link will expire in 1 hour. If you did not request this password reset, please ignore this email and your password will remain unchanged.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                <p style="color: #999; font-size: 12px;">
                    Best regards,<br>
                    The Smart Accounting Team
                </p>
            </div>
        </body>
        </html>
        """
        
        self.send_email_async(
            subject=subject,
            message=message,
            recipient_list=[user.email],
            html_message=html_message
        )
        
        logger.info(f"Password reset email queued for {user.email}")
    
    def send_welcome_email_async(self, user):
        """
        Send welcome email after successful verification.
        
        Args:
            user (Account): User instance
        """
        subject = f"Welcome to {settings.SITE_NAME if hasattr(settings, 'SITE_NAME') else 'Smart Accounting'}!"
        
        message = f"""
Hi {user.first_name},

Welcome to Smart Accounting! Your email has been successfully verified.

You can now log in to your account and start managing your accounting needs.

Login URL: {os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/login

If you have any questions, feel free to contact our support team.

Best regards,
The Smart Accounting Team
        """.strip()
        
        self.send_email_async(
            subject=subject,
            message=message,
            recipient_list=[user.email]
        )
        
        logger.info(f"Welcome email queued for {user.email}")
