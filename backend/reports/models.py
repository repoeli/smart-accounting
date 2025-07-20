from django.db import models
from django.conf import settings
from django.utils import timezone


class Report(models.Model):
    """
    Model to store financial report generation requests and metadata.
    """
    # Report types
    PROFIT_LOSS = 'profit_loss'
    EXPENSE_SUMMARY = 'expense_summary'
    
    REPORT_TYPE_CHOICES = [
        (PROFIT_LOSS, 'Profit & Loss'),
        (EXPENSE_SUMMARY, 'Expense Summary'),
    ]
    
    # Report formats
    PDF = 'pdf'
    CSV = 'csv'
    
    FORMAT_CHOICES = [
        (PDF, 'PDF'),
        (CSV, 'CSV'),
    ]
    
    # Report status
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
    
    # Basic fields
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    
    report_type = models.CharField(
        max_length=20,
        choices=REPORT_TYPE_CHOICES,
        help_text="Type of financial report"
    )
    
    format = models.CharField(
        max_length=5,
        choices=FORMAT_CHOICES,
        default=PDF,
        help_text="Format of the generated report"
    )
    
    # Date range for the report
    start_date = models.DateField(help_text="Start date for the report period")
    end_date = models.DateField(help_text="End date for the report period")
    
    # Processing status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=PENDING
    )
    
    # Task tracking
    celery_task_id = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        help_text="Celery task ID for background processing"
    )
    
    # File storage
    file_path = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        help_text="Path to the generated report file"
    )
    
    # Additional metadata
    parameters = models.JSONField(
        default=dict,
        blank=True,
        help_text="Additional parameters used for report generation"
    )
    
    error_message = models.TextField(
        blank=True,
        null=True,
        help_text="Error message if report generation failed"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="Timestamp when report generation was completed"
    )
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.get_report_type_display()} - {self.owner.email} - {self.start_date} to {self.end_date}"
    
    @property
    def is_ready(self):
        """Check if the report is ready for download"""
        return self.status == self.COMPLETED and self.file_path
    
    @property
    def is_processing(self):
        """Check if the report is currently being processed"""
        return self.status in [self.PENDING, self.PROCESSING]
    
    def mark_as_processing(self):
        """Mark the report as being processed"""
        self.status = self.PROCESSING
        self.save(update_fields=['status', 'updated_at'])
    
    def mark_as_completed(self, file_path):
        """Mark the report as completed with the file path"""
        self.status = self.COMPLETED
        self.file_path = file_path
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'file_path', 'completed_at', 'updated_at'])
    
    def mark_as_failed(self, error_message):
        """Mark the report as failed with an error message"""
        self.status = self.FAILED
        self.error_message = error_message
        self.save(update_fields=['status', 'error_message', 'updated_at'])
