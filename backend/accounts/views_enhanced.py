from rest_framework import viewsets, status, permissions, generics
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
import logging
from drf_yasg.utils import swagger_auto_schema
from drf_yasg import openapi

from .models import Account
from .serializers import (
    RegisterSerializer, AccountSerializer, ChangePasswordSerializer,
    EmailVerificationSerializer, ResendVerificationEmailSerializer,
    PasswordResetRequestSerializer, PasswordResetSerializer, LoginSerializer
)
from .services import AuthService

# Get logger
logger = logging.getLogger(__name__)
Account = get_user_model()


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Enhanced JWT token view with better error handling.
    """
    serializer_class = LoginSerializer
    
    @swagger_auto_schema(
        operation_summary="Obtain JWT token pair",
        operation_description="Exchange email and password for access and refresh tokens",
        responses={
            200: openapi.Response(
                description="Authentication successful",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'tokens': openapi.Schema(
                            type=openapi.TYPE_OBJECT,
                            properties={
                                'access': openapi.Schema(type=openapi.TYPE_STRING),
                                'refresh': openapi.Schema(type=openapi.TYPE_STRING),
                            }
                        ),
                        'user': openapi.Schema(type=openapi.TYPE_OBJECT)
                    }
                )
            ),
            400: "Invalid credentials",
            401: "Authentication failed"
        }
    )
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.serializer_class(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            auth_service = AuthService()
            result = auth_service.authenticate_user(email, password)
            
            if result['success']:
                return Response(result, status=status.HTTP_200_OK)
            else:
                return Response(
                    {'error': result['error']},
                    status=status.HTTP_401_UNAUTHORIZED
                )
                
        except Exception as e:
            logger.error(f"Login error: {str(e)}")
            return Response(
                {'error': 'Authentication failed. Please try again.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RegisterView(generics.CreateAPIView):
    """
    Enhanced user registration with service layer integration.
    """
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    
    @swagger_auto_schema(
        operation_summary="Register a new user",
        operation_description="Create a new user account and send verification email",
        responses={
            201: openapi.Response(
                description="User created successfully",
                schema=openapi.Schema(
                    type=openapi.TYPE_OBJECT,
                    properties={
                        'success': openapi.Schema(type=openapi.TYPE_BOOLEAN),
                        'message': openapi.Schema(type=openapi.TYPE_STRING),
                        'user_id': openapi.Schema(type=openapi.TYPE_INTEGER)
                    }
                )
            ),
            400: "Invalid input data",
            409: "Email already exists",
            500: "Server error"
        }
    )
    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            auth_service = AuthService()
            user, message = auth_service.register_user(serializer.validated_data)
            
            return Response({
                'success': True,
                'message': message,
                'user_id': user.id
            }, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Registration error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Registration failed. Please try again.',
                'details': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class VerifyEmailView(APIView):
    """
    Enhanced email verification with service layer.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = EmailVerificationSerializer
    
    @swagger_auto_schema(
        operation_summary="Verify email address",
        operation_description="Verify email address using token sent in email",
        request_body=EmailVerificationSerializer,
        responses={
            200: "Email verified successfully",
            400: "Invalid or expired token"
        }
    )
    def post(self, request):
        try:
            serializer = self.serializer_class(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            token = serializer.validated_data['token']
            
            auth_service = AuthService()
            success, message = auth_service.verify_email(token)
            
            if success:
                return Response({
                    'success': True,
                    'message': message
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': message
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Email verification error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Email verification failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResendVerificationEmailView(APIView):
    """
    Enhanced resend verification with rate limiting.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = ResendVerificationEmailSerializer
    
    @swagger_auto_schema(
        operation_summary="Resend verification email",
        operation_description="Resend email verification link with rate limiting",
        request_body=ResendVerificationEmailSerializer,
        responses={
            200: "Verification email sent",
            400: "Already verified or invalid email",
            429: "Rate limited"
        }
    )
    def post(self, request):
        try:
            serializer = self.serializer_class(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            email = serializer.validated_data['email']
            
            auth_service = AuthService()
            success, message = auth_service.resend_verification_email(email)
            
            response_status = status.HTTP_200_OK if success else (
                status.HTTP_429_TOO_MANY_REQUESTS if 'wait' in message.lower()
                else status.HTTP_400_BAD_REQUEST
            )
            
            return Response({
                'success': success,
                'message' if success else 'error': message
            }, status=response_status)
            
        except Exception as e:
            logger.error(f"Resend verification error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to send verification email. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class RequestPasswordResetView(APIView):
    """
    Enhanced password reset request.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetRequestSerializer
    
    @swagger_auto_schema(
        operation_summary="Request password reset",
        operation_description="Send password reset link to email",
        request_body=PasswordResetRequestSerializer,
        responses={
            200: "Reset email sent",
            500: "Server error"
        }
    )
    def post(self, request):
        try:
            serializer = self.serializer_class(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            email = serializer.validated_data['email']
            
            auth_service = AuthService()
            success, message = auth_service.request_password_reset(email)
            
            # Always return 200 for security (don't reveal if email exists)
            return Response({
                'success': True,
                'message': message
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Password reset request error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Password reset request failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class ResetPasswordView(APIView):
    """
    Enhanced password reset confirmation.
    """
    permission_classes = [permissions.AllowAny]
    serializer_class = PasswordResetSerializer
    
    @swagger_auto_schema(
        operation_summary="Reset password",
        operation_description="Reset password using token from email",
        request_body=PasswordResetSerializer,
        responses={
            200: "Password reset successfully",
            400: "Invalid token or password"
        }
    )
    def post(self, request):
        try:
            serializer = self.serializer_class(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            token = serializer.validated_data['token']
            password = serializer.validated_data['password']
            
            auth_service = AuthService()
            success, message = auth_service.reset_password(token, password)
            
            if success:
                return Response({
                    'success': True,
                    'message': message
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': message
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Password reset error: {str(e)}")
            return Response({
                'success': False,
                'error': 'Password reset failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AccountViewSet(viewsets.ModelViewSet):
    """
    Enhanced user account management with service integration.
    """
    queryset = Account.objects.all()
    serializer_class = AccountSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Filter to current user unless staff."""
        if self.request.user.is_staff:
            return Account.objects.all()
        return Account.objects.filter(id=self.request.user.id)
    
    @swagger_auto_schema(
        operation_summary="Get current user profile",
        operation_description="Retrieve authenticated user's profile",
        responses={
            200: AccountSerializer,
            401: "Not authenticated"
        }
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user's profile."""
        try:
            serializer = self.get_serializer(request.user)
            return Response({
                'success': True,
                'user': serializer.data
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Get profile error for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Failed to retrieve profile.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_summary="Change password",
        operation_description="Change password for authenticated user",
        request_body=ChangePasswordSerializer,
        responses={
            200: "Password changed successfully",
            400: "Invalid password data"
        }
    )
    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change user password with service layer."""
        try:
            serializer = ChangePasswordSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            
            old_password = serializer.validated_data['old_password']
            new_password = serializer.validated_data['new_password']
            
            auth_service = AuthService()
            success, message = auth_service.change_password(
                request.user, old_password, new_password
            )
            
            if success:
                return Response({
                    'success': True,
                    'message': message
                }, status=status.HTTP_200_OK)
            else:
                return Response({
                    'success': False,
                    'error': message
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Password change error for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Password change failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @swagger_auto_schema(
        operation_summary="Update user profile",
        operation_description="Update user profile information",
        request_body=AccountSerializer,
        responses={
            200: "Profile updated successfully",
            400: "Invalid profile data"
        }
    )
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update user profile."""
        try:
            serializer = self.get_serializer(
                request.user, 
                data=request.data, 
                partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            return Response({
                'success': True,
                'message': 'Profile updated successfully.',
                'user': serializer.data
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Profile update error for user {request.user.id}: {str(e)}")
            return Response({
                'success': False,
                'error': 'Profile update failed. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
