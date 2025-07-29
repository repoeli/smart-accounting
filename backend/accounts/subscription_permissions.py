"""
Subscription-based permissions for Smart Accounting reports and features.
Integrates with Stripe subscription system to control access to premium features.
"""

from rest_framework import permissions
from subscriptions.services.stripe_service import StripeService


class SubscriptionBasedPermission(permissions.BasePermission):
    """
    Base permission class for subscription-based access control.
    """
    required_plan = 'basic'  # Override in subclasses
    
    def has_permission(self, request, view):
        # Must be authenticated first
        if not (request.user and request.user.is_authenticated):
            return False
        
        # Staff always have access
        if request.user.is_staff:
            return True
        
        # Check user's subscription plan
        user_plan = self.get_user_plan(request.user)
        return self.has_plan_access(user_plan, self.required_plan)
    
    def get_user_plan(self, user):
        """Get user's current subscription plan"""
        try:
            if hasattr(user, 'subscription_details'):
                subscription = user.subscription_details
                if subscription and subscription.status == 'active':
                    return subscription.plan
            return 'basic'  # Default to basic if no active subscription
        except Exception:
            return 'basic'
    
    def has_plan_access(self, user_plan, required_plan):
        """Check if user's plan meets the requirement"""
        plan_hierarchy = {
            'basic': 1,
            'premium': 2,
            'platinum': 3
        }
        
        user_tier = plan_hierarchy.get(user_plan, 1)
        required_tier = plan_hierarchy.get(required_plan, 1)
        
        return user_tier >= required_tier


class BasicReportPermission(SubscriptionBasedPermission):
    """Permission for basic reports (all authenticated users)"""
    required_plan = 'basic'


class PremiumReportPermission(SubscriptionBasedPermission):
    """Permission for premium reports (premium and platinum users)"""
    required_plan = 'premium'


class PlatinumReportPermission(SubscriptionBasedPermission):
    """Permission for platinum reports (platinum users only)"""
    required_plan = 'platinum'


class ReportExportPermission(SubscriptionBasedPermission):
    """Permission for report export functionality"""
    required_plan = 'premium'
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Additional check for export feature flag
        try:
            user_plan = self.get_user_plan(request.user)
            features = StripeService.get_plan_features(user_plan)
            return features.get('has_report_export', False)
        except Exception:
            return False


class APIAccessPermission(SubscriptionBasedPermission):
    """Permission for API access"""
    required_plan = 'premium'
    
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        
        # Additional check for API access feature flag
        try:
            user_plan = self.get_user_plan(request.user)
            features = StripeService.get_plan_features(user_plan)
            return features.get('has_api_access', False)
        except Exception:
            return False
