from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
import uuid

import uuid

class Category(models.Model):
    """
    Model for managing income and expense categories with UK tax compliance features.
    Replaces hardcoded transaction categories with flexible, user-manageable categories.
    """
    # Use UUID for better security and global uniqueness
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Category details
    name = models.CharField(max_length=100, help_text="Category name (e.g., 'Office Supplies')")
    
    # Category type choices
    INCOME = 'income'
    EXPENSE = 'expense'
    CATEGORY_TYPE_CHOICES = [
        (INCOME, 'Income'),
        (EXPENSE, 'Expense'),
    ]
    type = models.CharField(
        max_length=10,
        choices=CATEGORY_TYPE_CHOICES,
        help_text="Whether this category is for income or expenses"
    )
    
    description = models.TextField(blank=True, null=True, help_text="Optional description for the category")
    
    # UK tax compliance fields
    is_tax_deductible = models.BooleanField(
        default=False,
        help_text="Whether expenses in this category are tax deductible for UK tax purposes"
    )
    vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=20.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Default VAT rate for this category (percentage, e.g., 20.00 for 20%)"
    )
    
    # System vs user categories
    is_default = models.BooleanField(
        default=False,
        help_text="System default categories that cannot be deleted"
    )
    
    # Owner - null for system defaults, specific user for custom categories
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='custom_categories',
        help_text="Owner of custom categories. Null for system default categories."
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['type', 'name']
        # Ensure category names are unique per user and type
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'type', 'owner'],
                name='unique_category_per_user'
            ),
            models.UniqueConstraint(
                fields=['name', 'type'],
                condition=models.Q(owner__isnull=True),
                name='unique_default_category'
            )
        ]
    
    def __str__(self):
        prefix = "📈" if self.type == self.INCOME else "📉"
        return f"{prefix} {self.name}"
    
    @property
    def is_system_default(self):
        """Check if this is a system default category"""
        return self.is_default and self.owner is None


class Receipt(models.Model):
    """
    Model to store uploaded receipt images and the OCR processing data from Veryfi.
    """
    # Owner relationship
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='receipts'
    )
    
    # Upload information
    file = models.FileField(upload_to='receipts/')
    original_filename = models.CharField(max_length=255)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # OCR processing status
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    OCR_STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
    ]
    ocr_status = models.CharField(
        max_length=20,
        choices=OCR_STATUS_CHOICES,
        default=PENDING
    )
    
    # OCR confidence and verification
    ocr_confidence = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, 
        blank=True,
        help_text="OCR confidence score (0-100)"
    )
    
    # Auto-approval threshold (85% as per UI/UX doc)
    is_auto_approved = models.BooleanField(default=False)
    is_manually_verified = models.BooleanField(default=False)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        related_name='verified_receipts',
        null=True, 
        blank=True
    )
    verified_at = models.DateTimeField(null=True, blank=True)
    
    # Veryfi specific fields
    veryfi_document_id = models.CharField(max_length=255, null=True, blank=True)
    veryfi_response_data = models.JSONField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        
    def __str__(self):
        return f"Receipt {self.id} - {self.original_filename}"
    
    @property
    def is_verified(self):
        """Check if receipt is verified either automatically or manually"""
        return self.is_auto_approved or self.is_manually_verified
    
    @property
    def receipt_date(self):
        """Extract receipt date from Veryfi data if available"""
        if self.veryfi_response_data and 'date' in self.veryfi_response_data:
            return self.veryfi_response_data['date']
        return None
    
    @property
    def total_amount(self):
        """Extract total amount from Veryfi data if available"""
        if self.veryfi_response_data and 'total' in self.veryfi_response_data:
            return self.veryfi_response_data['total']
        return None


