"""
Utilities for receipt processing and JSON serialization.
"""
import json
from decimal import Decimal
from datetime import datetime, date


class DecimalEncoder(json.JSONEncoder):
    """
    JSON encoder that converts Decimal objects to float for proper serialization.
    Prevents "Object of type Decimal is not JSON serializable" errors.
    """
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        elif isinstance(obj, (datetime, date)):
            return obj.isoformat()
        return super().default(obj)


def safe_decimal_to_float(value, default=0.0):
    """
    Safely convert Decimal or numeric value to float.
    """
    if value is None:
        return default
    try:
        if isinstance(value, Decimal):
            return float(value)
        return float(value)
    except (TypeError, ValueError):
        return default


def normalize_extracted_data(data):
    """
    Normalize extracted data to ensure all numeric fields are float.
    Used for new schema consistency.
    """
    if not isinstance(data, dict):
        return data
    
    # Create a copy to avoid modifying original
    normalized = data.copy()
    
    # Convert known numeric fields
    numeric_fields = ['total', 'tax', 'subtotal', 'discount']
    for field in numeric_fields:
        if field in normalized:
            normalized[field] = safe_decimal_to_float(normalized[field])
    
    # Ensure required fields have defaults for new schema
    normalized.setdefault('vendor', 'Unknown Vendor')
    normalized.setdefault('date', None)
    normalized.setdefault('total', 0)
    normalized.setdefault('tax', None)
    normalized.setdefault('type', 'expense')
    normalized.setdefault('currency', 'GBP')
    
    return normalized


def validate_new_schema(extracted_data):
    """
    Validate that extracted data follows the new flat schema structure.
    
    Expected structure:
    {
        "vendor": "string",
        "date": "YYYY-MM-DD",
        "total": float,
        "tax": float or null,
        "type": "expense" or "income",
        "currency": "string"
    }
    """
    if not isinstance(extracted_data, dict):
        return False, "Extracted data must be a dictionary"
    
    required_fields = ['vendor', 'date', 'total', 'type']
    missing_fields = [field for field in required_fields if field not in extracted_data]
    
    if missing_fields:
        return False, f"Missing required fields: {', '.join(missing_fields)}"
    
    # Validate data types
    validations = [
        (isinstance(extracted_data['vendor'], str), "vendor must be a string"),
        (isinstance(extracted_data['total'], (int, float, Decimal)), "total must be numeric"),
        (extracted_data['type'] in ['expense', 'income'], "type must be 'expense' or 'income'"),
    ]
    
    for is_valid, error_msg in validations:
        if not is_valid:
            return False, error_msg
    
    return True, "Schema is valid"


def normalize_processing_metadata(metadata):
    """
    Normalize processing_metadata to ensure consistent format.
    Handles fallback information and performance metrics.
    """
    if not isinstance(metadata, dict):
        return metadata
    
    normalized = metadata.copy()
    
    # Convert Decimal cost to float
    if 'cost_usd' in normalized:
        normalized['cost_usd'] = safe_decimal_to_float(normalized['cost_usd'])
    
    # Ensure performance fields are present
    normalized.setdefault('processing_time', 0)
    normalized.setdefault('cost_usd', 0)
    normalized.setdefault('token_usage', 0)
    normalized.setdefault('segments_processed', 1)
    
    # Preserve fallback information for UI display
    if 'router_metadata' in normalized:
        router_meta = normalized['router_metadata']
        normalized.setdefault('fallback_used', router_meta.get('fallback_used', False))
        normalized.setdefault('failed_apis', router_meta.get('failed_apis', []))
        normalized.setdefault('primary_api_used', router_meta.get('primary_api_used', 'openai'))
    
    return normalized
