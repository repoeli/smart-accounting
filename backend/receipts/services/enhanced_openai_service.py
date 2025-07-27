#!/usr/bin/env python3
"""
Enhanced OpenAI Service with Focused Extraction and Cloudinary Integration
==========================================================================
This service provides focused extraction of essential receipt fields:
- Vendor, Total Amount, Tax, Date, Savings/Discounts, Number of Items, Expense/Income
- Seamless Cloudinary integration for image storage and retrieval
- Optimized for Heroku deployment with existing frontend
"""

import asyncio
import base64
import json
import logging
import os
import time
import hashlib
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Optional

from django.conf import settings
from openai import AsyncOpenAI
from PIL import Image, ImageEnhance, ImageFilter

# Cloudinary integration
try:
    import cloudinary
    import cloudinary.uploader
    CLOUDINARY_AVAILABLE = True
    
    # Configure Cloudinary if settings available
    if hasattr(settings, 'CLOUDINARY_STORAGE'):
        cloudinary.config(
            cloud_name=getattr(settings, 'CLOUDINARY_CLOUD_NAME', os.environ.get('CLOUDINARY_CLOUD_NAME')),
            api_key=getattr(settings, 'CLOUDINARY_API_KEY', os.environ.get('CLOUDINARY_API_KEY')),
            api_secret=getattr(settings, 'CLOUDINARY_API_SECRET', os.environ.get('CLOUDINARY_API_SECRET'))
        )
except ImportError:
    CLOUDINARY_AVAILABLE = False

logger = logging.getLogger(__name__)

