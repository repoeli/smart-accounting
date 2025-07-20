"""
Comprehensive validators for the Smart Accounting application.
"""
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator as DjangoEmailValidator, RegexValidator
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import get_user_model
import re
from typing import Any, Dict, List

Account = get_user_model()


class PasswordValidator:
    """Enhanced password validation with detailed feedback."""
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, Any]:
        """
        Validate password strength and return detailed feedback.
        
        Returns:
            dict: {
                'is_valid': bool,
                'errors': List[str],
                'score': int (0-5),
                'suggestions': List[str]
            }
        """
        errors = []
        suggestions = []
        score = 0
        
        # Check length
        if len(password) < 8:
            errors.append("Password must be at least 8 characters long.")
            suggestions.append("Use at least 8 characters")
        else:
            score += 1
            
        if len(password) >= 12:
            score += 1
            
        # Check for uppercase letters
        if not re.search(r'[A-Z]', password):
            errors.append("Password must contain at least one uppercase letter.")
            suggestions.append("Add uppercase letters (A-Z)")
        else:
            score += 1
            
        # Check for lowercase letters
        if not re.search(r'[a-z]', password):
            errors.append("Password must contain at least one lowercase letter.")
            suggestions.append("Add lowercase letters (a-z)")
        else:
            score += 1
            
        # Check for digits
        if not re.search(r'\d', password):
            errors.append("Password must contain at least one number.")
            suggestions.append("Add numbers (0-9)")
        else:
            score += 1
            
        # Check for special characters
        if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append("Password must contain at least one special character.")
            suggestions.append("Add special characters (!@#$%^&*)")
        else:
            score += 1
            
        # Check for common patterns
        common_patterns = [
            r'123456', r'password', r'qwerty', r'abc123',
            r'admin', r'letmein', r'welcome', r'monkey'
        ]
        
        for pattern in common_patterns:
            if re.search(pattern, password.lower()):
                errors.append("Password contains common patterns. Choose something more unique.")
                suggestions.append("Avoid common words and patterns")
                score = max(0, score - 1)
                break
                
        # Check for repeated characters
        if re.search(r'(.)\1{2,}', password):
            errors.append("Password should not contain repeated characters.")
            suggestions.append("Avoid repeating the same character")
            score = max(0, score - 1)
            
        # Try Django's built-in validators
        try:
            validate_password(password)
        except ValidationError as e:
            errors.extend(e.messages)
            
        return {
            'is_valid': len(errors) == 0,
            'errors': errors,
            'score': score,
            'suggestions': suggestions,
            'strength': PasswordValidator._get_strength_label(score)
        }
    
    @staticmethod
    def _get_strength_label(score: int) -> str:
        """Get strength label based on score."""
        if score <= 1:
            return "Very Weak"
        elif score == 2:
            return "Weak"
        elif score == 3:
            return "Fair"
        elif score == 4:
            return "Good"
        elif score == 5:
            return "Strong"
        else:
            return "Very Strong"


class EmailValidator:
    """Enhanced email validation."""
    
    @staticmethod
    def validate_email_format(email: str) -> Dict[str, Any]:
        """
        Validate email format with detailed feedback.
        
        Returns:
            dict: {
                'is_valid': bool,
                'error': str or None,
                'normalized_email': str
            }
        """
        try:
            # Basic format validation
            validator = DjangoEmailValidator()
            validator(email)
            
            # Normalize email
            normalized = email.lower().strip()
            
            # Additional checks
            if len(normalized) > 254:
                return {
                    'is_valid': False,
                    'error': 'Email address is too long.',
                    'normalized_email': normalized
                }
                
            # Check for suspicious patterns
            suspicious_patterns = [
                r'\.{2,}',  # Multiple consecutive dots
                r'^\.',     # Starting with dot
                r'\.$',     # Ending with dot
            ]
            
            for pattern in suspicious_patterns:
                if re.search(pattern, normalized):
                    return {
                        'is_valid': False,
                        'error': 'Email format appears to be invalid.',
                        'normalized_email': normalized
                    }
                    
            return {
                'is_valid': True,
                'error': None,
                'normalized_email': normalized
            }
            
        except ValidationError as e:
            return {
                'is_valid': False,
                'error': str(e),
                'normalized_email': email.lower().strip()
            }
    
    @staticmethod
    def validate_email_availability(email: str) -> Dict[str, Any]:
        """
        Check if email is available for registration.
        
        Returns:
            dict: {
                'is_available': bool,
                'error': str or None
            }
        """
        try:
            # Check if email already exists
            if Account.objects.filter(email=email).exists():
                return {
                    'is_available': False,
                    'error': 'An account with this email already exists.'
                }
                
            return {
                'is_available': True,
                'error': None
            }
            
        except Exception as e:
            return {
                'is_available': False,
                'error': 'Unable to verify email availability.'
            }


