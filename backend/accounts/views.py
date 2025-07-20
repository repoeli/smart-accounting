from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model
from django.conf import settings
from django.contrib.sites.shortcuts import get_current_site
from django.urls import reverse
from django.core.mail import EmailMessage
import jwt
from datetime import datetime, timedelta
import uuid
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Account
from .serializers import (
    RegisterSerializer, AccountSerializer, 
    ChangePasswordSerializer, EmailVerificationSerializer,
    CustomTokenObtainPairSerializer
)


Account = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Takes a set of user credentials and returns access and refresh JWT tokens.
    Also validates account status and updates last_login timestamp.
    """
    serializer_class = CustomTokenObtainPairSerializer
    
    @swagger_auto_schema(
        operation_summary="Obtain JWT token pair",
        operation_description="Exchange email and password for access and refresh tokens. Validates account status and updates last login.",
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
            401: "Authentication failed - invalid credentials, inactive account, or unverified email"
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
            400: "Invalid input data"
        }
    )
    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Set user as inactive until email verification
        user.is_active = False
        user.save()
        
        # Generate verification token
        token = self._generate_verification_token(user)
        
        # Send verification email
        self._send_verification_email(user, token, request)
        
        return Response(
            {"message": "User registered successfully. Please check your email to activate your account."},
            status=status.HTTP_201_CREATED
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
