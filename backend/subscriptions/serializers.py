from rest_framework import serializers
from .models import Subscription, PaymentHistory


class SubscriptionPlanSerializer(serializers.Serializer):
    """Serializer for subscription plan information"""
    plan_id = serializers.CharField()
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField()
    interval = serializers.CharField()
    features = serializers.ListField(child=serializers.CharField())
    max_documents = serializers.IntegerField()
    has_api_access = serializers.BooleanField()
    has_report_export = serializers.BooleanField()
    has_bulk_upload = serializers.BooleanField()
    has_white_label = serializers.BooleanField()
    recommended = serializers.BooleanField(default=False)


class SubscriptionSerializer(serializers.ModelSerializer):
    """Serializer for user subscription details"""
    plan_display = serializers.CharField(source='get_plan_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    days_remaining = serializers.SerializerMethodField()

    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_display', 'status', 'status_display',
            'current_period_start', 'current_period_end', 'cancel_at_period_end',
            'amount', 'currency', 'max_documents', 'has_api_access',
            'has_report_export', 'has_bulk_upload', 'has_white_label',
            'days_remaining', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_days_remaining(self, obj):
        """Calculate days remaining in current period"""
        if obj.current_period_end:
            from django.utils import timezone
            delta = obj.current_period_end - timezone.now()
            return max(0, delta.days)
        return 0


class CheckoutSessionSerializer(serializers.Serializer):
    """Serializer for creating Stripe checkout session"""
    plan_id = serializers.ChoiceField(
        choices=[
            ('basic', 'Basic'),
            ('premium', 'Premium'), 
            ('platinum', 'Platinum')
        ]
    )
    success_url = serializers.URLField()
    cancel_url = serializers.URLField()


class CheckoutSessionResponseSerializer(serializers.Serializer):
    """Serializer for checkout session response"""
    checkout_session_id = serializers.CharField()
    checkout_url = serializers.URLField()


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