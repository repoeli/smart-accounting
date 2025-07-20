"""
Utility functions for the Smart Accounting application.
"""
import re
import hashlib
import secrets
import string
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union
from django.conf import settings
from django.utils import timezone
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def generate_secure_token(length: int = 32) -> str:
    """
    Generate a cryptographically secure random token.
    
    Args:
        length: Length of the token to generate
        
    Returns:
        str: Secure random token
    """
    alphabet = string.ascii_letters + string.digits
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def generate_verification_code(length: int = 6) -> str:
    """
    Generate a numeric verification code.
    
    Args:
        length: Length of the code to generate
        
    Returns:
        str: Numeric verification code
    """
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def hash_string(value: str, salt: str = None) -> str:
    """
    Hash a string using SHA-256.
    
    Args:
        value: String to hash
        salt: Optional salt to add
        
    Returns:
        str: Hexadecimal hash
    """
    if salt:
        value = f"{salt}{value}"
    return hashlib.sha256(value.encode()).hexdigest()


def is_valid_uuid(uuid_string: str) -> bool:
    """
    Check if a string is a valid UUID.
    
    Args:
        uuid_string: String to validate
        
    Returns:
        bool: True if valid UUID
    """
    import uuid
    try:
        uuid.UUID(uuid_string)
        return True
    except (ValueError, AttributeError):
        return False


def sanitize_filename(filename: str) -> str:
    """
    Sanitize a filename to remove potentially dangerous characters.
    
    Args:
        filename: Original filename
        
    Returns:
        str: Sanitized filename
    """
    # Remove or replace problematic characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    
    # Remove control characters
    filename = ''.join(char for char in filename if ord(char) >= 32)
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        max_name_length = 255 - len(ext) - 1 if ext else 255
        filename = f"{name[:max_name_length]}.{ext}" if ext else name[:255]
    
    return filename


def format_phone_number(phone: str, country_code: str = '+1') -> str:
    """
    Format a phone number consistently.
    
    Args:
        phone: Phone number to format
        country_code: Country code to prepend
        
    Returns:
        str: Formatted phone number
    """
    # Remove all non-digit characters
    digits = re.sub(r'\D', '', phone)
    
    # Add country code if not present
    if not digits.startswith('1') and country_code == '+1':
        digits = f"1{digits}"
    
    # Format as +1 (XXX) XXX-XXXX
    if len(digits) == 11 and digits.startswith('1'):
        return f"+{digits[0]} ({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
    elif len(digits) == 10:
        return f"+1 ({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    
    return phone  # Return original if can't format


def truncate_string(text: str, max_length: int, suffix: str = '...') -> str:
    """
    Truncate a string to a maximum length with suffix.
    
    Args:
        text: Text to truncate
        max_length: Maximum length including suffix
        suffix: Suffix to add if truncated
        
    Returns:
        str: Truncated string
    """
    if len(text) <= max_length:
        return text
    
    return text[:max_length - len(suffix)] + suffix


def calculate_age(birth_date: datetime) -> int:
    """
    Calculate age from birth date.
    
    Args:
        birth_date: Date of birth
        
    Returns:
        int: Age in years
    """
    today = timezone.now().date()
    birth_date = birth_date.date() if hasattr(birth_date, 'date') else birth_date
    
    age = today.year - birth_date.year
    
    # Adjust if birthday hasn't occurred this year
    if today < birth_date.replace(year=today.year):
        age -= 1
    
    return age


def mask_sensitive_data(data: str, mask_char: str = '*', visible_chars: int = 4) -> str:
    """
    Mask sensitive data showing only last few characters.
    
    Args:
        data: Data to mask
        mask_char: Character to use for masking
        visible_chars: Number of characters to show at the end
        
    Returns:
        str: Masked data
    """
    if len(data) <= visible_chars:
        return mask_char * len(data)
    
    mask_length = len(data) - visible_chars
    return mask_char * mask_length + data[-visible_chars:]


def format_currency(amount: Union[int, float], currency: str = 'USD', 
                   decimal_places: int = 2) -> str:
    """
    Format currency amount for display.
    
    Args:
        amount: Amount to format
        currency: Currency code
        decimal_places: Number of decimal places
        
    Returns:
        str: Formatted currency string
    """
    currency_symbols = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'JPY': '¥',
        'CAD': 'C$',
        'AUD': 'A$',
    }
    
    symbol = currency_symbols.get(currency, currency)
    
    if currency == 'JPY':
        # Japanese Yen doesn't use decimal places
        return f"{symbol}{amount:,.0f}"
    
    return f"{symbol}{amount:,.{decimal_places}f}"


def get_client_ip(request) -> str:
    """
    Get the client's IP address from request.
    
    Args:
        request: Django request object
        
    Returns:
        str: Client IP address
    """
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def is_ajax_request(request) -> bool:
    """
    Check if request is an AJAX request.
    
    Args:
        request: Django request object
        
    Returns:
        bool: True if AJAX request
    """
    return request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest'


