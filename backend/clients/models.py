from django.db import models
from django.conf import settings
from django.core.exceptions import ValidationError


class Client(models.Model):
    """
    Model to represent clients managed by accounting firms.
    Each client belongs to an accounting firm (User with user_type=ACCOUNTING_FIRM).
    """
    # Required fields
    name = models.CharField(max_length=255, help_text="Client's full name or company name")
    firm = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clients',
        help_text="The accounting firm that manages this client"
    )
    
    # Optional contact information
    email = models.EmailField(blank=True, null=True, help_text="Client's email address")
    phone = models.CharField(max_length=20, blank=True, null=True, help_text="Client's phone number")
    address = models.TextField(blank=True, null=True, help_text="Client's full address")
    
    # Business information
    tax_reference = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        help_text="Client's tax reference number"
    )
    vat_number = models.CharField(
        max_length=50, 
        blank=True, 
        null=True, 
        help_text="Client's VAT registration number"
    )
    
    # Business type choices
    INDIVIDUAL = 'individual'
    SOLE_TRADER = 'sole_trader'
    PARTNERSHIP = 'partnership'
    LIMITED_COMPANY = 'limited_company'
    LLP = 'llp'
    CHARITY = 'charity'
    OTHER = 'other'
    
    BUSINESS_TYPE_CHOICES = [
        (INDIVIDUAL, 'Individual'),
        (SOLE_TRADER, 'Sole Trader'),
        (PARTNERSHIP, 'Partnership'),
        (LIMITED_COMPANY, 'Limited Company'),
        (LLP, 'Limited Liability Partnership'),
        (CHARITY, 'Charity'),
        (OTHER, 'Other'),
    ]
    
    business_type = models.CharField(
        max_length=20,
        choices=BUSINESS_TYPE_CHOICES,
        blank=True,
        null=True,
        help_text="Type of business entity"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['name']
        constraints = [
            models.UniqueConstraint(
                fields=['name', 'firm'], 
                name='unique_client_name_per_firm',
                violation_error_message="A client with this name already exists for this firm."
            )
        ]
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'
    
    def __str__(self):
        return f"{self.name} ({self.firm.company_name or self.firm.email})"
    
    def clean(self):
        """Validate that the firm is actually an accounting firm"""
        super().clean()
        if self.firm_id and hasattr(self.firm, 'user_type'):
            if self.firm.user_type != self.firm.ACCOUNTING_FIRM:
                raise ValidationError({
                    'firm': 'Clients can only be assigned to accounting firms.'
                })
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
