from django.db import models
from django.conf import settings
from django.core.validators import RegexValidator


class Client(models.Model):
    """
    Model to represent clients managed by accounting firms.
    """
    # Relationship to accounting firm
    accounting_firm = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clients',
        limit_choices_to={'user_type': 'accounting_firm'},
        help_text="The accounting firm that manages this client"
    )
    
    # Basic company information
    company_name = models.CharField(
        max_length=255,
        help_text="Legal name of the client company"
    )
    contact_person = models.CharField(
        max_length=255,
        help_text="Primary contact person at the client company"
    )
    
    # Contact details
    email = models.EmailField(help_text="Primary email address for the client")
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text="Primary phone number"
    )
    
    # Address information
    address_line_1 = models.CharField(max_length=255, help_text="Street address")
    address_line_2 = models.CharField(max_length=255, blank=True, null=True, help_text="Additional address information")
    city = models.CharField(max_length=100, help_text="City")
    postal_code = models.CharField(
        max_length=20,
        help_text="Postal code",
        validators=[
            RegexValidator(
                regex=r'^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$',
                message="Enter a valid UK postcode (e.g., SW1A 1AA)",
                flags=0
            )
        ]
    )
    country = models.CharField(max_length=100, default='United Kingdom')
    
    # Business information
    vat_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        help_text="VAT registration number if applicable",
        validators=[
            RegexValidator(
                regex=r'^GB[0-9]{9}$|^GB[0-9]{12}$|^GBGD[0-9]{3}$|^GBHA[0-9]{3}$',
                message="Enter a valid UK VAT number (e.g., GB123456789)",
                flags=0
            )
        ]
    )
    
    # Business type choices
    SOLE_TRADER = 'sole_trader'
    LIMITED_COMPANY = 'limited_company'
    PARTNERSHIP = 'partnership'
    LLP = 'llp'
    OTHER = 'other'
    
    BUSINESS_TYPE_CHOICES = [
        (SOLE_TRADER, 'Sole Trader'),
        (LIMITED_COMPANY, 'Limited Company'),
        (PARTNERSHIP, 'Partnership'),
        (LLP, 'Limited Liability Partnership'),
        (OTHER, 'Other'),
    ]
    
    business_type = models.CharField(
        max_length=20,
        choices=BUSINESS_TYPE_CHOICES,
        default=SOLE_TRADER,
        help_text="Type of business entity"
    )
    
    companies_house_number = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Companies House registration number (for limited companies)"
    )
    
    # Status and metadata
    is_active = models.BooleanField(
        default=True,
        help_text="Whether this client is currently active"
    )
    notes = models.TextField(
        blank=True,
        null=True,
        help_text="Internal notes about the client"
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deactivated_at = models.DateTimeField(
        blank=True,
        null=True,
        help_text="When the client was deactivated"
    )
    
    class Meta:
        ordering = ['company_name']
        unique_together = ['accounting_firm', 'company_name']
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'
    
    def __str__(self):
        return f"{self.company_name} ({self.contact_person})"
    
    @property
    def full_address(self):
        """Return the complete formatted address"""
        address_parts = [self.address_line_1]
        if self.address_line_2:
            address_parts.append(self.address_line_2)
        address_parts.extend([self.city, self.postal_code, self.country])
        return ', '.join(address_parts)
    
    @property
    def is_vat_registered(self):
        """Check if the client is VAT registered"""
        return bool(self.vat_number)
    
    def deactivate(self):
        """Deactivate the client"""
        from django.utils import timezone
        self.is_active = False
        self.deactivated_at = timezone.now()
        self.save()
    
    def reactivate(self):
        """Reactivate the client"""
        self.is_active = True
        self.deactivated_at = None
        self.save()
