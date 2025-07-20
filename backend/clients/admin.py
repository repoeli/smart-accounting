from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """
    Admin interface for Client model.
    """
    list_display = [
        'company_name',
        'contact_person', 
        'email',
        'business_type',
        'is_active',
        'is_vat_registered',
        'accounting_firm',
        'created_at'
    ]
    list_filter = [
        'is_active',
        'business_type',
        'accounting_firm',
        'created_at'
    ]
    search_fields = [
        'company_name',
        'contact_person',
        'email',
        'vat_number'
    ]
    readonly_fields = [
        'created_at',
        'updated_at',
        'deactivated_at'
    ]
    fieldsets = (
        ('Basic Information', {
            'fields': ('accounting_firm', 'company_name', 'contact_person', 'email', 'phone_number')
        }),
        ('Address', {
            'fields': ('address_line_1', 'address_line_2', 'city', 'postal_code', 'country')
        }),
        ('Business Information', {
            'fields': ('business_type', 'vat_number', 'companies_house_number')
        }),
        ('Status & Notes', {
            'fields': ('is_active', 'notes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'deactivated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def is_vat_registered(self, obj):
        """Display VAT registration status"""
        return bool(obj.vat_number)
    is_vat_registered.boolean = True
    is_vat_registered.short_description = 'VAT Registered'
