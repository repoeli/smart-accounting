from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.conf import settings
from django.utils import timezone


class BulkUploadJob(models.Model):
    """
    Model to track bulk upload jobs and their progress.
    """
    # Owner relationship
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bulk_upload_jobs'
    )
    
    # Job status
    PENDING = 'pending'
    PROCESSING = 'processing'
    COMPLETED = 'completed'
    FAILED = 'failed'
    STATUS_CHOICES = [
        (PENDING, 'Pending'),
        (PROCESSING, 'Processing'),
        (COMPLETED, 'Completed'),
        (FAILED, 'Failed'),
    ]
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING
    )
    
    # Progress tracking
    total_files = models.PositiveIntegerField(default=0)
    processed_files = models.PositiveIntegerField(default=0)
    successful_files = models.PositiveIntegerField(default=0)
    failed_files = models.PositiveIntegerField(default=0)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Bulk Upload {self.id} - {self.owner.email} ({self.status})"
    
    @property
    def progress_percentage(self):
        """Calculate progress percentage"""
        if self.total_files == 0:
            return 0
        return int((self.processed_files / self.total_files) * 100)
    
    @property
    def is_complete(self):
        """Check if the job is complete"""
        return self.status in [self.COMPLETED, self.FAILED]
    
    def update_progress(self, success=True):
        """Update progress counters"""
        self.processed_files += 1
        if success:
            self.successful_files += 1
        else:
            self.failed_files += 1
        
        # Update status if all files are processed
        if self.processed_files >= self.total_files:
            if self.failed_files == 0:
                self.status = self.COMPLETED
            elif self.successful_files == 0:
                self.status = self.FAILED
            else:
                self.status = self.COMPLETED  # Partial success still considered completed
            
            self.completed_at = timezone.now()
        
        self.save()


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
    
    # Bulk upload job relationship (optional)
    bulk_upload_job = models.ForeignKey(
        BulkUploadJob,
        on_delete=models.CASCADE,
        related_name='receipts',
        null=True,
        blank=True,
        help_text="Link to bulk upload job if this receipt was uploaded as part of a bulk operation"
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
