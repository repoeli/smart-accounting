from django.db import models
from django.contrib.auth import get_user_model


class TimeStampedModel(models.Model):
    """
    Abstract base model that provides timestamp fields for created and updated dates.
    All other models should inherit from this to ensure consistent timestamp tracking.
    """
    created_at = models.DateTimeField(auto_now_add=True, help_text="Date and time when the record was created")
    updated_at = models.DateTimeField(auto_now=True, help_text="Date and time when the record was last updated")

    class Meta:
        abstract = True


class SoftDeleteModel(models.Model):
    """
    Abstract base model that provides soft delete functionality.
    Records are not actually deleted but marked as deleted with a timestamp.
    """
    deleted_at = models.DateTimeField(null=True, blank=True, help_text="Date and time when the record was soft deleted")
    is_deleted = models.BooleanField(default=False, help_text="Indicates if the record has been soft deleted")

    class Meta:
        abstract = True

    def soft_delete(self):
        """Mark the record as deleted without actually removing it from the database."""
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save()

    def restore(self):
        """Restore a soft deleted record."""
        self.is_deleted = False
        self.deleted_at = None
        self.save()


class AuditableModel(TimeStampedModel):
    """
    Abstract base model that extends TimeStampedModel with user tracking.
    Tracks who created and last updated the record.
    """
    created_by = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_created",
        help_text="User who created this record"
    )
    updated_by = models.ForeignKey(
        get_user_model(),
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="%(class)s_updated",
        help_text="User who last updated this record"
    )

    class Meta:
        abstract = True


class BaseModel(AuditableModel, SoftDeleteModel):
    """
    Complete base model that includes timestamp tracking, user auditing, and soft delete functionality.
    This should be used for most models that need full audit trail capabilities.
    """
    
    class Meta:
        abstract = True
