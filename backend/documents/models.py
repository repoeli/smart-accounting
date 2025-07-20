from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Document(models.Model):
    """
    Secure storage and metadata management for receipt/invoice documents with OCR tracking.
    Based on Implementation Plan database design.
    """
    # File processing configuration
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB limit
    
    # Supported MIME types
    SUPPORTED_FORMATS = [
        ('image/jpeg', 'JPEG Image'),
        ('image/png', 'PNG Image'), 
        ('application/pdf', 'PDF Document'),
        ('image/heic', 'HEIC Image'),
    ]
    
    # OCR Status choices
    OCR_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='documents'
    )
    
    # File information
    original_filename = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.BigIntegerField(
        validators=[MaxValueValidator(MAX_FILE_SIZE)],
        help_text="File size in bytes, max 10MB"
    )
    mime_type = models.CharField(
        max_length=100,
        choices=SUPPORTED_FORMATS
    )
    file_hash = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        help_text="SHA-256 hash for integrity verification"
    )
    
    # OCR processing
    ocr_status = models.CharField(
        max_length=20,
        choices=OCR_STATUS_CHOICES,
        default='pending'
    )
    ocr_confidence = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="OCR confidence percentage (0.00 to 100.00)"
    )
    ocr_text = models.TextField(blank=True, null=True)
    
    # Review flags
    needs_review = models.BooleanField(
        default=False,
        help_text="Auto-flagged when confidence < 85%"
    )
    is_reviewed = models.BooleanField(
        default=False,
        help_text="Manual review completed"
    )
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='reviewed_documents',
        null=True,
        blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Retention policy (7-year retention as per Implementation Plan)
    retention_date = models.DateField(
        default=lambda: timezone.now().date() + timezone.timedelta(days=7*365),
        help_text="7-year retention policy"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user'], name='documents_user_idx'),
            models.Index(
                fields=['client'], 
                condition=models.Q(client__isnull=False),
                name='documents_client_idx'
            ),
            models.Index(fields=['ocr_status'], name='documents_ocr_status_idx'),
            models.Index(fields=['created_at'], name='documents_created_at_idx'),
            models.Index(fields=['file_hash'], name='documents_file_hash_idx'),
        ]

    def __str__(self):
        return f"{self.original_filename} ({self.user.email})"

    @property
    def needs_ocr_processing(self):
        """Check if document needs OCR processing"""
        return self.ocr_status in ['pending', 'failed']

    @property
    def is_auto_approved(self):
        """Check if OCR confidence is above auto-approval threshold (85%)"""
        return self.ocr_confidence and self.ocr_confidence >= 85


class BulkUploadJob(models.Model):
    """
    Track bulk upload operations and their processing status.
    Maximum 20 receipts per batch as per Implementation Plan.
    """
    STATUS_CHOICES = [
        ('processing', 'Processing'),
        ('completed', 'Completed'), 
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bulk_upload_jobs'
    )
    job_name = models.CharField(max_length=200, blank=True, null=True)
    total_files = models.PositiveIntegerField()
    processed_files = models.PositiveIntegerField(default=0)
    successful_files = models.PositiveIntegerField(default=0)
    failed_files = models.PositiveIntegerField(default=0)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='processing'
    )
    error_details = models.JSONField(blank=True, null=True)
    started_at = models.DateTimeField(default=timezone.now)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = 'Bulk Upload Job'
        verbose_name_plural = 'Bulk Upload Jobs'
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'status'], name='bulk_jobs_user_status_idx'),
            models.Index(fields=['started_at'], name='bulk_jobs_started_at_idx'),
        ]

    def __str__(self):
        return f"Bulk Upload {self.id} - {self.status} ({self.user.email})"

    @property
    def progress_percentage(self):
        """Calculate progress percentage"""
        if self.total_files == 0:
            return 0
        return (self.processed_files / self.total_files) * 100
