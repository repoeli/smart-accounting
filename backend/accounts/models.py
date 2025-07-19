from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class Account(AbstractUser):
    """
    Custom user model for Smart Accounting application.
    Extends Django's AbstractUser to use email as the unique identifier
    and adds additional fields for user profile and subscription management.
    """
    # Basic profile fields
    email = models.EmailField(unique=True, help_text="Required. Email address for login and verification.")
    phone_number = models.CharField(max_length=20, blank=True, null=True)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    
    # Account type choices
    INDIVIDUAL = 'individual'
    ACCOUNTING_FIRM = 'accounting_firm'
    USER_TYPE_CHOICES = [
        (INDIVIDUAL, 'Individual'),
        (ACCOUNTING_FIRM, 'Accounting Firm'),
    ]
    user_type = models.CharField(
        max_length=20, 
        choices=USER_TYPE_CHOICES, 
        default=INDIVIDUAL,
        help_text="Type of user account"
    )
    
    # Account status and verification
    email_verified = models.BooleanField(default=False, help_text="Indicates if the email has been verified")
    email_verification_token = models.CharField(max_length=255, blank=True, null=True)
    email_verification_sent_at = models.DateTimeField(blank=True, null=True)
    
    # Subscription fields
    BASIC = 'basic'
    PREMIUM = 'premium'
    PLATINUM = 'platinum'
    SUBSCRIPTION_CHOICES = [
        (BASIC, 'Basic'),
        (PREMIUM, 'Premium'),
        (PLATINUM, 'Platinum'),
    ]
    subscription_plan = models.CharField(
        max_length=20, 
        choices=SUBSCRIPTION_CHOICES, 
        default=BASIC,
        help_text="Current subscription plan"
    )
    stripe_customer_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe customer ID")
    stripe_subscription_id = models.CharField(max_length=255, blank=True, null=True, help_text="Stripe subscription ID")
    subscription_status = models.CharField(max_length=50, default='inactive', help_text="Status of the subscription")
    subscription_end_date = models.DateTimeField(blank=True, null=True, help_text="End date of current subscription")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Django configuration
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'first_name', 'last_name']
    
    class Meta:
        verbose_name = 'Account'
        verbose_name_plural = 'Accounts'
    
    def __str__(self):
        return self.email
    
    def save(self, *args, **kwargs):
        # For new users, set username to email if not provided
        if not self.username or self.username == '':
            self.username = self.email
        super().save(*args, **kwargs)
    
    @property
    def is_subscribed(self):
        """Check if user has an active subscription"""
        if self.subscription_status == 'active' and self.subscription_end_date:
            return self.subscription_end_date > timezone.now()
        return False
    
    @property
    def subscription_days_remaining(self):
        """Calculate days remaining in subscription"""
        if self.subscription_end_date and self.is_subscribed:
            delta = self.subscription_end_date - timezone.now()
            return delta.days
        return 0
    
    @property
    def full_name(self):
        """Return the full name of the user"""
        return f"{self.first_name} {self.last_name}"
