from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from .validators import validate_document_file

class Receipt(models.Model):
    """
    Model to store uploaded document images and the OCR processing data.
    This serves as the Document model mentioned in the user story.
    """
    # Owner relationship
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='receipts'
    )
    
    # Client assignment for accounting firms
    assigned_client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='assigned_documents',
        null=True,
        blank=True,
        help_text="Client this document is assigned to (for accounting firm users)"
    )
    
    # Upload information with validation
    file = models.FileField(
        upload_to='receipts/', 
        validators=[validate_document_file],
        help_text="Accepted formats: JPEG, PNG, PDF, HEIC. Maximum size: 10MB."
    )
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
    
    # OCR results from Tesseract
    ocr_text = models.TextField(
        blank=True, 
        null=True, 
        help_text="Raw OCR text extracted from the document"
    )
    extracted_data = models.JSONField(
        blank=True, 
        null=True, 
        help_text="Structured data extracted from OCR text"
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
