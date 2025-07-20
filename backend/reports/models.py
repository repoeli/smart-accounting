from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Report(models.Model):
    """
    Generated financial reports with caching and audit trails.
    Based on Implementation Plan database design.
    """
    REPORT_TYPE_CHOICES = [
        ('monthly', 'Monthly Report'),
        ('quarterly', 'Quarterly Report'),
        ('annual', 'Annual Report'),
        ('custom', 'Custom Report'),
        ('vat_return', 'VAT Return'),
        ('profit_loss', 'Profit & Loss'),
        ('expense_summary', 'Expense Summary'),
    ]

    FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('CSV', 'CSV'),
        ('Excel', 'Excel'),
        ('JSON', 'JSON'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('generating', 'Generating'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reports'
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports'
    )
    
    # Report details
    report_name = models.CharField(max_length=200)
    report_type = models.CharField(max_length=50, choices=REPORT_TYPE_CHOICES)
    period_start = models.DateField()
    period_end = models.DateField()
    
    # File details
    file_path = models.CharField(max_length=500, blank=True, null=True)
    file_size = models.BigIntegerField(null=True, blank=True)
    format = models.CharField(max_length=10, choices=FORMAT_CHOICES)
    
    # Report configuration
    parameters = models.JSONField(
        blank=True,
        null=True,
        help_text="Store report generation parameters"
    )
    
    # Status tracking
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    generated_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Automated cleanup of temporary/cached reports"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Report'
        verbose_name_plural = 'Reports'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'period_start', 'period_end']),
            models.Index(fields=['report_type', 'status']),
            models.Index(fields=['expires_at'], condition=models.Q(expires_at__isnull=False)),
        ]

    def __str__(self):
        return f"{self.report_name} ({self.period_start} to {self.period_end})"

    @property
    def is_expired(self):
        """Check if report has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    def set_expiration(self, days=30):
        """Set report expiration date"""
        self.expires_at = timezone.now() + timezone.timedelta(days=days)
        return self
