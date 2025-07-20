from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Account


@admin.register(Account)
class AccountAdmin(UserAdmin):
    """
    Admin configuration for the Account model.
    Extends Django's UserAdmin to include custom fields.
    """
    list_display = (
        'email', 'first_name', 'last_name', 'user_type', 
        'subscription_plan', 'email_verified', 'is_active', 'date_joined'
    )
    list_filter = (
        'user_type', 'subscription_plan', 'email_verified', 
        'is_active', 'is_staff', 'date_joined'
    )
    search_fields = ('email', 'first_name', 'last_name', 'company_name')
    ordering = ('-date_joined',)
    
    # Fields to show in the edit form
    fieldsets = UserAdmin.fieldsets + (
        ('Profile Information', {
            'fields': ('phone_number', 'company_name', 'address', 'city', 'postal_code', 'country')
        }),
        ('Account Settings', {
            'fields': ('user_type', 'email_verified', 'email_verification_token')
        }),
        ('Subscription Information', {
            'fields': (
                'subscription_plan', 'stripe_customer_id', 'stripe_subscription_id', 
                'subscription_status', 'subscription_end_date'
            )
        }),
    )
    
    # Fields to show when adding a new user
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Profile Information', {
            'fields': ('email', 'first_name', 'last_name', 'user_type')
        }),
    )
