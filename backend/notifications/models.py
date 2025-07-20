from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Notification(models.Model):
    """
    System notifications for users including email notifications,
    in-app alerts, and reminders.
    """
    TYPE_CHOICES = [
        ('email', 'Email Notification'),
        ('in_app', 'In-App Alert'),
        ('reminder', 'Reminder'),
        ('tax_deadline', 'Tax Deadline Reminder'),
        ('subscription', 'Subscription Notification'),
        ('system', 'System Alert'),
    ]

    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('failed', 'Failed'),
        ('read', 'Read'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    
    # Notification content
    title = models.CharField(max_length=200)
    message = models.TextField()
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    
    # Delivery details
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    email_subject = models.CharField(max_length=255, blank=True, null=True)
    email_body = models.TextField(blank=True, null=True)
    
    # Scheduling
    scheduled_for = models.DateTimeField(
        default=timezone.now,
        help_text="When to send the notification"
    )
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    action_url = models.URLField(blank=True, null=True, help_text="URL for call-to-action")
    metadata = models.JSONField(blank=True, null=True, help_text="Additional notification data")
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['scheduled_for']),
            models.Index(fields=['type', 'priority']),
        ]

    def __str__(self):
        return f"{self.title} - {self.user.email} ({self.get_status_display()})"

    def mark_as_read(self):
        """Mark notification as read"""
        if self.status != 'read':
            self.status = 'read'
            self.read_at = timezone.now()
            self.save(update_fields=['status', 'read_at'])

    def mark_as_sent(self):
        """Mark notification as sent"""
        self.status = 'sent'
        self.sent_at = timezone.now()
        self.save(update_fields=['status', 'sent_at'])

    @property
    def is_overdue(self):
        """Check if scheduled notification is overdue"""
        return self.status == 'pending' and self.scheduled_for < timezone.now()


class EmailTemplate(models.Model):
    """
    Email templates for different types of notifications.
    """
    TEMPLATE_TYPE_CHOICES = [
        ('welcome', 'Welcome Email'),
        ('verification', 'Email Verification'),
        ('password_reset', 'Password Reset'),
        ('subscription_renewal', 'Subscription Renewal'),
        ('tax_reminder', 'Tax Deadline Reminder'),
        ('report_ready', 'Report Ready'),
        ('payment_failed', 'Payment Failed'),
        ('invoice', 'Invoice'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    template_type = models.CharField(max_length=30, choices=TEMPLATE_TYPE_CHOICES, unique=True)
    subject = models.CharField(max_length=255)
    html_content = models.TextField(help_text="HTML email content with template variables")
    text_content = models.TextField(help_text="Plain text email content")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Email Template'
        verbose_name_plural = 'Email Templates'
        ordering = ['template_type']

    def __str__(self):
        return f"{self.name} ({self.get_template_type_display()})"
