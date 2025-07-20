import os
import json
from decimal import Decimal
from datetime import datetime
from celery import shared_task
from django.conf import settings
from django.utils import timezone
import pytesseract
from PIL import Image
import pdf2image
import re

from .models import Receipt, Transaction


@shared_task(bind=True, max_retries=3)
def process_document_ocr(self, receipt_id):
    """
    Process a document with OCR using Tesseract and extract data for transaction creation.
    This is the Celery task that performs background OCR processing.
    """
    try:
        # Get the receipt object
        receipt = Receipt.objects.get(id=receipt_id)
        
        # Update status to processing
        receipt.ocr_status = Receipt.PROCESSING
        receipt.save()
        
        # Perform OCR extraction
        ocr_text = extract_text_from_file(receipt.file.path)
        
        # Extract structured data from OCR text
        extracted_data = extract_transaction_data(ocr_text)
        
        # Update receipt with OCR results
        receipt.ocr_text = ocr_text
        receipt.extracted_data = extracted_data
        receipt.ocr_status = Receipt.COMPLETED
        receipt.save()
        
        # Create transaction from extracted data
        create_transaction_from_extracted_data(receipt, extracted_data)
        
        return f"Successfully processed document {receipt_id}"
        
    except Receipt.DoesNotExist:
        return f"Receipt {receipt_id} not found"
    except Exception as exc:
        # Update receipt status to failed
        try:
            receipt = Receipt.objects.get(id=receipt_id)
            receipt.ocr_status = Receipt.FAILED
            receipt.save()
        except Receipt.DoesNotExist:
            pass
            
        # Retry the task if we have retries left
        if self.request.retries < self.max_retries:
            raise self.retry(countdown=60, exc=exc)
        
        return f"Failed to process document {receipt_id}: {str(exc)}"


def extract_text_from_file(file_path):
    """
    Extract text from various file formats using Tesseract OCR.
    Supports JPEG, PNG, PDF, and HEIC files.
    """
    file_ext = os.path.splitext(file_path)[1].lower()
    
    if file_ext == '.pdf':
        # Convert PDF to images and process each page
        pages = pdf2image.convert_from_path(file_path)
        ocr_text = ""
        for page in pages:
            page_text = pytesseract.image_to_string(page)
            ocr_text += page_text + "\n\n"
        return ocr_text.strip()
    
    elif file_ext in ['.jpg', '.jpeg', '.png', '.heic']:
        # Process image files directly
        image = Image.open(file_path)
        return pytesseract.image_to_string(image)
    
    else:
        raise ValueError(f"Unsupported file format: {file_ext}")


def extract_transaction_data(ocr_text):
    """
    Extract structured transaction data from OCR text.
    This is a simple implementation that looks for common patterns.
    """
    extracted_data = {
        'vendor_name': '',
        'transaction_date': None,
        'total_amount': None,
        'vat_amount': None,
        'line_items': [],
        'confidence': 0.7  # Default confidence for Tesseract
    }
    
    # Extract vendor name (usually at the top)
    lines = ocr_text.split('\n')
    for line in lines[:5]:  # Check first 5 lines
        line = line.strip()
        if len(line) > 3 and not re.search(r'\d', line):  # Line without numbers, likely vendor name
            extracted_data['vendor_name'] = line
            break
    
    # Extract total amount
    amount_patterns = [
        r'(?:total|amount|sum)[\s:]*£?(\d+\.?\d*)',
        r'£(\d+\.?\d*)',
        r'(\d+\.\d{2})\s*(?:gbp|pounds?)?'
    ]
    
    for pattern in amount_patterns:
        match = re.search(pattern, ocr_text, re.IGNORECASE)
        if match:
            try:
                extracted_data['total_amount'] = float(match.group(1))
                break
            except (ValueError, IndexError):
                continue
    
    # Extract VAT amount
    vat_patterns = [
        r'(?:vat|tax)[\s:]*£?(\d+\.?\d*)',
        r'(\d+\.\d{2})\s*vat'
    ]
    
    for pattern in vat_patterns:
        match = re.search(pattern, ocr_text, re.IGNORECASE)
        if match:
            try:
                extracted_data['vat_amount'] = float(match.group(1))
                break
            except (ValueError, IndexError):
                continue
    
    # Extract date
    date_patterns = [
        r'(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})',
        r'(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{2,4})'
    ]
    
    for pattern in date_patterns:
        match = re.search(pattern, ocr_text, re.IGNORECASE)
        if match:
            date_str = match.group(1)
            try:
                # Try to parse the date
                if '/' in date_str or '-' in date_str:
                    # Handle DD/MM/YYYY or DD-MM-YYYY format
                    parts = re.split('[/-]', date_str)
                    if len(parts) == 3:
                        day, month, year = parts
                        if len(year) == 2:
                            year = '20' + year
                        extracted_data['transaction_date'] = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                        break
            except (ValueError, IndexError):
                continue
    
    return extracted_data


def create_transaction_from_extracted_data(receipt, extracted_data):
    """
    Create a Transaction record from the extracted OCR data.
    """
    try:
        # Prepare transaction data
        transaction_data = {
            'receipt': receipt,
            'owner': receipt.owner,
            'vendor_name': extracted_data.get('vendor_name', ''),
            'total_amount': Decimal(str(extracted_data.get('total_amount', 0))),
            'currency': 'GBP',  # Default to GBP for UK
            'vat_amount': Decimal(str(extracted_data.get('vat_amount', 0))),
            'transaction_date': timezone.now().date(),  # Default to today if not extracted
            'category': Transaction.OTHER,  # Default category
            'is_tax_deductible': True,  # Default to tax deductible
        }
        
        # Parse transaction date if available
        if extracted_data.get('transaction_date'):
            try:
                transaction_data['transaction_date'] = datetime.strptime(
                    extracted_data['transaction_date'], '%Y-%m-%d'
                ).date()
            except ValueError:
                pass  # Keep default date
        
        # Create or update the transaction
        Transaction.objects.update_or_create(
            receipt=receipt,
            defaults=transaction_data
        )
        
        return True
        
    except Exception as e:
        print(f"Error creating transaction from extracted data: {str(e)}")
        return False