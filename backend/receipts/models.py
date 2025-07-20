from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings

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
    
    # Verification status - tracks manual review and verification
    is_verified = models.BooleanField(default=False, help_text="Indicates if transaction has been manually verified")
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        related_name='verified_transactions',
        null=True, 
        blank=True,
        help_text="User who verified this transaction"
    )
    verified_at = models.DateTimeField(null=True, blank=True, help_text="Timestamp when transaction was verified")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-transaction_date']
        
    def __str__(self):
        return f"{self.vendor_name} - £{self.total_amount} - {self.transaction_date}"
    
    @property
    def requires_review(self):
        """
        Check if transaction requires manual review based on:
        - Receipt OCR confidence is low (< 85%)
        - Missing required data (vendor_name, transaction_date, total_amount)
        - Total amount is zero or negative
        - Not yet verified
        """
        if self.is_verified:
            return False
            
        # Check if associated receipt has low confidence
        if hasattr(self.receipt, 'ocr_confidence') and self.receipt.ocr_confidence is not None:
            if self.receipt.ocr_confidence < 85:
                return True
        
        # Check for missing required data
        if not self.vendor_name or not self.transaction_date:
            return True
        
        # Check for invalid amounts
        if not self.total_amount or self.total_amount <= 0:
            return True
            
        return False
    
    @property
    def review_status(self):
        """
        Get human-readable review status
        """
        if self.is_verified:
            return "verified"
        elif self.requires_review:
            return "needs_review"
        else:
            return "pending"
