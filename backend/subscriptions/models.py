from django.db import models
from django.conf import settings

class Subscription(models.Model):
    """
    Model to store subscription details from Stripe
    """
    # Owner relationship
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='subscription_details'
    )
    
    # Subscription plan choices
    BASIC = 'basic'
    PREMIUM = 'premium'
    PLATINUM = 'platinum'
    PLAN_CHOICES = [
        (BASIC, 'Basic'),
        (PREMIUM, 'Premium'),
        (PLATINUM, 'Platinum'),
    ]
    
    # Subscription details
    plan = models.CharField(max_length=20, choices=PLAN_CHOICES, default=BASIC)
    
    # Status choices
    ACTIVE = 'active'
    CANCELED = 'canceled'
    PAST_DUE = 'past_due'
    TRIALING = 'trialing'
    UNPAID = 'unpaid'
    INCOMPLETE = 'incomplete'
    STATUS_CHOICES = [
        (ACTIVE, 'Active'),
        (CANCELED, 'Canceled'),
        (PAST_DUE, 'Past Due'),
        (TRIALING, 'Trialing'),
        (UNPAID, 'Unpaid'),
        (INCOMPLETE, 'Incomplete'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=ACTIVE)
    
    # Stripe IDs
    stripe_subscription_id = models.CharField(max_length=255, unique=True)
    stripe_customer_id = models.CharField(max_length=255)
    
    # Dates
    current_period_start = models.DateTimeField()
    current_period_end = models.DateTimeField()
    cancel_at_period_end = models.BooleanField(default=False)
    
    # Pricing
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GBP')
    
    # Features based on plan
    max_documents = models.IntegerField(default=50)  # Basic plan default
    has_api_access = models.BooleanField(default=False)
    has_report_export = models.BooleanField(default=False)
    has_bulk_upload = models.BooleanField(default=False)
    has_white_label = models.BooleanField(default=False)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - {self.get_plan_display()} ({self.get_status_display()})"
    
    def update_features_for_plan(self):
        """Update feature flags based on the current plan"""
        if self.plan == self.BASIC:
            self.max_documents = 50
            self.has_api_access = False
            self.has_report_export = False
            self.has_bulk_upload = False
            self.has_white_label = False
        elif self.plan == self.PREMIUM:
            self.max_documents = 200
            self.has_api_access = True
            self.has_report_export = True
            self.has_bulk_upload = False
            self.has_white_label = False
        elif self.plan == self.PLATINUM:
            self.max_documents = 9999999  # Unlimited for practical purposes
            self.has_api_access = True
            self.has_report_export = True
            self.has_bulk_upload = True
            self.has_white_label = True
        return self
    
    def save(self, *args, **kwargs):
        # Update feature flags when saving
        self.update_features_for_plan()
        super().save(*args, **kwargs)


class PaymentHistory(models.Model):
    """
    Model to store payment history for subscriptions
    """
    # User relationship
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='payment_history'
    )
    
    # Payment details
    stripe_invoice_id = models.CharField(max_length=255, unique=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True, null=True)
    
    # Amount
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GBP')
    
    # Status
    PAID = 'paid'
    OPEN = 'open'
    VOID = 'void'
    UNCOLLECTIBLE = 'uncollectible'
    STATUS_CHOICES = [
        (PAID, 'Paid'),
        (OPEN, 'Open'),
        (VOID, 'Void'),
        (UNCOLLECTIBLE, 'Uncollectible'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    
    # Invoice details
    invoice_pdf_url = models.URLField(blank=True, null=True)
    invoice_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    payment_date = models.DateTimeField()
    
    class Meta:
        ordering = ['-payment_date']
        verbose_name_plural = 'Payment histories'
    
    def __str__(self):
        return f"{self.user.email} - {self.amount_paid} {self.currency} - {self.payment_date.strftime('%Y-%m-%d')}"
