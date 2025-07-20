from django.db import models
from django.conf import settings
from django.utils import timezone


class Client(models.Model):
    """
    Client model for accounting firms to manage their clients.
    """
    # Relationship to accounting firm (Account with user_type='accounting_firm')
    accounting_firm = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clients',
        help_text="Accounting firm that manages this client"
    )
    
    # Basic client information
    first_name = models.CharField(max_length=150, help_text="Client's first name")
    last_name = models.CharField(max_length=150, help_text="Client's last name")
    email = models.EmailField(help_text="Client's email address")
    phone_number = models.CharField(max_length=20, blank=True, null=True, help_text="Client's phone number")
    
    # Company/Business information
    company_name = models.CharField(max_length=255, blank=True, null=True, help_text="Client's company name")
    business_type = models.CharField(max_length=100, blank=True, null=True, help_text="Type of business")
    vat_number = models.CharField(max_length=50, blank=True, null=True, help_text="VAT registration number")
    company_registration_number = models.CharField(max_length=50, blank=True, null=True, help_text="Company registration number")
    
    # Address information
    address_line_1 = models.CharField(max_length=255, blank=True, null=True, help_text="First line of address")
    address_line_2 = models.CharField(max_length=255, blank=True, null=True, help_text="Second line of address")
    city = models.CharField(max_length=100, blank=True, null=True, help_text="City")
    county = models.CharField(max_length=100, blank=True, null=True, help_text="County")
    postal_code = models.CharField(max_length=20, blank=True, null=True, help_text="Postal code")
    country = models.CharField(max_length=100, default='United Kingdom', help_text="Country")
    
    # Additional client information
    notes = models.TextField(blank=True, null=True, help_text="Additional notes about the client")
    
    # Status and activation
    is_active = models.BooleanField(default=True, help_text="Whether the client is active or archived")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, help_text="When the client was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="When the client was last updated")
    
    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'
        ordering = ['-created_at']
        # Ensure unique email per accounting firm
        unique_together = ['accounting_firm', 'email']
    
    def __str__(self):
        return f"{self.full_name} ({self.company_name or 'Individual'})"
    
    @property
    def full_name(self):
        """Return the full name of the client"""
        return f"{self.first_name} {self.last_name}"
    
    @property
    def full_address(self):
        """Return the complete address as a formatted string"""
        address_parts = []
        if self.address_line_1:
            address_parts.append(self.address_line_1)
        if self.address_line_2:
            address_parts.append(self.address_line_2)
        if self.city:
            address_parts.append(self.city)
        if self.county:
            address_parts.append(self.county)
        if self.postal_code:
            address_parts.append(self.postal_code)
        if self.country:
            address_parts.append(self.country)
        return ', '.join(address_parts)
    
    def deactivate(self):
        """Deactivate (archive) the client"""
        self.is_active = False
        self.save(update_fields=['is_active', 'updated_at'])
    
    def reactivate(self):
        """Reactivate the client"""
        self.is_active = True
        self.save(update_fields=['is_active', 'updated_at'])