def get_user_agent_info(request) -> Dict[str, str]:
    """
    Extract user agent information from request.
    
    Args:
        request: Django request object
        
    Returns:
        dict: User agent information
    """
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    
    # Basic browser detection
    browser = 'Unknown'
    if 'Chrome' in user_agent:
        browser = 'Chrome'
    elif 'Firefox' in user_agent:
        browser = 'Firefox'
    elif 'Safari' in user_agent:
        browser = 'Safari'
    elif 'Edge' in user_agent:
        browser = 'Edge'
    elif 'Opera' in user_agent:
        browser = 'Opera'
    
    # Basic OS detection
    os_info = 'Unknown'
    if 'Windows' in user_agent:
        os_info = 'Windows'
    elif 'Mac' in user_agent:
        os_info = 'macOS'
    elif 'Linux' in user_agent:
        os_info = 'Linux'
    elif 'Android' in user_agent:
        os_info = 'Android'
    elif 'iOS' in user_agent:
        os_info = 'iOS'
    
    return {
        'browser': browser,
        'os': os_info,
        'user_agent': user_agent
    }


def send_templated_email(subject: str, template_name: str, context: Dict[str, Any],
                        to_emails: List[str], from_email: str = None) -> bool:
    """
    Send an email using HTML template with text fallback.
    
    Args:
        subject: Email subject
        template_name: Template name (without .html extension)
        context: Template context
        to_emails: List of recipient emails
        from_email: Sender email (uses DEFAULT_FROM_EMAIL if None)
        
    Returns:
        bool: True if email sent successfully
    """
    try:
        if not from_email:
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@example.com')
        
        # Render HTML content
        html_content = render_to_string(f'emails/{template_name}.html', context)
        
        # Generate text content by stripping HTML
        text_content = strip_tags(html_content)
        
        # Create email message
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=from_email,
            to=to_emails
        )
        
        # Attach HTML version
        email.attach_alternative(html_content, "text/html")
        
        # Send email
        email.send()
        return True
        
    except Exception as e:
        # Log the error (you might want to use proper logging here)
        print(f"Failed to send email: {str(e)}")
        return False


def parse_date_range(date_string: str) -> tuple:
    """
    Parse a date range string into start and end dates.
    
    Args:
        date_string: Date range string (e.g., "2023-01-01,2023-12-31")
        
    Returns:
        tuple: (start_date, end_date) or (None, None) if invalid
    """
    try:
        if ',' in date_string:
            start_str, end_str = date_string.split(',', 1)
            start_date = datetime.strptime(start_str.strip(), '%Y-%m-%d').date()
            end_date = datetime.strptime(end_str.strip(), '%Y-%m-%d').date()
            return start_date, end_date
        else:
            # Single date - return same date for start and end
            date = datetime.strptime(date_string.strip(), '%Y-%m-%d').date()
            return date, date
    except ValueError:
        return None, None


def generate_username_from_email(email: str) -> str:
    """
    Generate a username from an email address.
    
    Args:
        email: Email address
        
    Returns:
        str: Generated username
    """
    # Get the part before @
    username = email.split('@')[0]
    
    # Remove non-alphanumeric characters except underscores
    username = re.sub(r'[^\w]', '', username)
    
    # Ensure it's not empty
    if not username:
        username = 'user'
    
    # Truncate if too long
    if len(username) > 30:
        username = username[:30]
    
    return username.lower()


def time_ago(date_time: datetime) -> str:
    """
    Get a human-readable time difference string.
    
    Args:
        date_time: Datetime to compare with now
        
    Returns:
        str: Human-readable time difference
    """
    if not isinstance(date_time, datetime):
        return "Unknown"
    
    now = timezone.now()
    if date_time.tzinfo is None:
        date_time = timezone.make_aware(date_time)
    
    diff = now - date_time
    
    if diff.days > 365:
        years = diff.days // 365
        return f"{years} year{'s' if years != 1 else ''} ago"
    elif diff.days > 30:
        months = diff.days // 30
        return f"{months} month{'s' if months != 1 else ''} ago"
    elif diff.days > 0:
        return f"{diff.days} day{'s' if diff.days != 1 else ''} ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    else:
        return "Just now"


class Pagination:
    """Utility class for pagination calculations."""
    
    @staticmethod
    def get_page_info(page: int, per_page: int, total_count: int) -> Dict[str, Any]:
        """
        Calculate pagination information.
        
        Args:
            page: Current page number (1-based)
            per_page: Items per page
            total_count: Total number of items
            
        Returns:
            dict: Pagination information
        """
        total_pages = (total_count + per_page - 1) // per_page
        has_next = page < total_pages
        has_previous = page > 1
        start_index = (page - 1) * per_page
        end_index = min(start_index + per_page, total_count)
        
        return {
            'page': page,
            'per_page': per_page,
            'total_count': total_count,
            'total_pages': total_pages,
            'has_next': has_next,
            'has_previous': has_previous,
            'start_index': start_index,
            'end_index': end_index,
            'showing_count': end_index - start_index
        }
