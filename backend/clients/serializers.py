from rest_framework import serializers
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for Client model with full details.
    """
    full_address = serializers.ReadOnlyField()
    is_vat_registered = serializers.ReadOnlyField()
    
    class Meta:
        model = Client
        fields = [
            'id',
            'company_name',
            'contact_person',
            'email',
            'phone_number',
            'address_line_1',
            'address_line_2',
            'city',
            'postal_code',
            'country',
            'vat_number',
            'business_type',
            'companies_house_number',
            'is_active',
            'notes',
            'created_at',
            'updated_at',
            'deactivated_at',
            'full_address',
            'is_vat_registered',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'deactivated_at']
    
    def validate_vat_number(self, value):
        """Validate VAT number format"""
        if value and not value.upper().startswith('GB'):
            raise serializers.ValidationError("VAT number must start with 'GB' for UK businesses")
        return value.upper() if value else value
    
    def validate_postal_code(self, value):
        """Validate and format postal code"""
        if value:
            # Convert to uppercase and ensure proper spacing
            value = value.upper().replace(' ', '')
            if len(value) >= 5:
                # Insert space before last 3 characters
                value = value[:-3] + ' ' + value[-3:]
        return value


class ClientListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for client list view.
    """
    is_vat_registered = serializers.ReadOnlyField()
    
    class Meta:
        model = Client
        fields = [
            'id',
            'company_name',
            'contact_person',
            'email',
            'phone_number',
            'city',
            'business_type',
            'is_active',
            'is_vat_registered',
            'created_at',
        ]


class ClientCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating new clients.
    """
    class Meta:
        model = Client
        fields = [
            'company_name',
            'contact_person',
            'email',
            'phone_number',
            'address_line_1',
            'address_line_2',
            'city',
            'postal_code',
            'country',
            'vat_number',
            'business_type',
            'companies_house_number',
            'notes',
        ]
    
    def validate_vat_number(self, value):
        """Validate VAT number format"""
        if value and not value.upper().startswith('GB'):
            raise serializers.ValidationError("VAT number must start with 'GB' for UK businesses")
        return value.upper() if value else value
    
    def validate_postal_code(self, value):
        """Validate and format postal code"""
        if value:
            # Convert to uppercase and ensure proper spacing
            value = value.upper().replace(' ', '')
            if len(value) >= 5:
                # Insert space before last 3 characters
                value = value[:-3] + ' ' + value[-3:]
        return value
    
    def create(self, validated_data):
        """Create a new client with the current user as accounting firm"""
        accounting_firm = self.context['request'].user
        validated_data['accounting_firm'] = accounting_firm
        return super().create(validated_data)