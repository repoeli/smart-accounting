from django.db import models
from django.conf import settings
from django.utils import timezone
import uuid


class Client(models.Model):
    """
    Manages client relationships for accounting firms in multi-tenant architecture.
    Based on Implementation Plan database design.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    accounting_firm = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='clients',
        help_text="The accounting firm managing this client"
    )
    client_name = models.CharField(max_length=200, help_text="Company name or full personal name")
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    tax_reference = models.CharField(
        max_length=50, 
        blank=True, 
        null=True,
        help_text="UK tax references (UTR, NINO) are typically 10-13 characters"
    )
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        verbose_name = 'Client'
        verbose_name_plural = 'Clients'
        ordering = ['client_name']
        indexes = [
            models.Index(fields=['accounting_firm'], name='clients_accounting_firm_idx'),
            models.Index(
                fields=['tax_reference'], 
                condition=models.Q(tax_reference__isnull=False),
                name='clients_tax_ref_idx'
            ),
        ]

    def __str__(self):
        return f"{self.client_name} ({self.accounting_firm.email})"
