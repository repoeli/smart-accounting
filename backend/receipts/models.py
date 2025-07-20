from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings


class Category(models.Model):
    """
    Model to store income and expense categories.
    Users can create custom categories, and system provides default categories.
    """
    # Category types
    INCOME = 'income'
    EXPENSE = 'expense'
    CATEGORY_TYPE_CHOICES = [
        (INCOME, 'Income'),
        (EXPENSE, 'Expense'),
    ]
    
    # Basic fields
    name = models.CharField(max_length=100, help_text="Category name")
    type = models.CharField(
        max_length=10,
        choices=CATEGORY_TYPE_CHOICES,
        help_text="Whether this is an income or expense category"
    )
    description = models.TextField(blank=True, null=True, help_text="Optional category description")
    
    # Ownership and default status
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='categories',
        null=True,
        blank=True,
        help_text="Owner of the category. Null for default system categories."
    )
    is_default = models.BooleanField(
        default=False,
        help_text="Whether this is a default system category"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['type', 'name']
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        # Ensure unique category names per user per type
        unique_together = [['owner', 'name', 'type']]
    
    def __str__(self):
        prefix = "Default" if self.is_default else f"{self.owner.email if self.owner else 'System'}"
        return f"{prefix} - {self.get_type_display()}: {self.name}"
    
    @property
    def can_be_deleted(self):
        """Check if category can be deleted (not default and not assigned to transactions)"""
        if self.is_default:
            return False
        return not hasattr(self, 'transactions') or not self.transactions.exists()
    
    def clean(self):
        """Validate category data"""
        from django.core.exceptions import ValidationError
        
        # Default categories should not have an owner
        if self.is_default and self.owner:
            raise ValidationError("Default categories cannot have an owner")
        
        # Non-default categories must have an owner
        if not self.is_default and not self.owner:
            raise ValidationError("Custom categories must have an owner")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

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
    
    # Categories
    OFFICE_SUPPLIES = 'office_supplies'
    TRAVEL = 'travel'
    MEALS = 'meals'
    UTILITIES = 'utilities'
    RENT = 'rent'
    SOFTWARE = 'software'
    HARDWARE = 'hardware'
    PROFESSIONAL_SERVICES = 'professional_services'
    MARKETING = 'marketing'
    OTHER = 'other'
    
    CATEGORY_CHOICES = [
        (OFFICE_SUPPLIES, 'Office Supplies'),
        (TRAVEL, 'Travel'),
        (MEALS, 'Meals & Entertainment'),
        (UTILITIES, 'Utilities'),
        (RENT, 'Rent'),
        (SOFTWARE, 'Software & Subscriptions'),
        (HARDWARE, 'Hardware & Equipment'),
        (PROFESSIONAL_SERVICES, 'Professional Services'),
        (MARKETING, 'Marketing & Advertising'),
        (OTHER, 'Other'),
    ]
    
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default=OTHER
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
