from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    CustomTokenObtainPairView, RegisterView, 
    VerifyEmailView, AccountViewSet, 
    RequestPasswordResetView, ResetPasswordView,
    ResendVerificationEmailView
)

# Create a router for ViewSets
router = DefaultRouter()
router.register(r'', AccountViewSet)

# URL patterns for the accounts app
urlpatterns = [
    # Authentication endpoints
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterView.as_view(), name='register'),
    path('verify-email/', VerifyEmailView.as_view(), name='verify-email'),
    path('resend-verification-email/', ResendVerificationEmailView.as_view(), name='resend-verification-email'),
    path('password/reset/', RequestPasswordResetView.as_view(), name='request-password-reset'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset-password'),
    
    # Include the router URLs
    path('', include(router.urls)),
]
