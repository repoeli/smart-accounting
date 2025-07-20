from django.contrib import admin
from .models import Client


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    """Admin configuration for Client model"""
    list_display = ['name', 'firm', 'email', 'phone', 'business_type', 'created_at']
    list_filter = ['business_type', 'created_at', 'firm']
    search_fields = ['name', 'email', 'firm__email', 'firm__company_name']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'firm', 'email', 'phone')
        }),
        ('Address', {
            'fields': ('address',),
            'classes': ('collapse',)
        }),
        ('Business Information', {
            'fields': ('business_type', 'tax_reference', 'vat_number'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        """Filter clients based on user permissions"""
        qs = super().get_queryset(request)
        
        # If the user is an accounting firm, only show their clients
        if hasattr(request.user, 'user_type') and request.user.user_type == 'accounting_firm':
            qs = qs.filter(firm=request.user)
        
        return qs
