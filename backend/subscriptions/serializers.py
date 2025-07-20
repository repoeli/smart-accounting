from rest_framework import serializers
from .models import Subscription, PaymentHistory


class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for subscription data
    """
    plan_display = serializers.CharField(source='get_plan_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_display', 'status', 'status_display',
            'current_period_start', 'current_period_end', 'cancel_at_period_end',
            'amount', 'currency', 'max_documents', 'has_api_access',
            'has_report_export', 'has_bulk_upload', 'has_white_label',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class PaymentHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for payment history data
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PaymentHistory
        fields = [
            'id', 'stripe_invoice_id', 'amount_paid', 'currency',
            'status', 'status_display', 'invoice_pdf_url', 'invoice_number',
            'period_start', 'period_end', 'payment_date'
        ]
        read_only_fields = ['id']


class CustomerPortalLinkSerializer(serializers.Serializer):
    """
    Serializer for customer portal link response
    """
    url = serializers.URLField()