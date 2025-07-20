from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """
    Admin configuration for Client model.
    """
    list_display = [
        'full_name', 'email', 'company_name', 'accounting_firm', 
        'is_active', 'created_at', 'updated_at'
    ]
    list_filter = ['is_active', 'business_type', 'created_at', 'updated_at']
    search_fields = [
        'first_name', 'last_name', 'email', 'company_name', 
        'phone_number', 'accounting_firm__email'
    ]
    readonly_fields = ['created_at', 'updated_at', 'full_name', 'full_address']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('accounting_firm', 'first_name', 'last_name', 'email', 'phone_number')
        }),
        ('Company Information', {
            'fields': ('company_name', 'business_type', 'vat_number', 'company_registration_number')
        }),
        ('Address', {
            'fields': ('address_line_1', 'address_line_2', 'city', 'county', 'postal_code', 'country')
        }),
        ('Additional Information', {
            'fields': ('notes',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
        ('Computed Fields', {
            'fields': ('full_name', 'full_address'),
            'classes': ('collapse',)
        })
    )
    
    def get_queryset(self, request):
        """
        Return queryset based on user permissions.
        Staff can see all clients, others see only their own.
        """
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        # For accounting firms, show only their clients
        return qs.filter(accounting_firm=request.user)
