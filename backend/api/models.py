from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class APIToken(models.Model):
    """
    External API access management with rate limiting and usage tracking.
    Based on Implementation Plan database design.
    """
    SCOPE_CHOICES = [
        ('read', 'Read Only'),
        ('write', 'Read & Write'),
        ('admin', 'Full Admin Access'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='api_tokens'
    )
    token_name = models.CharField(max_length=100)
    token_hash = models.CharField(
        max_length=64,
        unique=True,
        help_text="SHA-256 hash of actual token"
    )
    is_active = models.BooleanField(default=True)
    rate_limit_per_minute = models.PositiveIntegerField(default=60)
    allowed_scopes = models.JSONField(
        default=list,
        help_text="Scopes: read, write, admin"
    )
    last_used_at = models.DateTimeField(null=True, blank=True)
    usage_count = models.BigIntegerField(default=0)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'API Token'
        verbose_name_plural = 'API Tokens'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['token_hash']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['expires_at'], condition=models.Q(expires_at__isnull=False)),
        ]

    def __str__(self):
        return f"{self.token_name} ({self.user.email})"

    @property
    def is_expired(self):
        """Check if token has expired"""
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False

    def increment_usage(self):
        """Increment usage counter and update last used timestamp"""
        self.usage_count += 1
        self.last_used_at = timezone.now()
        self.save(update_fields=['usage_count', 'last_used_at'])


class WhiteLabelBranding(models.Model):
    """
    Enterprise white-label branding customization.
    Based on Implementation Plan database design.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='whitelabel_branding'
    )
    company_name = models.CharField(max_length=200)
    logo_url = models.URLField(max_length=500, blank=True, null=True)
    primary_color = models.CharField(
        max_length=7,
        default='#007bff',
        help_text="Hex color code (e.g., #007bff)"
    )
    secondary_color = models.CharField(
        max_length=7,
        default='#6c757d',
        help_text="Hex color code (e.g., #6c757d)"
    )
    custom_domain = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        unique=True
    )
    custom_css = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=False)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'White Label Branding'
        verbose_name_plural = 'White Label Branding'
        indexes = [
            models.Index(fields=['custom_domain'], condition=models.Q(custom_domain__isnull=False)),
        ]

    def __str__(self):
        return f"{self.company_name} ({self.user.email})"

    def generate_custom_css(self):
        """Generate CSS based on branding settings"""
        css = f"""
        :root {{
            --primary-color: {self.primary_color};
            --secondary-color: {self.secondary_color};
            --company-name: '{self.company_name}';
        }}
        
        .navbar-brand::before {{
            content: var(--company-name);
        }}
        
        .btn-primary {{
            background-color: var(--primary-color);
            border-color: var(--primary-color);
        }}
        
        .btn-primary:hover {{
            background-color: var(--primary-color);
            border-color: var(--primary-color);
            opacity: 0.9;
        }}
        """
        
        if self.custom_css:
            css += f"\n\n/* Custom CSS */\n{self.custom_css}"
        
        return css
