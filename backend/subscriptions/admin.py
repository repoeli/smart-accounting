from django.contrib import admin
from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Subscription model.
    """
    list_display = (
        'user', 'plan', 'status', 'current_period_start', 
        'current_period_end', 'created_at'
    )
    list_filter = (
        'plan', 'status', 'current_period_start', 'current_period_end',
        'created_at'
    )
    search_fields = (
        'user__email', 'user__first_name', 'user__last_name',
        'stripe_customer_id', 'stripe_subscription_id'
    )
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
    
    fieldsets = (
        ('User Information', {
            'fields': ('user',)
        }),
        ('Subscription Details', {
            'fields': ('plan', 'status')
        }),
        ('Stripe Information', {
            'fields': ('stripe_subscription_id', 'stripe_customer_id')
        }),
        ('Billing Periods', {
            'fields': (
                'current_period_start', 'current_period_end',
                'trial_start', 'trial_end'
            )
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
