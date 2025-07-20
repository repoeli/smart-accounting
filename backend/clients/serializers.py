from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Client

Account = get_user_model()


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for Client model with all fields.
    """
    full_name = serializers.ReadOnlyField()
    full_address = serializers.ReadOnlyField()
    accounting_firm_name = serializers.CharField(source='accounting_firm.company_name', read_only=True)
    
    class Meta:
        model = Client
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email', 'phone_number',
            'company_name', 'business_type', 'vat_number', 'company_registration_number',
            'address_line_1', 'address_line_2', 'city', 'county', 'postal_code', 'country',
            'full_address', 'notes', 'is_active', 'accounting_firm_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_name', 'full_address', 'accounting_firm_name']
    
    def create(self, validated_data):
        """
        Create a new client and associate it with the current user (accounting firm).
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['accounting_firm'] = request.user
        return super().create(validated_data)
    
    def validate(self, data):
        """
        Validate client data.
        """
        # Ensure the user is an accounting firm
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            if user.user_type != Account.ACCOUNTING_FIRM:
                raise serializers.ValidationError(
                    "Only accounting firms can manage clients."
                )
        
        return data


class ClientListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for client list view.
    """
    full_name = serializers.ReadOnlyField()
    
    class Meta:
        model = Client
        fields = [
            'id', 'first_name', 'last_name', 'full_name', 'email', 'phone_number',
            'company_name', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'full_name']


class ClientCreateUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating and updating clients.
    """
    
    class Meta:
        model = Client
        fields = [
            'first_name', 'last_name', 'email', 'phone_number',
            'company_name', 'business_type', 'vat_number', 'company_registration_number',
            'address_line_1', 'address_line_2', 'city', 'county', 'postal_code', 'country',
            'notes'
        ]
    
    def create(self, validated_data):
        """
        Create a new client and associate it with the current user (accounting firm).
        """
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['accounting_firm'] = request.user
        return super().create(validated_data)
    
    def validate(self, data):
        """
        Validate client data.
        """
        # Ensure the user is an accounting firm
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            user = request.user
            if user.user_type != Account.ACCOUNTING_FIRM:
                raise serializers.ValidationError(
                    "Only accounting firms can manage clients."
                )
        
        return data