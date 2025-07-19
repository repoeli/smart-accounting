from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from .models import Account


class RegisterSerializer(serializers.ModelSerializer):
    """
    Serializer for user registration with password validation and confirmation.
    """
    password = serializers.CharField(
        write_only=True, required=True, style={'input_type': 'password'}
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={'input_type': 'password'}
    )
    email = serializers.EmailField(required=True)
    
    class Meta:
        model = Account
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 
            'last_name', 'company_name', 'address', 'city', 
            'postal_code', 'country', 'phone_number'
        ]
        extra_kwargs = {
            'first_name': {'required': True},
            'last_name': {'required': True},
        }
    
    def validate(self, attrs):
        """
        Validate that passwords match and meet requirements.
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError(
                {"password": "Password fields didn't match."}
            )
        
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError({"password": list(e)})
            
        return attrs
    
    def create(self, validated_data):
        """
        Create and return a new user with encrypted password.
        """
        # Remove password_confirm as we don't need to store it
        validated_data.pop('password_confirm', None)
        
        # Create the user account
        user = Account.objects.create_user(
            email=validated_data.pop('email'),
            password=validated_data.pop('password'),
            **validated_data
        )
        
        return user


class AccountSerializer(serializers.ModelSerializer):
    """
    Serializer for user account data.
    """
    class Meta:
        model = Account
        fields = [
            'id', 'email', 'first_name', 'last_name', 'company_name',
            'address', 'city', 'postal_code', 'country', 'phone_number',
            'subscription_status', 'date_joined', 'is_active'
        ]
        read_only_fields = [
            'id', 'email', 'subscription_status', 'date_joined', 'is_active'
        ]


class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for password change.
    """
    old_password = serializers.CharField(
        required=True, style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True, style={'input_type': 'password'}
    )
    
    def validate_new_password(self, value):
        """
        Validate that the new password meets requirements.
        """
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e))
        return value


class EmailVerificationSerializer(serializers.Serializer):
    """
    Serializer for email verification token.
    """
    token = serializers.CharField(required=True)
