from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
import logging
from threading import Thread
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from django.core.mail import EmailMessage
import jwt
from datetime import datetime, timedelta
import uuid
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi
from django.utils import timezone
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
import os

from .models import Account
from .serializers import (
    RegisterSerializer, AccountSerializer, 
    ChangePasswordSerializer, EmailVerificationSerializer,
    PasswordResetRequestSerializer, PasswordResetSerializer
)


Account = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Takes a set of user credentials and returns access and refresh JWT tokens.
    """
    @swagger_auto_schema(
        operation_summary="Obtain JWT token pair",
        operation_description="Exchange username and password for access and refresh tokens",
        responses={
            200: openapi.Response(
                description="Token pair obtained successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'access': openapi.Schema(type=openapi.TYPE_STRING),
                        'refresh': openapi.Schema(type=openapi.TYPE_STRING),
                    }
                )
            ),
            401: "Authentication failed"
        }
    )
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)


class RegisterView(generics.CreateAPIView):
    """
    Register a new user account with email verification.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_summary="Register a new user",
        operation_description="Create a new user account and send verification email",
        responses={
            201: openapi.Response(
                description="User created successfully, verification email sent",
                schema=RegisterSerializer
            ),
            400: "Invalid input data",
            500: "Server error"
        }
    )
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            user = serializer.save()

            # Set user as inactive until email verification
            user.is_active = False
            user.save()

            # Generate verification token
            token = self._generate_verification_token(user)

            # Send verification email asynchronously
            Thread(
                target=self._send_verification_email,
                args=(user, token, request),
                daemon=True
            ).start()

            return Response(
                {"message": "User registered successfully. Please check your email to activate your account."},
                status=status.HTTP_201_CREATED
            )
        except Exception as exc:
            logging.exception("Error in user registration")
            return Response(
                {"error": "Registration failed", "details": str(exc)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _generate_verification_token(self, user):
        """Generate a JWT token for email verification."""
        token_payload = {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(days=1),
            'token_type': 'email_verification',
            'jti': str(uuid.uuid4())
        }
        return jwt.encode(token_payload, settings.SECRET_KEY, algorithm='HS256')
    
    def _send_verification_email(self, user, token, request):
        """Send an email verification link to the user."""
        current_site = get_current_site(request).domain
        relative_url = reverse('verify-email')
        verification_url = f"http://{current_site}{relative_url}?token={token}"
        
        subject = "Verify Your Email - Smart Accounting"
        message = f"""
        Hi {user.first_name},
        
        Thank you for registering with Smart Accounting!
        
        Please click the link below to verify your email address:
        {verification_url}
        
        This link will expire in 24 hours.
        
        If you did not create this account, please ignore this email.
        
        Best Regards,
        Smart Accounting Team
        """
        
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.send()


class VerifyEmailView(APIView):
    """
    Verify user email using the token sent during registration.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailVerificationSerializer
    
    @swagger_auto_schema(
        operation_summary="Verify email address",
        operation_description="Verify email address using token sent in email",
        request_body=EmailVerificationSerializer,
        responses={
            200: "Email verified successfully",
            400: "Invalid token"
        }
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=['HS256']
            )
            
            # Check token type
            if payload.get('token_type') != 'email_verification':
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Get and activate user
            user = Account.objects.get(id=payload['user_id'])
            user.is_active = True
            user.save()
            
            return Response(
                {"message": "Email verified successfully. You can now log in."},
                status=status.HTTP_200_OK
            )
            
        except jwt.ExpiredSignatureError:
            return Response(
                {"error": "Verification link expired"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except (jwt.DecodeError, jwt.InvalidTokenError):
            return Response(
                {"error": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Account.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_400_BAD_REQUEST
            )


class AccountViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and editing user accounts.
    """
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """
        Filter queryset to return only the current user's account
        unless the user is a staff member.
        """
        if self.request.user.is_staff:
            return Account.objects.all()
        return Account.objects.filter(id=self.request.user.id)
    
    @swagger_auto_schema(
        operation_summary="Get current user profile",
        operation_description="Retrieve the profile of the currently authenticated user",
        responses={
            200: AccountSerializer,
            401: "Not authenticated"
        }
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        """
        Return the authenticated user's details.
        """
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)
    
    @swagger_auto_schema(
        operation_summary="Change password",
        operation_description="Change the password for the current user",
        request_body=ChangePasswordSerializer,
        responses={
            200: "Password changed successfully",
            400: "Invalid input data"
        }
    )
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """
        Change user password.
        """
        user = request.user
        serializer = ChangePasswordSerializer(data=request.data)
        
        if serializer.is_valid():
            # Check old password
            if not user.check_password(serializer.validated_data['old_password']):
                return Response(
                    {"old_password": ["Wrong password."]},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set new password
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            
            return Response(
                {"message": "Password updated successfully"},
                status=status.HTTP_200_OK
            )
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @swagger_auto_schema(
        operation_summary="Deactivate account",
        operation_description="Deactivate the current user's account",
        responses={
            200: "Account deactivated successfully",
            403: "Permission denied"
        }
    )
    @action(detail=False, methods=['post'])
    def deactivate(self, request):
        """
        Deactivate the user's account.
        """
        user = request.user
        user.is_active = False
        user.save()
        
        return Response(
            {"message": "Account deactivated successfully"},
            status=status.HTTP_200_OK
        )


class RequestPasswordResetView(APIView):
    """
    Request a password reset link.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetRequestSerializer
    
    @swagger_auto_schema(
        operation_summary="Request password reset",
        operation_description="Request a password reset link to be sent to your email",
        request_body=PasswordResetRequestSerializer,
        responses={
            200: "Password reset email sent",
            404: "User not found"
        }
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        
        try:
            user = Account.objects.get(email=email)
            
            # Generate reset token
            token = self._generate_reset_token(user)
            
            # Send reset email
            self._send_reset_email(user, token, request)
            
            return Response(
                {"message": "Password reset link sent to your email."},
                status=status.HTTP_200_OK
            )
            
        except Account.DoesNotExist:
            # Return 200 anyway for security reasons (don't reveal if email exists)
            return Response(
                {"message": "If an account with this email exists, a password reset link has been sent."},
                status=status.HTTP_200_OK
            )
    
    def _generate_reset_token(self, user):
        """Generate a JWT token for password reset."""
        token_payload = {
            'user_id': user.id,
            'exp': datetime.utcnow() + timedelta(hours=1),
            'token_type': 'password_reset',
            'jti': str(uuid.uuid4())
        }
        return jwt.encode(token_payload, settings.SECRET_KEY, algorithm='HS256')
    
    def _send_reset_email(self, user, token, request):
        """Send a password reset link to the user."""
        current_site = get_current_site(request).domain
        relative_url = "/reset-password"
        reset_url = f"http://{current_site}{relative_url}/{token}"
        
        subject = "Reset Your Password - Smart Accounting"
        message = f"""
        Hi {user.first_name},
        
        You requested a password reset for your Smart Accounting account.
        
        Please click the link below to reset your password:
        {reset_url}
        
        This link will expire in 1 hour.
        
        If you did not request this password reset, please ignore this email.
        
        Best Regards,
        Smart Accounting Team
        """
        
        email = EmailMessage(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email]
        )
        email.send()


class ResetPasswordView(APIView):
    """
    Reset password using token sent to email.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetSerializer
    
    @swagger_auto_schema(
        operation_summary="Reset password",
        operation_description="Reset password using token sent to email",
        request_body=PasswordResetSerializer,
        responses={
            200: "Password reset successfully",
            400: "Invalid token or password"
        }
    )
    def post(self, request):
        serializer = self.serializer_class(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        token = serializer.validated_data['token']
        password = serializer.validated_data['password']
        
        try:
            payload = jwt.decode(
                token, settings.SECRET_KEY, algorithms=['HS256']
            )
            
            # Check token type
            if payload.get('token_type') != 'password_reset':
                raise jwt.InvalidTokenError("Invalid token type")
            
            # Get user and update password
            user = Account.objects.get(id=payload['user_id'])
            user.set_password(password)
            user.save()
            
            return Response(
                {"message": "Password reset successfully. You can now log in with your new password."},
                status=status.HTTP_200_OK
            )
            
        except jwt.ExpiredSignatureError:
            return Response(
                {"error": "Password reset link expired"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except (jwt.DecodeError, jwt.InvalidTokenError):
            return Response(
                {"error": "Invalid token"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Account.DoesNotExist:
            return Response(
                {"error": "User not found"},
                status=status.HTTP_400_BAD_REQUEST
            )


class ResendVerificationEmailView(generics.GenericAPIView):
    """
    View to resend the email verification link.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailVerificationSerializer

    @swagger_auto_schema(
        operation_summary="Resend verification email",
        operation_description="Resend the email verification link to the user",
        request_body=EmailVerificationSerializer,
        responses={
            200: "Verification email resent",
            400: "Invalid input data",
            404: "User not found",
            429: "Too many requests"
        }
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data['email']
        
        try:
            user = Account.objects.get(email=email)
        except Account.DoesNotExist:
            return Response(
                {'error': 'User with this email does not exist.'},
                status=status.HTTP_404_NOT_FOUND
            )
            
        if user.is_active:
            return Response(
                {'message': 'This email has already been verified.'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Check if a verification email was sent recently
        if user.email_verification_sent_at and \
           timezone.now() < user.email_verification_sent_at + timedelta(minutes=5):
            return Response(
                {'error': 'A verification email was sent recently. Please wait a few minutes before trying again.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )
            
        # Generate a new verification token
        token = default_token_generator.make_token(user)
        user.email_verification_token = token
        user.email_verification_sent_at = timezone.now()
        user.save()
        
        # Send the verification email
        verification_url = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/verify-email/{token}"
        
        send_mail(
            'Verify Your Email Address',
            f'Hi {user.first_name},\n\nPlease click the link below to verify your email address:\n{verification_url}\n\nThanks,\nThe Smart Accounting Team',
            os.environ.get('DEFAULT_FROM_EMAIL'),
            [user.email],
            fail_silently=False,
        )
        
        return Response(
            {'message': 'A new verification email has been sent.'},
            status=status.HTTP_200_OK
        )