class NameValidator:
    """Validate names with proper formatting."""
    
    @staticmethod
    def validate_name(name: str, field_name: str = "Name") -> Dict[str, Any]:
        """
        Validate and normalize a name field.
        
        Args:
            name: The name to validate
            field_name: The field name for error messages
            
        Returns:
            dict: {
                'is_valid': bool,
                'error': str or None,
                'normalized_name': str
            }
        """
        if not name or not name.strip():
            return {
                'is_valid': False,
                'error': f'{field_name} is required.',
                'normalized_name': ''
            }
            
        # Normalize: strip whitespace, capitalize
        normalized = ' '.join(word.capitalize() for word in name.strip().split())
        
        # Check length
        if len(normalized) < 2:
            return {
                'is_valid': False,
                'error': f'{field_name} must be at least 2 characters long.',
                'normalized_name': normalized
            }
            
        if len(normalized) > 50:
            return {
                'is_valid': False,
                'error': f'{field_name} must be less than 50 characters.',
                'normalized_name': normalized
            }
            
        # Check for invalid characters (allow letters, spaces, hyphens, apostrophes)
        if not re.match(r"^[a-zA-Z\s\-']+$", normalized):
            return {
                'is_valid': False,
                'error': f'{field_name} can only contain letters, spaces, hyphens, and apostrophes.',
                'normalized_name': normalized
            }
            
        return {
            'is_valid': True,
            'error': None,
            'normalized_name': normalized
        }


class CompanyValidator:
    """Validate company information."""
    
    @staticmethod
    def validate_company_name(company_name: str) -> Dict[str, Any]:
        """
        Validate company name.
        
        Returns:
            dict: {
                'is_valid': bool,
                'error': str or None,
                'normalized_name': str
            }
        """
        if not company_name or not company_name.strip():
            return {
                'is_valid': True,  # Company name is optional
                'error': None,
                'normalized_name': ''
            }
            
        # Normalize
        normalized = company_name.strip()
        
        # Check length
        if len(normalized) > 100:
            return {
                'is_valid': False,
                'error': 'Company name must be less than 100 characters.',
                'normalized_name': normalized
            }
            
        # Allow letters, numbers, spaces, and common business symbols
        if not re.match(r"^[a-zA-Z0-9\s\-&.,()]+$", normalized):
            return {
                'is_valid': False,
                'error': 'Company name contains invalid characters.',
                'normalized_name': normalized
            }
            
        return {
            'is_valid': True,
            'error': None,
            'normalized_name': normalized
        }


class GeneralValidator:
    """General purpose validators."""
    
    @staticmethod
    def validate_required_field(value: Any, field_name: str) -> Dict[str, Any]:
        """
        Validate that a required field has a value.
        
        Returns:
            dict: {
                'is_valid': bool,
                'error': str or None
            }
        """
        if value is None or (isinstance(value, str) and not value.strip()):
            return {
                'is_valid': False,
                'error': f'{field_name} is required.'
            }
            
        return {
            'is_valid': True,
            'error': None
        }
    
    @staticmethod
    def validate_choice_field(value: Any, choices: List[Any], field_name: str) -> Dict[str, Any]:
        """
        Validate that a value is in allowed choices.
        
        Returns:
            dict: {
                'is_valid': bool,
                'error': str or None
            }
        """
        if value not in choices:
            return {
                'is_valid': False,
                'error': f'{field_name} must be one of: {", ".join(map(str, choices))}'
            }
            
        return {
            'is_valid': True,
            'error': None
        }
    
    @staticmethod
    def validate_length(value: str, min_length: int = None, max_length: int = None, 
                       field_name: str = "Field") -> Dict[str, Any]:
        """
        Validate string length.
        
        Returns:
            dict: {
                'is_valid': bool,
                'error': str or None
            }
        """
        if not isinstance(value, str):
            value = str(value)
            
        length = len(value)
        
        if min_length and length < min_length:
            return {
                'is_valid': False,
                'error': f'{field_name} must be at least {min_length} characters long.'
            }
            
        if max_length and length > max_length:
            return {
                'is_valid': False,
                'error': f'{field_name} must be less than {max_length} characters.'
            }
            
        return {
            'is_valid': True,
            'error': None
        }


def validate_registration_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Comprehensive validation for user registration data.
    
    Args:
        data: Dictionary containing registration data
        
    Returns:
        dict: {
            'is_valid': bool,
            'errors': Dict[str, List[str]],
            'normalized_data': Dict[str, Any]
        }
    """
    errors = {}
    normalized_data = {}
    
    # Validate email
    email = data.get('email', '')
    email_validation = EmailValidator.validate_email_format(email)
    if not email_validation['is_valid']:
        errors['email'] = [email_validation['error']]
    else:
        # Check availability
        availability = EmailValidator.validate_email_availability(
            email_validation['normalized_email']
        )
        if not availability['is_available']:
            errors['email'] = [availability['error']]
        else:
            normalized_data['email'] = email_validation['normalized_email']
    
    # Validate password
    password = data.get('password', '')
    password_validation = PasswordValidator.validate_password_strength(password)
    if not password_validation['is_valid']:
        errors['password'] = password_validation['errors']
    else:
        normalized_data['password'] = password
    
    # Validate first name
    first_name = data.get('first_name', '')
    first_name_validation = NameValidator.validate_name(first_name, 'First name')
    if not first_name_validation['is_valid']:
        errors['first_name'] = [first_name_validation['error']]
    else:
        normalized_data['first_name'] = first_name_validation['normalized_name']
    
    # Validate last name
    last_name = data.get('last_name', '')
    last_name_validation = NameValidator.validate_name(last_name, 'Last name')
    if not last_name_validation['is_valid']:
        errors['last_name'] = [last_name_validation['error']]
    else:
        normalized_data['last_name'] = last_name_validation['normalized_name']
    
    # Validate company name (optional)
    company_name = data.get('company_name', '')
    company_validation = CompanyValidator.validate_company_name(company_name)
    if not company_validation['is_valid']:
        errors['company_name'] = [company_validation['error']]
    else:
        normalized_data['company_name'] = company_validation['normalized_name']
    
    return {
        'is_valid': len(errors) == 0,
        'errors': errors,
        'normalized_data': normalized_data
    }
