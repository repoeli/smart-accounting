from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from .models import Account


class RegisterSerializer(serializers.ModelSerializer):
    """
    Enhanced serializer for user registration with comprehensive validation.
    """
    password = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'},
        help_text="Password must be at least 8 characters long"
    )
    password_confirm = serializers.CharField(
        write_only=True, 
        required=True, 
        style={'input_type': 'password'},
        help_text="Re-enter your password for confirmation"
    )
    email = serializers.EmailField(
        required=True,
        help_text="Valid email address required for account verification"
    )
    
    # Enhanced phone number validation
    phone_number = serializers.CharField(
        required=False,
        allow_blank=True,
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message="Phone number must be entered in the format: '+999999999'. Up to 15 digits allowed."
            )
        ],
        help_text="Optional phone number in international format"
    )
    
    class Meta:
        model = Account
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 
            'last_name', 'company_name', 'address', 'city', 
            'postal_code', 'country', 'phone_number', 'user_type'
        ]
        extra_kwargs = {
            'first_name': {
                'required': True,
                'help_text': "First name is required"
            },
            'last_name': {
                'required': True,
                'help_text': "Last name is required"
            },
            'user_type': {
                'help_text': "Type of account: individual or accounting_firm"
            }
        }
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        if Account.objects.filter(email=value).exists():
            raise serializers.ValidationError(
                "An account with this email already exists."
            )
        return value.lower()  # Normalize email to lowercase
    
    def validate_first_name(self, value):
        """Validate first name."""
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "First name must be at least 2 characters long."
            )
        return value.strip().title()  # Normalize to title case
    
    def validate_last_name(self, value):
        """Validate last name."""
        if len(value.strip()) < 2:
            raise serializers.ValidationError(
                "Last name must be at least 2 characters long."
            )
        return value.strip().title()  # Normalize to title case
    
    def validate(self, attrs):
        """Cross-field validation."""
        # Password confirmation check
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password_confirm": "Password fields didn't match."
            })
        
        # Django password validation
        try:
            validate_password(attrs['password'])
        except ValidationError as e:
            raise serializers.ValidationError({
                "password": list(e)
            })
        
        # Company name required for accounting firms
        if (attrs.get('user_type') == Account.ACCOUNTING_FIRM and 
            not attrs.get('company_name', '').strip()):
            raise serializers.ValidationError({
                "company_name": "Company name is required for accounting firms."
            })
            
        return attrs
    
    def create(self, validated_data):
        """Create user with normalized data."""
        # Remove password_confirm
        validated_data.pop('password_confirm', None)
        
        # Ensure username is set to email
        validated_data['username'] = validated_data['email']
        
        # Normalize company name
        if validated_data.get('company_name'):
            validated_data['company_name'] = validated_data['company_name'].strip()
        
        # Create user (will be inactive until email verification)
        user = Account.objects.create_user(
            email=validated_data.pop('email'),
            password=validated_data.pop('password'),
            is_active=False,  # Require email verification
            **validated_data
        )
        
        return user


class AccountSerializer(serializers.ModelSerializer):
    """
    Enhanced serializer for user account data with computed fields.
    """
    full_name = serializers.ReadOnlyField()
    is_subscribed = serializers.ReadOnlyField()
    subscription_days_remaining = serializers.ReadOnlyField()
    
    class Meta:
        model = Account
        fields = [
            'id', 'email', 'username', 'first_name', 'last_name', 'full_name',
            'company_name', 'address', 'city', 'postal_code', 'country', 
            'phone_number', 'user_type', 'email_verified', 'subscription_plan',
            'subscription_status', 'is_subscribed', 'subscription_days_remaining',
            'date_joined', 'last_login', 'is_active'
        ]
        read_only_fields = [
            'id', 'email', 'username', 'email_verified', 'subscription_plan',
            'subscription_status', 'date_joined', 'last_login', 'is_active'
        ]
    
    def validate_phone_number(self, value):
        """Validate phone number format."""
        if value and not value.strip():
            return None  # Convert empty string to None
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """
    Enhanced serializer for password change with validation.
    """
    old_password = serializers.CharField(
        required=True, 
        style={'input_type': 'password'},
        help_text="Current password"
    )
    new_password = serializers.CharField(
        required=True, 
        style={'input_type': 'password'},
        help_text="New password (must meet security requirements)"
    )
    new_password_confirm = serializers.CharField(
        required=True, 
        style={'input_type': 'password'},
        help_text="Confirm new password"
    )
    
    def validate_new_password(self, value):
        """Validate new password meets requirements."""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e))
        return value
    
    def validate(self, attrs):
        """Cross-field validation."""
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({
                "new_password_confirm": "New password fields didn't match."
            })
        
        if attrs['old_password'] == attrs['new_password']:
            raise serializers.ValidationError({
                "new_password": "New password must be different from current password."
            })
        
        return attrs


class EmailVerificationSerializer(serializers.Serializer):
    """Serializer for email verification."""
    token = serializers.CharField(
        required=True,
        help_text="Email verification token"
    )


class ResendVerificationEmailSerializer(serializers.Serializer):
    """Serializer for resending verification email."""
    email = serializers.EmailField(
        required=True,
        help_text="Email address to resend verification to"
    )


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for password reset request."""
    email = serializers.EmailField(
        required=True,
        help_text="Email address for password reset"
    )


class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset confirmation."""
    token = serializers.CharField(
        required=True,
        help_text="Password reset token"
    )
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        help_text="New password"
    )
    password_confirm = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        help_text="Confirm new password"
    )
    
    def validate_password(self, value):
        """Validate password meets requirements."""
        try:
            validate_password(value)
        except ValidationError as e:
            raise serializers.ValidationError(list(e))
        return value
    
    def validate(self, attrs):
        """Cross-field validation."""
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                "password_confirm": "Password fields didn't match."
            })
        return attrs


class LoginSerializer(serializers.Serializer):
    """Serializer for user login."""
    email = serializers.EmailField(
        required=True,
        help_text="Email address"
    )
    password = serializers.CharField(
        required=True,
        style={'input_type': 'password'},
        help_text="Password"
    )
    
    def validate_email(self, value):
        """Normalize email."""
        return value.lower().strip()
