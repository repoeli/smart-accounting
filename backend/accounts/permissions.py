"""
Custom permissions for the Smart Accounting application.
"""
from rest_framework import permissions
from django.contrib.auth import get_user_model

Account = get_user_model()


class IsOwnerOrReadOnly(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to edit it.
    Assumes the model instance has an `owner` attribute.
    """

    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any request,
        # so we'll always allow GET, HEAD or OPTIONS requests.
        if request.method in permissions.SAFE_METHODS:
            return True

        # Instance must have an attribute named `owner`.
        return obj.owner == request.user


class IsAccountOwner(permissions.BasePermission):
    """
    Permission to only allow users to access their own account data.
    """

    def has_object_permission(self, request, view, obj):
        # Staff can access any account
        if request.user.is_staff:
            return True
            
        # Users can only access their own account
        return obj == request.user


class IsActiveUser(permissions.BasePermission):
    """
    Permission to only allow active users to access the API.
    """

    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active
        )


class IsVerifiedUser(permissions.BasePermission):
    """
    Permission to only allow email-verified users to access certain endpoints.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Check if user has verified their email
        return getattr(request.user, 'email_verified', False)


class IsSubscribedUser(permissions.BasePermission):
    """
    Permission to only allow users with active subscriptions.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Check if user has an active subscription
        return getattr(request.user, 'has_active_subscription', False)


class CanManageUsers(permissions.BasePermission):
    """
    Permission for user management operations.
    Only staff members can manage other users.
    """

    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_staff
        )


class CanViewReports(permissions.BasePermission):
    """
    Permission for viewing reports and analytics.
    Users can view their own reports, staff can view all.
    """

    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active
        )

    def has_object_permission(self, request, view, obj):
        # Staff can view any report
        if request.user.is_staff:
            return True
            
        # Users can only view their own reports
        return hasattr(obj, 'user') and obj.user == request.user


class CanModifyAccountSettings(permissions.BasePermission):
    """
    Permission for modifying account settings.
    Users can modify their own settings, staff can modify any.
    """

    def has_object_permission(self, request, view, obj):
        # Staff can modify any account
        if request.user.is_staff:
            return True
            
        # Users can only modify their own account
        return obj == request.user


class ReadOnlyOrOwner(permissions.BasePermission):
    """
    Permission that allows read-only access to everyone,
    but write access only to the owner.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Read permissions for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True

        # Write permissions only for the owner
        return hasattr(obj, 'user') and obj.user == request.user


class IsSuperUserOrReadOnly(permissions.BasePermission):
    """
    Permission that allows read access to authenticated users,
    but write access only to superusers.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        if request.method in permissions.SAFE_METHODS:
            return True
            
        return request.user.is_superuser


class IsOwnerOrStaff(permissions.BasePermission):
    """
    Permission that allows access to owners and staff members.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def has_object_permission(self, request, view, obj):
        # Staff have full access
        if request.user.is_staff:
            return True
            
        # Check if user is the owner
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        else:
            return obj == request.user


class HasAPIAccess(permissions.BasePermission):
    """
    Permission for API access based on user subscription level.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Check if user has API access enabled
        return getattr(request.user, 'api_access_enabled', False)


class RateLimitedPermission(permissions.BasePermission):
    """
    Base permission class that can be extended with rate limiting.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # This is a base implementation
        # Rate limiting logic would be implemented in subclasses
        return True


class TrialUserPermission(permissions.BasePermission):
    """
    Permission for trial users with limited access.
    """

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated):
            return False
            
        # Allow access for trial users during trial period
        if hasattr(request.user, 'is_trial_active'):
            return request.user.is_trial_active()
            
        # Allow access for subscribed users
        return getattr(request.user, 'has_active_subscription', False)


# Composite permissions for common use cases
class AuthenticatedActiveUser(permissions.BasePermission):
    """
    Combination of IsAuthenticated and IsActiveUser.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active
        )


class AuthenticatedVerifiedUser(permissions.BasePermission):
    """
    Combination of IsAuthenticated and IsVerifiedUser.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active and
            getattr(request.user, 'email_verified', False)
        )


class FullAccessPermission(permissions.BasePermission):
    """
    Full access permission for authenticated, active, verified users.
    """
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.is_active and
            getattr(request.user, 'email_verified', False)
        )

    def has_object_permission(self, request, view, obj):
        # Staff have full access
        if request.user.is_staff:
            return True
            
        # Users can access their own objects
        if hasattr(obj, 'user'):
            return obj.user == request.user
        elif hasattr(obj, 'owner'):
            return obj.owner == request.user
        else:
            return obj == request.user
