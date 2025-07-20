from rest_framework import serializers
from .models import Subscription, PaymentHistory


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for subscription details"""
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
    """Serializer for payment history"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PaymentHistory
        fields = [
            'id', 'stripe_invoice_id', 'amount_paid', 'currency',
            'status', 'status_display', 'invoice_pdf_url', 'invoice_number',
            'period_start', 'period_end', 'payment_date', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SubscriptionCancelSerializer(serializers.Serializer):
    """Serializer for subscription cancellation request"""
    cancel_at_period_end = serializers.BooleanField(default=True)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500)