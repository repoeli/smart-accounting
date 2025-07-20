from django.contrib import admin
from .models import Receipt, Transaction, Category


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'type', 'user', 'is_default', 'created_at']
    list_filter = ['type', 'is_default', 'created_at']
    search_fields = ['name', 'user__email', 'user__username']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['user', 'type', 'name']


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ['id', 'owner', 'original_filename', 'ocr_status', 'uploaded_at']
    list_filter = ['ocr_status', 'is_auto_approved', 'is_manually_verified', 'uploaded_at']
    search_fields = ['original_filename', 'owner__email', 'vendor_name']
    readonly_fields = ['uploaded_at', 'created_at', 'updated_at', 'veryfi_document_id']
    ordering = ['-uploaded_at']


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'vendor_name', 'transaction_date', 'total_amount', 'category', 'owner']
    list_filter = ['category__type', 'transaction_date', 'is_tax_deductible', 'currency']
    search_fields = ['vendor_name', 'owner__email', 'category__name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-transaction_date']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('category', 'owner')
