from django.contrib import admin
from .models import Receipt, Transaction


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Receipt model.
    """
    list_display = (
        'original_filename', 'owner', 'ocr_status', 'ocr_confidence',
        'is_auto_approved', 'is_manually_verified', 'uploaded_at'
    )
    list_filter = (
        'ocr_status', 'is_auto_approved', 'is_manually_verified', 
        'uploaded_at', 'verified_at'
    )
    search_fields = ('original_filename', 'owner__email', 'owner__first_name', 'owner__last_name')
    readonly_fields = ('uploaded_at', 'verified_at')
    ordering = ('-uploaded_at',)
    
    fieldsets = (
        ('File Information', {
            'fields': ('file', 'original_filename', 'owner', 'uploaded_at')
        }),
        ('OCR Processing', {
            'fields': ('ocr_status', 'ocr_confidence', 'raw_ocr_data')
        }),
        ('Verification', {
            'fields': (
                'is_auto_approved', 'is_manually_verified', 
                'verified_by', 'verified_at', 'verification_notes'
            )
        }),
    )


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    """
    Admin configuration for the Transaction model.
    """
    list_display = (
        'receipt', 'business_name', 'total_amount', 'transaction_type',
        'category', 'currency', 'transaction_date'
    )
    list_filter = (
        'transaction_type', 'category', 'currency', 'transaction_date',
        'receipt__owner'
    )
    search_fields = (
        'business_name', 'receipt__original_filename', 
        'receipt__owner__email'
    )
    ordering = ('-transaction_date',)
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('receipt', 'business_name', 'transaction_date')
        }),
        ('Financial Details', {
            'fields': (
                'total_amount', 'subtotal', 'vat_amount', 'vat_rate',
                'currency', 'transaction_type', 'category'
            )
        }),
        ('Address Information', {
            'fields': ('address', 'city', 'postal_code', 'country')
        }),
        ('Additional Information', {
            'fields': ('payment_method', 'reference_number', 'notes')
        }),
    )
