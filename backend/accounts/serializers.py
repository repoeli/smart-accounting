from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.contrib.auth import authenticate
from django.utils import timezone
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


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom token serializer that validates account status and updates last_login.
    """
    username_field = Account.USERNAME_FIELD

    def validate(self, attrs):
        # Get the email and password
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Try to authenticate the user
            user = authenticate(
                request=self.context.get('request'),
                username=email,
                password=password
            )

            if not user:
                raise serializers.ValidationError(
                    'Unable to log in with provided credentials.',
                    code='authorization'
                )

            # Check if the user account is active
            if not user.is_active:
                raise serializers.ValidationError(
                    'User account is disabled.',
                    code='authorization'
                )

            # Check if the email is verified
            if not user.email_verified:
                raise serializers.ValidationError(
                    'Email address is not verified. Please check your email for verification link.',
                    code='authorization'
                )

            # Update last_login timestamp
            user.last_login = timezone.now()
            user.save(update_fields=['last_login'])

            # Call the parent validation to generate tokens
            attrs[self.username_field] = user.email
            return super().validate(attrs)
        else:
            raise serializers.ValidationError(
                'Must include "email" and "password".',
                code='authorization'
            )
