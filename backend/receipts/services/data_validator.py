"""
Data validation and cleansing service for receipt processing.
"""
import re
import logging
from datetime import datetime, date
from decimal import Decimal, InvalidOperation
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class ReceiptDataValidator:
    """Validates and cleanses extracted receipt data."""
    
    def __init__(self):
        self.currency_symbols = {
            '£': 'GBP',
            '$': 'USD',
            '€': 'EUR',
            '¥': 'JPY'
        }
        
        self.category_mapping = {
            'office': 'office_supplies',
            'stationery': 'office_supplies',
            'supplies': 'office_supplies',
            'transport': 'travel',
            'taxi': 'travel',
            'uber': 'travel',
            'train': 'travel',
            'flight': 'travel',
            'hotel': 'travel',
            'fuel': 'travel',
            'petrol': 'travel',
            'restaurant': 'meals',
            'food': 'meals',
            'coffee': 'meals',
            'lunch': 'meals',
            'dinner': 'meals',
            'electricity': 'utilities',
            'gas': 'utilities',
            'water': 'utilities',
            'internet': 'utilities',
            'phone': 'utilities',
            'mobile': 'utilities',
            'software': 'software',
            'subscription': 'software',
            'saas': 'software',
            'license': 'software',
            'computer': 'hardware',
            'laptop': 'hardware',
            'equipment': 'hardware',
            'printer': 'hardware',
            'consulting': 'professional_services',
            'legal': 'professional_services',
            'accounting': 'professional_services',
            'audit': 'professional_services',
            'advertising': 'marketing',
            'marketing': 'marketing',
            'promotion': 'marketing',
            'website': 'marketing',
            'rent': 'rent',
            'lease': 'rent',
            'office space': 'rent'
        }
    
    def validate_and_clean(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate and clean extracted receipt data.
        
        Args:
            raw_data: Raw extracted data from vision API
            
        Returns:
            Dict containing cleaned and validated data
        """
        cleaned_data = {
            'vendor': self._clean_vendor_data(raw_data.get('vendor', {})),
            'transaction': self._clean_transaction_data(raw_data.get('transaction', {})),
            'items': self._clean_items_data(raw_data.get('items', [])),
            'totals': self._clean_totals_data(raw_data.get('totals', {})),
            'payment': self._clean_payment_data(raw_data.get('payment', {})),
            'metadata': self._clean_metadata(raw_data.get('metadata', {})),
            'validation_errors': [],
            'validation_warnings': []
        }
        
        # Validate data consistency
        self._validate_data_consistency(cleaned_data)
        
        return cleaned_data
    
    def _clean_vendor_data(self, vendor_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean vendor information."""
        cleaned = {
            'name': self._clean_text(vendor_data.get('name', '')),
            'address': self._clean_text(vendor_data.get('address', '')),
            'phone': self._clean_phone_number(vendor_data.get('phone', ''))
        }
        
        # Validate vendor name
        if not cleaned['name']:
            cleaned['name'] = 'Unknown Vendor'
        
        return cleaned
    
    def _clean_transaction_data(self, transaction_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean transaction information."""
        cleaned = {
            'date': self._clean_date(transaction_data.get('date')),
            'time': self._clean_time(transaction_data.get('time', '')),
            'receipt_number': self._clean_text(transaction_data.get('receipt_number', ''))
        }
        
        return cleaned
    
    def _clean_items_data(self, items_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Clean items list."""
        cleaned_items = []
        
        for item in items_data:
            if not isinstance(item, dict):
                continue
                
            cleaned_item = {
                'name': self._clean_text(item.get('name', '')),
                'quantity': self._clean_quantity(item.get('quantity', 1)),
                'unit_price': self._clean_decimal(item.get('unit_price', 0)),
                'total_price': self._clean_decimal(item.get('total_price', 0))
            }
            
            # Skip items with no name
            if not cleaned_item['name']:
                continue
            
            # Calculate missing values
            if cleaned_item['total_price'] == 0 and cleaned_item['unit_price'] > 0:
                cleaned_item['total_price'] = cleaned_item['unit_price'] * cleaned_item['quantity']
            elif cleaned_item['unit_price'] == 0 and cleaned_item['total_price'] > 0 and cleaned_item['quantity'] > 0:
                cleaned_item['unit_price'] = cleaned_item['total_price'] / cleaned_item['quantity']
            
            cleaned_items.append(cleaned_item)
        
        return cleaned_items
    
    def _clean_totals_data(self, totals_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean totals information."""
        cleaned = {
            'subtotal': self._clean_decimal(totals_data.get('subtotal', 0)),
            'tax_amount': self._clean_decimal(totals_data.get('tax_amount', 0)),
            'discount': self._clean_decimal(totals_data.get('discount', 0)),
            'total': self._clean_decimal(totals_data.get('total', 0)),
            'currency': self._clean_currency(totals_data.get('currency', 'GBP'))
        }
        
        return cleaned
    
    def _clean_payment_data(self, payment_data: Dict[str, Any]) -> Dict[str, Any]:
        """Clean payment information."""
        cleaned = {
            'method': self._clean_text(payment_data.get('method', 'unknown')).lower(),
            'card_last_four': self._clean_card_number(payment_data.get('card_last_four', ''))
        }
        
        return cleaned
    
    def _clean_metadata(self, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Clean metadata."""
        cleaned = {
            'confidence': self._clean_confidence(metadata.get('confidence', 50)),
            'is_receipt': bool(metadata.get('is_receipt', True)),
            'language': self._clean_text(metadata.get('language', 'en')).lower(),
            'category_suggestion': self._clean_category(metadata.get('category_suggestion', 'other'))
        }
        
        return cleaned
    
    def _clean_text(self, text: Any) -> str:
        """Clean and normalize text."""
        if not text:
            return ''
        
        text = str(text).strip()
        # Remove extra whitespace
        text = re.sub(r'\s+', ' ', text)
        return text
    
    def _clean_phone_number(self, phone: Any) -> str:
        """Clean and normalize phone number."""
        if not phone:
            return ''
        
        phone = str(phone)
        # Remove all non-digit characters
        digits = re.sub(r'[^\d]', '', phone)
        
        # Format UK phone numbers
        if len(digits) == 11 and digits.startswith('0'):
            return f"+44{digits[1:]}"
        elif len(digits) == 10:
            return f"+44{digits}"
        
        return phone.strip()
    
    def _clean_date(self, date_value: Any) -> Optional[str]:
        """Clean and validate date."""
        if not date_value:
            return None
        
        # If already a date object
        if isinstance(date_value, date):
            return date_value.isoformat()
        
        date_str = str(date_value).strip()
        
        # Common date patterns
        patterns = [
            r'(\d{4})-(\d{1,2})-(\d{1,2})',  # YYYY-MM-DD
            r'(\d{1,2})/(\d{1,2})/(\d{4})',  # DD/MM/YYYY or MM/DD/YYYY
            r'(\d{1,2})-(\d{1,2})-(\d{4})',  # DD-MM-YYYY
            r'(\d{1,2})\.(\d{1,2})\.(\d{4})'  # DD.MM.YYYY
        ]
        
        for pattern in patterns:
            match = re.search(pattern, date_str)
            if match:
                try:
                    groups = match.groups()
                    if len(groups) == 3:
                        # Assume DD/MM/YYYY for ambiguous formats
                        if pattern.startswith(r'(\d{4})'):  # YYYY-MM-DD
                            year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                        else:  # DD/MM/YYYY format
                            day, month, year = int(groups[0]), int(groups[1]), int(groups[2])
                        
                        parsed_date = date(year, month, day)
                        return parsed_date.isoformat()
                except ValueError:
                    continue
        
        return None
    
    def _clean_time(self, time_value: Any) -> str:
        """Clean and validate time."""
        if not time_value:
            return ''
        
        time_str = str(time_value).strip()
        
        # Common time patterns
        time_pattern = r'(\d{1,2}):(\d{2})(?::(\d{2}))?'
        match = re.search(time_pattern, time_str)
        
        if match:
            hour, minute = int(match.group(1)), int(match.group(2))
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                return f"{hour:02d}:{minute:02d}"
        
        return time_str
    
    def _clean_quantity(self, quantity: Any) -> int:
        """Clean and validate quantity."""
        if not quantity:
            return 1
        
        try:
            qty = float(quantity)
            return max(1, int(qty))
        except (ValueError, TypeError):
            return 1
    
    def _clean_decimal(self, value: Any) -> Decimal:
        """Clean and validate decimal values."""
        if not value:
            return Decimal('0')
        
        # Convert to string and clean
        value_str = str(value).strip()
        
        # Remove currency symbols and spaces
        for symbol in self.currency_symbols.keys():
            value_str = value_str.replace(symbol, '')
        
        value_str = value_str.replace(' ', '').replace(',', '')
        
        # Extract number
        number_match = re.search(r'[\d.]+', value_str)
        if number_match:
            try:
                return Decimal(number_match.group())
            except InvalidOperation:
                pass
        
        return Decimal('0')
    
    def _clean_currency(self, currency: Any) -> str:
        """Clean and normalize currency."""
        if not currency:
            return 'GBP'
        
        currency_str = str(currency).strip().upper()
        
        # Check for currency symbols
        for symbol, code in self.currency_symbols.items():
            if symbol in currency_str:
                return code
        
        # Common currency codes
        if currency_str in ['GBP', 'USD', 'EUR', 'JPY']:
            return currency_str
        
        return 'GBP'  # Default to GBP for UK receipts
    
    def _clean_card_number(self, card_number: Any) -> str:
        """Clean card number (last 4 digits only)."""
        if not card_number:
            return ''
        
        digits = re.sub(r'[^\d]', '', str(card_number))
        if len(digits) >= 4:
            return digits[-4:]
        
        return ''
    
    def _clean_confidence(self, confidence: Any) -> int:
        """Clean confidence score."""
        try:
            conf = float(confidence)
            return max(0, min(100, int(conf)))
        except (ValueError, TypeError):
            return 50
    
    def _clean_category(self, category: Any) -> str:
        """Clean and map category."""
        if not category:
            return 'other'
        
        category_str = str(category).strip().lower()
        
        # Direct match
        valid_categories = [
            'office_supplies', 'travel', 'meals', 'utilities', 'rent',
            'software', 'hardware', 'professional_services', 'marketing', 'other'
        ]
        
        if category_str in valid_categories:
            return category_str
        
        # Fuzzy matching
        for keyword, mapped_category in self.category_mapping.items():
            if keyword in category_str:
                return mapped_category
        
        return 'other'
    
    def _validate_data_consistency(self, cleaned_data: Dict[str, Any]):
        """Validate data consistency and add warnings/errors."""
        errors = cleaned_data['validation_errors']
        warnings = cleaned_data['validation_warnings']
        
        # Validate totals consistency
        totals = cleaned_data['totals']
        items = cleaned_data['items']
        
        if items:
            calculated_subtotal = sum(item['total_price'] for item in items)
            
            if totals['subtotal'] > 0:
                difference = abs(calculated_subtotal - totals['subtotal'])
                if difference > Decimal('0.01'):
                    warnings.append(f"Item total ({calculated_subtotal}) doesn't match subtotal ({totals['subtotal']})")
            
            if totals['total'] > 0:
                expected_total = totals['subtotal'] + totals['tax_amount'] - totals['discount']
                difference = abs(expected_total - totals['total'])
                if difference > Decimal('0.01'):
                    warnings.append(f"Calculated total ({expected_total}) doesn't match stated total ({totals['total']})")
        
        # Validate date
        if not cleaned_data['transaction']['date']:
            warnings.append("No transaction date found")
        
        # Validate vendor
        if not cleaned_data['vendor']['name'] or cleaned_data['vendor']['name'] == 'Unknown Vendor':
            warnings.append("Vendor name not found or unclear")
        
        # Validate confidence
        if cleaned_data['metadata']['confidence'] < 70:
            warnings.append(f"Low confidence score: {cleaned_data['metadata']['confidence']}%")
        
        # Validate amounts
        if totals['total'] <= 0:
            errors.append("Invalid or missing total amount")
        
        if totals['tax_amount'] < 0:
            errors.append("Negative tax amount")
    
    def calculate_confidence_score(self, cleaned_data: Dict[str, Any]) -> int:
        """Calculate overall confidence score based on data quality."""
        base_confidence = cleaned_data['metadata']['confidence']
        
        # Adjust based on data quality
        adjustments = 0
        
        # Vendor information
        if cleaned_data['vendor']['name'] and cleaned_data['vendor']['name'] != 'Unknown Vendor':
            adjustments += 5
        if cleaned_data['vendor']['address']:
            adjustments += 3
        
        # Transaction information
        if cleaned_data['transaction']['date']:
            adjustments += 10
        if cleaned_data['transaction']['receipt_number']:
            adjustments += 3
        
        # Financial data
        if cleaned_data['totals']['total'] > 0:
            adjustments += 10
        if cleaned_data['items']:
            adjustments += 5
        
        # Consistency
        if not cleaned_data['validation_errors']:
            adjustments += 10
        else:
            adjustments -= len(cleaned_data['validation_errors']) * 5
        
        if len(cleaned_data['validation_warnings']) < 2:
            adjustments += 5
        
        final_confidence = max(0, min(100, base_confidence + adjustments))
        return final_confidence