class EnhancedOpenAIVisionService:
    """Enhanced OpenAI Vision service with focused extraction and Cloudinary integration"""
    
    def __init__(self):
        self.client = AsyncOpenAI(api_key=os.environ.get('OPENAI_API_KEY'))
        self.model = 'gpt-4o'
        logger.info("Enhanced OpenAI Vision service initialized")
    
    async def process_receipt_focused(self, image_file, filename: str = "") -> Dict[str, Any]:
        """
        Process receipt with focused extraction of essential fields
        Returns data in the format expected by existing frontend
        """
        start_time = time.time()
        
        try:
            logger.info(f"Processing receipt with focused extraction: {filename}")
            
            # Step 1: Upload to Cloudinary for storage and optimization
            cloudinary_result = await self._upload_to_cloudinary(image_file, filename)
            
            # Step 2: Enhanced image preprocessing
            enhanced_image_b64 = await self._enhance_image_for_ocr(image_file)
            
            # Step 3: Focused extraction of essential fields
            extracted_data = await self._extract_essential_fields(enhanced_image_b64)
            
            # Step 4: Format for existing frontend compatibility
            result = await self._format_for_frontend(extracted_data, cloudinary_result, start_time)
            
            processing_time = time.time() - start_time
            logger.info(f"Focused extraction completed in {processing_time:.2f}s with confidence {extracted_data.get('confidence_score', 5)}/10")
            
            return result
            
        except Exception as e:
            logger.error(f"Enhanced receipt processing failed: {e}")
            return {
                'vendor_name': 'Unknown',
                'total_amount': 0,
                'transaction_date': None,
                'tax_amount': 0,
                'currency': 'USD',
                'transaction_type': 'expense',
                'processing_metadata': {
                    'processing_time': time.time() - start_time,
                    'error': str(e),
                    'ai_model': self.model
                }
            }
    
    async def _upload_to_cloudinary(self, image_file, filename: str) -> Dict[str, Any]:
        """Upload image to Cloudinary with optimization"""
        
        if not CLOUDINARY_AVAILABLE:
            logger.warning("Cloudinary not available, skipping upload")
            return {}
        
        try:
            # Read image data
            if hasattr(image_file, 'read'):
                image_data = image_file.read()
                image_file.seek(0)  # Reset file pointer
            else:
                with open(image_file, 'rb') as f:
                    image_data = f.read()
            
            # Generate unique public ID
            file_hash = hashlib.md5(image_data).hexdigest()[:16]
            public_id = f"receipts-lite/receipts-lite/{file_hash}_{filename}"
            
            # Upload with optimization
            upload_result = cloudinary.uploader.upload(
                image_data,
                public_id=public_id,
                folder="receipts-lite",
                resource_type="image",
                format="jpg",
                quality="auto:good",
                fetch_format="auto",
                flags="progressive",
                transformation=[
                    {"width": 1200, "height": 1600, "crop": "limit"},
                    {"quality": "auto:good"}
                ],
                overwrite=True
            )
            
            cloudinary_data = {
                'public_id': upload_result.get('public_id'),
                'secure_url': upload_result.get('secure_url'),
                'url': upload_result.get('url'),
                'width': upload_result.get('width'),
                'height': upload_result.get('height'),
                'format': upload_result.get('format'),
                'bytes': upload_result.get('bytes'),
                'version': upload_result.get('version')
            }
            
            logger.info(f"Cloudinary upload successful: {public_id}")
            return cloudinary_data
            
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {e}")
            return {}
    
    async def _enhance_image_for_ocr(self, image_file) -> str:
        """Enhance image for optimal OCR processing"""
        
        try:
            # Load image
            if hasattr(image_file, 'read'):
                image_data = image_file.read()
                image_file.seek(0)
                img = Image.open(BytesIO(image_data))
            else:
                img = Image.open(image_file)
            
            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            # Apply enhancement pipeline for better OCR
            # 1. Sharpen text
            img = img.filter(ImageFilter.SHARPEN)
            
            # 2. Increase contrast significantly
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(1.8)
            
            # 3. Optimize brightness
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(1.15)
            
            # 4. Enhance sharpness further
            enhancer = ImageEnhance.Sharpness(img)
            img = enhancer.enhance(1.3)
            
            # Convert to base64
            buffer = BytesIO()
            img.save(buffer, format='JPEG', quality=98, optimize=True)
            image_b64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            logger.info("Image enhancement completed for OCR")
            return image_b64
            
        except Exception as e:
            logger.error(f"Image enhancement failed: {e}")
            # Fall back to basic encoding
            if hasattr(image_file, 'read'):
                image_data = image_file.read()
                image_file.seek(0)
                return base64.b64encode(image_data).decode('utf-8')
            else:
                with open(image_file, 'rb') as f:
                    return base64.b64encode(f.read()).decode('utf-8')
    
    async def _extract_essential_fields(self, image_b64: str) -> Dict[str, Any]:
        """Extract essential fields with focused prompt"""
        
        # Ultra-focused prompt for essential fields
        focused_prompt = """
        Extract ONLY these essential fields from this receipt with maximum precision:

        1. **VENDOR** - Store/business name (e.g., "Costco Wholesale", "ASDA", "Walmart")
        2. **TOTAL AMOUNT** - Final payment amount (numeric only, no currency symbols)
        3. **TAX** - Tax/VAT amount (numeric only, no currency symbols)
        4. **DATE** - Transaction date (YYYY-MM-DD format)
        5. **SAVINGS/DISCOUNTS** - Any discounts applied (numeric only, 0 if none)
        6. **NUMBER OF ITEMS** - Total items purchased (estimate if not visible)
        7. **TRANSACTION TYPE** - "expense" for purchases, "income" for refunds

        CRITICAL INSTRUCTIONS:
        - Return ONLY numeric values for amounts (no $, £, €, etc.)
        - Use YYYY-MM-DD date format
        - Focus on the LARGEST dollar amounts for totals
        - Look for tax percentages to validate tax amounts
        - If a field cannot be determined, use null

        Return this exact JSON structure:
        {
            "vendor_name": "store name",
            "total_amount": "numeric value only",
            "tax_amount": "numeric value only", 
            "transaction_date": "YYYY-MM-DD or null",
            "discount_amount": "numeric value or 0",
            "number_of_items": "count or null",
            "transaction_type": "expense or income",
            "currency": "USD, GBP, EUR, etc.",
            "confidence_score": "1-10 scale"
        }
        """
        
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precision receipt data extractor. Return only valid JSON with exact fields requested. Be extremely accurate with financial amounts."
                    },
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": focused_prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}}
                        ]
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=400,
                temperature=0.0  # Maximum precision
            )
            
            content = response.choices[0].message.content
            result = json.loads(content)
            
            # Validate and convert data types
            result = self._validate_extracted_data(result)
            
            logger.info(f"Essential fields extracted with confidence {result.get('confidence_score', 5)}/10")
            return result
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parsing error in focused extraction: {e}")
            return self._get_default_extraction()
        except Exception as e:
            logger.error(f"Focused extraction failed: {e}")
            return self._get_default_extraction()
    
    def _validate_extracted_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and convert extracted data to proper types"""
        
        validated = {}
        
        # Vendor name
        validated['vendor_name'] = str(data.get('vendor_name', 'Unknown')).strip() or 'Unknown'
        
        # Total amount
        try:
            total = str(data.get('total_amount', '0')).replace(',', '').replace('$', '').replace('£', '').replace('€', '')
            validated['total_amount'] = round(float(total), 2) if total else 0
        except (ValueError, TypeError):
            validated['total_amount'] = 0
        
        # Tax amount
        try:
            tax = str(data.get('tax_amount', '0')).replace(',', '').replace('$', '').replace('£', '').replace('€', '')
            validated['tax_amount'] = round(float(tax), 2) if tax else 0
        except (ValueError, TypeError):
            validated['tax_amount'] = 0
        
        # Discount amount
        try:
            discount = str(data.get('discount_amount', '0')).replace(',', '').replace('$', '').replace('£', '').replace('€', '')
            validated['discount_amount'] = round(float(discount), 2) if discount else 0
        except (ValueError, TypeError):
            validated['discount_amount'] = 0
        
        # Date
        date_str = data.get('transaction_date')
        if date_str and date_str != 'null' and len(str(date_str)) >= 8:
            validated['transaction_date'] = str(date_str)[:10]  # Ensure YYYY-MM-DD format
        else:
            validated['transaction_date'] = None
        
        # Number of items
        try:
            items = data.get('number_of_items')
            validated['number_of_items'] = int(float(str(items))) if items and items != 'null' else None
        except (ValueError, TypeError):
            validated['number_of_items'] = None
        
        # Transaction type
        trans_type = str(data.get('transaction_type', 'expense')).lower()
        validated['transaction_type'] = 'income' if 'income' in trans_type or 'refund' in trans_type else 'expense'
        
        # Currency
        currency = str(data.get('currency', 'USD')).upper()
        validated['currency'] = currency if currency in ['USD', 'GBP', 'EUR', 'CAD', 'AUD'] else 'USD'
        
        # Confidence score
        try:
            confidence = int(float(str(data.get('confidence_score', 5))))
            validated['confidence_score'] = max(1, min(10, confidence))
        except (ValueError, TypeError):
            validated['confidence_score'] = 5
        
        return validated
    
    def _get_default_extraction(self) -> Dict[str, Any]:
        """Return default extraction structure for failed cases"""
        return {
            'vendor_name': 'Unknown',
            'total_amount': 0,
            'tax_amount': 0,
            'transaction_date': None,
            'discount_amount': 0,
            'number_of_items': None,
            'transaction_type': 'expense',
            'currency': 'USD',
            'confidence_score': 1
        }
    
    async def _format_for_frontend(self, extracted_data: Dict[str, Any], cloudinary_result: Dict[str, Any], start_time: float) -> Dict[str, Any]:
        """Format extracted data for existing frontend compatibility"""
        
        processing_time = time.time() - start_time
        
        # Format in the structure expected by existing frontend
        result = {
            # Core receipt data (compatible with existing models)
            'vendor_name': extracted_data.get('vendor_name', 'Unknown'),
            'transaction_date': extracted_data.get('transaction_date'),
            'total_amount': extracted_data.get('total_amount', 0),
            'tax_amount': extracted_data.get('tax_amount', 0),
            'subtotal_amount': max(0, extracted_data.get('total_amount', 0) - extracted_data.get('tax_amount', 0)),
            'currency': extracted_data.get('currency', 'USD'),
            'transaction_type': extracted_data.get('transaction_type', 'expense'),
            
            # Additional focused extraction fields
            'discount_amount': extracted_data.get('discount_amount', 0),
            'number_of_items': extracted_data.get('number_of_items'),
            
            # Processing metadata (expected by frontend)
            'processing_metadata': {
                'ai_model': self.model,
                'processing_time': round(processing_time, 2),
                'extraction_method': 'focused_essential_fields',
                'confidence_score': extracted_data.get('confidence_score', 5),
                'processing_timestamp': int(time.time()),
                'validation_errors': []
            }
        }
        
        # Add Cloudinary data if available
        if cloudinary_result:
            result['processing_metadata']['cloudinary'] = cloudinary_result
            # Also add at root level for frontend compatibility
            result['cloudinary_url'] = cloudinary_result.get('secure_url')
            result['image_url'] = cloudinary_result.get('secure_url')
        
        return result

# Maintain compatibility with existing service
class OpenAIVisionService(EnhancedOpenAIVisionService):
    """Backward compatible service that uses enhanced focused extraction"""
    
    async def process_receipt(self, image_file, filename: str = "") -> Dict[str, Any]:
        """Process receipt using enhanced focused extraction"""
        return await self.process_receipt_focused(image_file, filename)

# Background processing utilities for queue_ocr_task compatibility
import concurrent.futures
from threading import current_thread

# Thread pool for background processing
_thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=2)

def queue_ocr_task(receipt_id: int) -> dict:
    """Queue OCR processing task for compatibility with existing views"""
    try:
        # Import here to avoid circular imports
        from ..models import Receipt
        
        def _process_receipt_for_id(receipt_id: int):
            """Background processing function"""
            try:
                receipt = Receipt.objects.get(id=receipt_id)
                service = EnhancedOpenAIVisionService()
                
                # Run the enhanced processing
                import asyncio
                result = asyncio.run(service.process_receipt_focused(receipt.file, receipt.original_filename))
                
                # Update receipt with results
                receipt.vendor_name = result.get('vendor_name', 'Unknown')
                receipt.total_amount = result.get('total_amount', 0)
                receipt.transaction_date = result.get('transaction_date')
                receipt.tax_amount = result.get('tax_amount', 0)
                receipt.processing_status = 'completed'
                receipt.save()
                
                logger.info(f"Background OCR completed for receipt {receipt_id}")
                
            except Exception as e:
                logger.error(f"Background OCR failed for receipt {receipt_id}: {e}")
                try:
                    receipt = Receipt.objects.get(id=receipt_id)
                    receipt.processing_status = 'failed'
                    receipt.save()
                except:
                    pass
        
        # Queue the task
        future = _thread_pool.submit(_process_receipt_for_id, receipt_id)
        logger.info(f"Queued enhanced OCR task for receipt {receipt_id}")
        return {"queued": True, "background": True}
        
    except Exception as e:
        logger.error(f"Failed to queue OCR task for receipt {receipt_id}: {e}")
        return {"queued": False, "error": str(e)}

# Utility functions for compatibility
def validate_api_key() -> bool:
    """Validate OpenAI API key"""
    api_key = os.environ.get('OPENAI_API_KEY')
    return bool(api_key and api_key.startswith('sk-'))