class Transaction(models.Model):
    """
    Model to store transaction data extracted from receipts.
    """
    # Receipt relationship
    receipt = models.OneToOneField(
        Receipt, 
        on_delete=models.CASCADE, 
        related_name='transaction'
    )
    
    # Owner relationship
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='transactions'
    )
    
    # Transaction details
    vendor_name = models.CharField(max_length=255, blank=True, null=True)
    transaction_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='GBP')
    
    # UK-specific tax information
    vat_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_vat_registered = models.BooleanField(default=False)
    
    # Category relationship - replaces hardcoded category choices
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,  # Prevent deletion of categories that have transactions
        related_name='transactions',
        help_text="Transaction category for organization and tax reporting"
    )
    
    # UK tax deductible status
    is_tax_deductible = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    
    # Additional data
    line_items = models.JSONField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-transaction_date']
        
    def __str__(self):
        return f"{self.vendor_name} - £{self.total_amount} - {self.transaction_date}"


class Report(models.Model):
    """
    Model to track generated financial reports with metadata and file information.
    Supports various UK tax and business reporting requirements.
    """
    # Use UUID for better security
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Owner relationship
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    
    # Report details
    report_name = models.CharField(max_length=200, help_text="Descriptive name for the report")
    
    # Report type choices for UK business needs
    MONTHLY = 'monthly'
    QUARTERLY = 'quarterly' 
    ANNUAL = 'annual'
    CUSTOM = 'custom'
    VAT_RETURN = 'vat_return'
    PROFIT_LOSS = 'profit_loss'
    EXPENSE_SUMMARY = 'expense_summary'
    INCOME_SUMMARY = 'income_summary'
    
    REPORT_TYPE_CHOICES = [
        (MONTHLY, 'Monthly Report'),
        (QUARTERLY, 'Quarterly Report'),
        (ANNUAL, 'Annual Report'),
        (CUSTOM, 'Custom Date Range'),
        (VAT_RETURN, 'VAT Return'),
        (PROFIT_LOSS, 'Profit & Loss Statement'),
        (EXPENSE_SUMMARY, 'Expense Summary'),
        (INCOME_SUMMARY, 'Income Summary'),
    ]
    
    report_type = models.CharField(
        max_length=50,
        choices=REPORT_TYPE_CHOICES,
        help_text="Type of financial report"
    )
    
    # Date range for the report
    period_start = models.DateField(help_text="Start date for the report period")
    period_end = models.DateField(help_text="End date for the report period")
    
    # File information
    file_path = models.CharField(max_length=500, blank=True, null=True, help_text="Path to generated report file")
    file_size = models.BigIntegerField(blank=True, null=True, help_text="File size in bytes")
    
    # Export format choices
    PDF = 'PDF'
    CSV = 'CSV'
    EXCEL = 'Excel'
    JSON = 'JSON'
    
    FORMAT_CHOICES = [
        (PDF, 'PDF'),
        (CSV, 'CSV'),
        (EXCEL, 'Excel'),
        (JSON, 'JSON'),
    ]
    
    format = models.CharField(
        max_length=10,
        choices=FORMAT_CHOICES,
        default=PDF,
        help_text="Export format for the report"
    )
    
    # Report generation parameters stored as JSON for flexibility
    parameters = models.JSONField(
        blank=True,
        null=True,
        help_text="Parameters used to generate the report (categories, filters, etc.)"
    )
    
    # Generation status
    PENDING = 'pending'
    GENERATING = 'generating'
    COMPLETED = 'completed'
    FAILED = 'failed'
    
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (GENERATING, 'Generating'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
    ]
    
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING,
        help_text="Current status of report generation"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    generated_at = models.DateTimeField(blank=True, null=True, help_text="When the report was successfully generated")
    expires_at = models.DateTimeField(blank=True, null=True, help_text="When the report file expires and should be cleaned up")
    
    class Meta:
        verbose_name = 'Report'
        verbose_name_plural = 'Reports'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.report_name} ({self.period_start} to {self.period_end})"
    
    @property
    def is_generated(self):
        """Check if report has been successfully generated"""
        return self.status == self.COMPLETED and self.file_path
    
    @property
    def period_description(self):
        """Human-readable description of the report period"""
        if self.period_start == self.period_end:
            return self.period_start.strftime('%d %B %Y')
        return f"{self.period_start.strftime('%d %b %Y')} to {self.period_end.strftime('%d %b %Y')}"
