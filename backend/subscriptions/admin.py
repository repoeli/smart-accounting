from django.contrib import admin
from .models import Subscription, PaymentHistory


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """
    Admin interface for Subscription model
    """
    list_display = (
        'user', 'plan', 'status', 'amount', 'currency',
        'current_period_start', 'current_period_end', 'cancel_at_period_end',
        'created_at'
    )
    list_filter = ('plan', 'status', 'cancel_at_period_end', 'created_at')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'stripe_subscription_id')
    readonly_fields = (
        'stripe_subscription_id', 'stripe_customer_id', 'current_period_start',
        'current_period_end', 'amount', 'max_documents', 'has_api_access',
        'has_report_export', 'has_bulk_upload', 'has_white_label',
        'created_at', 'updated_at'
    )
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Subscription Details', {
            'fields': ('plan', 'status', 'cancel_at_period_end')
        }),
        ('Stripe Information', {
            'fields': ('stripe_subscription_id', 'stripe_customer_id')
        }),
        ('Billing Information', {
            'fields': ('amount', 'currency', 'current_period_start', 'current_period_end')
        }),
        ('Features', {
            'fields': (
                'max_documents', 'has_api_access', 'has_report_export',
                'has_bulk_upload', 'has_white_label'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
    
    def get_readonly_fields(self, request, obj=None):
        """Make most fields readonly as they should be managed through Stripe"""
        if obj:  # Editing existing object
            return self.readonly_fields + ('user', 'plan')
        return self.readonly_fields


@admin.register(PaymentHistory)
class PaymentHistoryAdmin(admin.ModelAdmin):
    """
    Admin interface for PaymentHistory model
    """
    list_display = (
        'user', 'amount_paid', 'currency', 'status',
        'payment_date', 'period_start', 'period_end', 'created_at'
    )
    list_filter = ('status', 'currency', 'payment_date', 'created_at')
    search_fields = (
        'user__email', 'user__first_name', 'user__last_name',
        'stripe_invoice_id', 'invoice_number'
    )
    readonly_fields = (
        'user', 'stripe_invoice_id', 'stripe_payment_intent_id',
        'amount_paid', 'currency', 'status', 'invoice_pdf_url',
        'invoice_number', 'period_start', 'period_end',
        'payment_date', 'created_at'
    )  # All fields are readonly as they come from Stripe
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Payment Details', {
            'fields': ('amount_paid', 'currency', 'status', 'payment_date')
        }),
        ('Stripe Information', {
            'fields': ('stripe_invoice_id', 'stripe_payment_intent_id')
        }),
        ('Invoice Information', {
            'fields': ('invoice_pdf_url', 'invoice_number')
        }),
        ('Period Information', {
            'fields': ('period_start', 'period_end')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )
    
    def has_add_permission(self, request):
        """Disable adding payments manually as they come from Stripe"""
        return False
    
    def has_change_permission(self, request, obj=None):
        """Disable editing payments as they come from Stripe"""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Allow deletion for cleanup purposes"""
        return True
