from rest_framework import serializers
from .models import Subscription, PaymentHistory


class SubscriptionSerializer(serializers.ModelSerializer):
    """
    Serializer for the Subscription model
    """
    plan_display = serializers.CharField(source='get_plan_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_active = serializers.SerializerMethodField()
    
    class Meta:
        model = Subscription
        fields = [
            'id', 'plan', 'plan_display', 'status', 'status_display',
            'stripe_subscription_id', 'stripe_customer_id',
            'current_period_start', 'current_period_end', 'cancel_at_period_end',
            'amount', 'currency', 'max_documents', 'has_api_access',
            'has_report_export', 'has_bulk_upload', 'has_white_label',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'stripe_subscription_id', 'stripe_customer_id',
            'current_period_start', 'current_period_end', 'amount',
            'max_documents', 'has_api_access', 'has_report_export',
            'has_bulk_upload', 'has_white_label', 'created_at', 'updated_at'
        ]
    
    def get_is_active(self, obj):
        """Check if subscription is currently active"""
        return obj.status == Subscription.ACTIVE


class PaymentHistorySerializer(serializers.ModelSerializer):
    """
    Serializer for the PaymentHistory model
    """
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PaymentHistory
        fields = [
            'id', 'stripe_invoice_id', 'stripe_payment_intent_id',
            'amount_paid', 'currency', 'status', 'status_display',
            'invoice_pdf_url', 'invoice_number', 'period_start',
            'period_end', 'payment_date', 'created_at'
        ]
        read_only_fields = '__all__'


class SubscriptionPlanSerializer(serializers.Serializer):
    """
    Serializer for subscription plan information
    """
    plan = serializers.CharField()
    name = serializers.CharField()
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(default='GBP')
    features = serializers.DictField()
    stripe_price_id = serializers.CharField()
    popular = serializers.BooleanField(default=False)


class CreateSubscriptionSerializer(serializers.Serializer):
    """
    Serializer for creating a new subscription
    """
    plan = serializers.ChoiceField(choices=Subscription.PLAN_CHOICES)
    payment_method_id = serializers.CharField(help_text="Stripe payment method ID")
    
    def validate_plan(self, value):
        """Validate that the plan is valid"""
        if value not in [choice[0] for choice in Subscription.PLAN_CHOICES]:
            raise serializers.ValidationError("Invalid plan selected")
        return value


class UpdateSubscriptionSerializer(serializers.Serializer):
    """
    Serializer for updating an existing subscription
    """
    plan = serializers.ChoiceField(choices=Subscription.PLAN_CHOICES, required=False)
    cancel_at_period_end = serializers.BooleanField(required=False)
    
    def validate_plan(self, value):
        """Validate that the plan is valid"""
        if value not in [choice[0] for choice in Subscription.PLAN_CHOICES]:
            raise serializers.ValidationError("Invalid plan selected")
        return value


class PaymentMethodSerializer(serializers.Serializer):
    """
    Serializer for payment method information from Stripe
    """
    id = serializers.CharField()
    type = serializers.CharField()
    card = serializers.DictField(required=False)
    is_default = serializers.BooleanField(default=False)