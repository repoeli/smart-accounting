from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
import uuid


class Category(models.Model):
    """
    Standardized categorization system for income and expenses with UK tax compliance.
    Based on Implementation Plan database design.
    """
    TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    description = models.TextField(blank=True, null=True)
    is_default = models.BooleanField(default=False, help_text="System default category")
    tax_deductible = models.BooleanField(default=False, help_text="UK tax deductible")
    vat_rate = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(99.99)],
        help_text="VAT rate percentage (0.00 to 99.99%)"
    )

    class Meta:
        verbose_name = 'Category'
        verbose_name_plural = 'Categories'
        ordering = ['type', 'name']
        indexes = [
            models.Index(fields=['type'], name='categories_type_idx'),
            models.Index(
                fields=['is_default'], 
                condition=models.Q(is_default=True),
                name='categories_default_idx'
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()})"


class Transaction(models.Model):
    """
    Core financial data extracted from documents with comprehensive UK tax fields.
    Based on Implementation Plan database design.
    """
    TYPE_CHOICES = [
        ('income', 'Income'),
        ('expense', 'Expense'),
    ]

    CURRENCY_CHOICES = [
        ('GBP', 'British Pound'),
        ('EUR', 'Euro'),
        ('USD', 'US Dollar'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    client = models.ForeignKey(
        'clients.Client',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    document = models.ForeignKey(
        'documents.Document',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='transactions'
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='transactions'
    )
    
    # Vendor and basic info
    vendor_name = models.CharField(max_length=200, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    invoice_number = models.CharField(max_length=100, blank=True, null=True)
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    
    # Financial amounts
    amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        help_text="Supports up to £999,999,999,999.99"
    )
    net_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Amount before VAT"
    )
    vat_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="VAT amount"
    )
    currency = models.CharField(
        max_length=3,
        choices=CURRENCY_CHOICES,
        default='GBP'
    )
    
    # Transaction details
    transaction_date = models.DateField()
    type = models.CharField(max_length=10, choices=TYPE_CHOICES)
    is_business = models.BooleanField(
        default=True,
        help_text="Business vs personal expense"
    )
    
    # Verification
    is_verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        related_name='verified_transactions',
        null=True,
        blank=True
    )
    
    # Retention policy (7-year retention)
    retention_date = models.DateField(
        default=lambda: timezone.now().date() + timezone.timedelta(days=7*365),
        help_text="7-year retention policy"
    )
    
    # Timestamps
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'
        ordering = ['-transaction_date', '-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['client'], condition=models.Q(client__isnull=False)),
            models.Index(fields=['transaction_date', 'type']),
            models.Index(fields=['category']),
            models.Index(fields=['is_business', 'type'], condition=models.Q(is_business=True)),
            models.Index(fields=['-amount']),  # Descending order for largest transactions
            models.Index(fields=['is_verified', 'verified_at']),
        ]

    def __str__(self):
        return f"{self.vendor_name or 'Unknown'} - {self.currency}{self.amount} - {self.transaction_date}"

    @property
    def total_with_vat(self):
        """Calculate total including VAT if separate amounts are provided"""
        if self.net_amount and self.vat_amount:
            return self.net_amount + self.vat_amount
        return self.amount

    def save(self, *args, **kwargs):
        # Auto-calculate VAT if net amount is provided and VAT rate is available
        if self.net_amount and self.category.vat_rate and not self.vat_amount:
            self.vat_amount = self.net_amount * (self.category.vat_rate / 100)
            self.amount = self.net_amount + self.vat_amount
        super().save(*args, **kwargs)
