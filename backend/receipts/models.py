from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
import json
from decimal import Decimal

class Receipt(models.Model):
    """
    Model to store uploaded receipt images and new OpenAI OCR extraction data.
    Schema-driven design for flat, semantic structure.
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
    updated_at = models.DateTimeField(auto_now=True)
    
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
    
    # NEW SCHEMA: Extracted data using flat structure
    extracted_data = models.JSONField(
        default=dict, 
        blank=True,
        help_text="Flat semantic receipt data: {vendor, date, total, tax, type, currency}"
    )
    
    # NEW SCHEMA: Performance metadata
    processing_metadata = models.JSONField(
        default=dict,
        blank=True,
        help_text="Performance data: {processing_time, cost_usd, token_usage, segments_processed}"
    )
    
    # Manual verification and confidence
    ocr_confidence = models.FloatField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        null=True, 
        blank=True,
        help_text="OCR confidence score (0-100)"
    )
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
    
    # Processing errors and legacy support
    processing_errors = models.JSONField(default=list, blank=True)
    
    class Meta:
        ordering = ['-uploaded_at']
        
    def __str__(self):
        vendor = self.extracted_data.get('vendor', 'Unknown')
        return f"Receipt {self.id} - {vendor} - {self.original_filename}"
    
    @property
    def is_verified(self):
        """Check if receipt is verified either automatically or manually"""
        return self.is_auto_approved or self.is_manually_verified
    
    @property
    def vendor_name(self):
        """Extract vendor name from new schema"""
        return self.extracted_data.get('vendor', 'Unknown Vendor')
    
    @property
    def transaction_date(self):
        """Extract transaction date from new schema"""
        return self.extracted_data.get('date')
    
    @property
    def total_amount(self):
        """Extract total amount from new schema"""
        return self.extracted_data.get('total', 0)
    
    @property
    def tax_amount(self):
        """Extract tax amount from new schema"""
        return self.extracted_data.get('tax')
    
    @property
    def transaction_type(self):
        """Extract transaction type from new schema"""
        return self.extracted_data.get('type', 'expense')
    
    @property
    def currency(self):
        """Extract currency from new schema"""
        return self.extracted_data.get('currency', 'GBP')
    
    @property
    def processing_time(self):
        """Extract processing time from performance metadata"""
        return self.processing_metadata.get('processing_time', 0)
    
    @property
    def cost_usd(self):
        """Extract cost from performance metadata"""
        return self.processing_metadata.get('cost_usd', 0)
    
    def add_processing_error(self, error_data):
        """Add a processing error to the error log"""
        if not isinstance(self.processing_errors, list):
            self.processing_errors = []
        self.processing_errors.append(error_data)
        self.save()


class Transaction(models.Model):
    """
    Model to store transaction data extracted from receipts using new schema.
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
    
    # Transaction details from new schema
    vendor_name = models.CharField(max_length=255, blank=True, null=True)
    transaction_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='GBP')
    
    # Transaction type
    EXPENSE = 'expense'
    INCOME = 'income'
    TRANSACTION_TYPE_CHOICES = [
        (EXPENSE, 'Expense'),
        (INCOME, 'Income'),
    ]
    transaction_type = models.CharField(
        max_length=10,
        choices=TRANSACTION_TYPE_CHOICES,
        default=EXPENSE
    )
    
    # Categories for expenses
    MEALS = 'meals'
    TRAVEL = 'travel'
    OFFICE_SUPPLIES = 'office_supplies'
    UTILITIES = 'utilities'
    SOFTWARE = 'software'
    HARDWARE = 'hardware'
    MARKETING = 'marketing'
    PROFESSIONAL_SERVICES = 'professional_services'
    RENT = 'rent'
    OTHER = 'other'
    
    CATEGORY_CHOICES = [
        (MEALS, 'Meals & Entertainment'),
        (TRAVEL, 'Travel'),
        (OFFICE_SUPPLIES, 'Office Supplies'),
        (UTILITIES, 'Utilities'),
        (SOFTWARE, 'Software'),
        (HARDWARE, 'Hardware'),
        (MARKETING, 'Marketing'),
        (PROFESSIONAL_SERVICES, 'Professional Services'),
        (RENT, 'Rent'),
        (OTHER, 'Other'),
    ]
    
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default=OTHER
    )
    
    # Additional fields
    notes = models.TextField(blank=True, null=True)
    is_vat_registered = models.BooleanField(default=False)
    line_items = models.JSONField(default=list, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-transaction_date']
        
    def __str__(self):
        return f"{self.vendor_name} - {self.transaction_date} - {self.currency} {self.total_amount}"
    
    @property
    def has_tax(self):
        """Check if transaction has tax/VAT"""
        return self.tax_amount is not None and self.tax_amount > 0


class APIUsageStats(models.Model):
    """
    Model to track OpenAI API usage statistics and costs.
    """
    date = models.DateField(auto_now_add=True)
    api_name = models.CharField(max_length=50, default='openai')
    requests_count = models.PositiveIntegerField(default=0)
    successful_requests = models.PositiveIntegerField(default=0)
    failed_requests = models.PositiveIntegerField(default=0)
    total_cost_usd = models.DecimalField(max_digits=10, decimal_places=6, default=0)
    average_response_time = models.FloatField(default=0)
    total_tokens = models.PositiveIntegerField(default=0)
    
    class Meta:
        unique_together = ['date', 'api_name']
        ordering = ['-date', 'api_name']
    
    def __str__(self):
        return f"{self.api_name} - {self.date} - {self.requests_count} requests"
