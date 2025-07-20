from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import Client


class ClientSerializer(serializers.ModelSerializer):
    """
    Serializer for Client model.
    Automatically associates the client with the authenticated firm.
    """
    
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'email', 'phone', 'address', 
            'tax_reference', 'vat_number', 'business_type',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        """Create a new client and associate it with the authenticated firm"""
        # Get the authenticated user from the context
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Authentication required to create a client.")
        
        # Ensure the user is an accounting firm
        if request.user.user_type != request.user.ACCOUNTING_FIRM:
            raise serializers.ValidationError("Only accounting firms can create clients.")
        
        # Check subscription limits before creating
        self._check_subscription_limits(request.user)
        
        # Set the firm to the authenticated user
        validated_data['firm'] = request.user
        
        return super().create(validated_data)
    
    def _check_subscription_limits(self, firm):
        """Check if the firm can add more clients based on their subscription"""
        # Count existing clients for this firm
        current_client_count = Client.objects.filter(firm=firm).count()
        
        # Get the firm's subscription details
        try:
            subscription = firm.subscription_details
            max_clients = subscription.max_clients
        except:
            # If no subscription details, use basic plan limits
            max_clients = 5  # Basic plan default
        
        if current_client_count >= max_clients:
            raise serializers.ValidationError(
                f"Client limit reached. Your current plan allows {max_clients} clients. "
                f"You currently have {current_client_count} clients. "
                f"Please upgrade your subscription to add more clients."
            )


class ClientListSerializer(serializers.ModelSerializer):
    """
    Simplified serializer for listing clients.
    """
    
    class Meta:
        model = Client
        fields = [
            'id', 'name', 'email', 'phone', 'business_type', 'created_at'
        ]
        read_only_fields = fields