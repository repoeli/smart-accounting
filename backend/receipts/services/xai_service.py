"""
XAI Grok Vision service for receipt processing.
"""
import base64
import logging
import time
import json
from decimal import Decimal
from typing import Dict, Any, Optional
from PIL import Image
import io
import httpx

from django.conf import settings

logger = logging.getLogger(__name__)


class XAIGrokService:
    """XAI Grok Vision service for processing receipt images."""
    
    def __init__(self):
        self.api_key = settings.XAI_API_KEY
        self.base_url = "https://api.x.ai/v1"
        self.model = "grok-2-vision-1212"  # Use the latest vision model
        
        # Cost tracking (approximate costs as of Dec 2024)
        self.input_cost_per_1k_tokens = 0.002   # $0.002 per 1K input tokens
        self.output_cost_per_1k_tokens = 0.008  # $0.008 per 1K output tokens
        
    def _encode_image(self, image_file) -> str:
        """Encode image file to base64 string."""
        try:
            # Reset file pointer to beginning
            image_file.seek(0)
            image_data = image_file.read()
            return base64.b64encode(image_data).decode('utf-8')
        except Exception as e:
            logger.error(f"Error encoding image: {str(e)}")
            raise
    
    def _preprocess_image(self, image_file) -> str:
        """Preprocess image to optimize for vision API."""
        try:
            image_file.seek(0)
            image = Image.open(image_file)
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize if too large (max 2048x2048 for optimal performance)
            max_size = 2048
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = tuple(int(dim * ratio) for dim in image.size)
                image = image.resize(new_size, Image.Resampling.LANCZOS)
            
            # Save processed image to bytes
            output = io.BytesIO()
            image.save(output, format='JPEG', quality=85, optimize=True)
            output.seek(0)
            
            return base64.b64encode(output.read()).decode('utf-8')
        except Exception as e:
            logger.error(f"Error preprocessing image: {str(e)}")
            # Fall back to original encoding
            return self._encode_image(image_file)
    
    def _calculate_cost(self, usage: Dict[str, Any]) -> Decimal:
        """Calculate approximate cost based on token usage."""
        try:
            input_tokens = usage.get('prompt_tokens', 0)
            output_tokens = usage.get('completion_tokens', 0)
            
            input_cost = (input_tokens / 1000) * self.input_cost_per_1k_tokens
            output_cost = (output_tokens / 1000) * self.output_cost_per_1k_tokens
            
            total_cost = input_cost + output_cost
            return Decimal(str(round(total_cost, 6)))
        except Exception as e:
            logger.error(f"Error calculating cost: {str(e)}")
            return Decimal('0.001')  # Default minimal cost
    
    def _get_receipt_extraction_prompt(self) -> str:
        """Get the optimized prompt for fast receipt data extraction."""
        return """Extract receipt data as JSON. Be precise and fast:

{
  "vendor": {"name": "store name", "address": "address", "phone": "phone"},
  "transaction": {"date": "YYYY-MM-DD", "time": "HH:MM", "receipt_number": "number"},
  "items": [{"name": "item", "quantity": 1, "unit_price": 0.00, "total_price": 0.00}],
  "totals": {"subtotal": 0.00, "tax_amount": 0.00, "total": 0.00, "currency": "GBP"},
  "payment": {"method": "card/cash", "card_last_four": "1234"},
  "metadata": {"confidence": 95, "is_receipt": true, "category_suggestion": "office_supplies"}
}

Categories: office_supplies, travel, meals, utilities, rent, software, hardware, professional_services, marketing, other
Currency: Use GBP for UK receipts, USD for US receipts
Return only valid JSON, no extra text."""
    
    async def process_receipt(self, image_file, filename: str = "") -> Dict[str, Any]:
        """
        Process receipt image using XAI Grok Vision.
        
        Args:
            image_file: File object containing the receipt image
            filename: Original filename for context
            
        Returns:
            Dict containing extracted data and metadata
        """
        start_time = time.time()
        
        try:
            logger.info(f"Starting XAI Grok vision processing for {filename}")
            
            # Preprocess and encode image
            base64_image = self._preprocess_image(image_file)
            
            # Prepare the request payload (OpenAI-compatible format)
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": self._get_receipt_extraction_prompt()
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                "max_tokens": 1500,  # Reduced for faster processing
                "temperature": 0,    # Zero temperature for deterministic output
                "seed": 12345       # Consistent seed for reproducible results
            }
            
            # Make API call with optimized timeout
            async with httpx.AsyncClient(timeout=30.0) as client:  # 30 second timeout
                response = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json=payload
                )
                
                response.raise_for_status()
                response_data = response.json()
            
            # Extract response data
            content = response_data['choices'][0]['message']['content'].strip()
            
            # Parse JSON response
            try:
                # Remove any markdown formatting
                if content.startswith('```json'):
                    content = content[7:]
                if content.endswith('```'):
                    content = content[:-3]
                
                content = content.strip()
                
                # Check if response is truncated (common with tall receipts)
                if not content.endswith('}') and not content.endswith(']'):
                    logger.warning(f"XAI response appears truncated: {len(content)} chars")
                    # Try to fix incomplete JSON by adding closing braces
                    brace_count = content.count('{') - content.count('}')
                    bracket_count = content.count('[') - content.count(']')
                    
                    if brace_count > 0:
                        content += '}' * brace_count
                    if bracket_count > 0:
                        content += ']' * bracket_count
                        
                    logger.info(f"Attempted to fix truncated JSON")
                
                extracted_data = json.loads(content)
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse XAI Grok JSON response: {str(e)}")
                logger.error(f"Raw response:\n{content}")
                
                # For tall receipts, try to extract partial data
                if len(content) > 1000:  # Likely a tall receipt
                    logger.info("Attempting partial extraction for tall receipt")
                    try:
                        # Try to parse what we have and build a valid structure
                        import re
                        
                        # Extract vendor name
                        vendor_name = "Unknown Store"
                        vendor_match = re.search(r'"name":\s*"([^"]+)"', content)
                        if vendor_match:
                            vendor_name = vendor_match.group(1)
                        
                        # Count items extracted
                        item_count = content.count('"name":') - 1  # Subtract vendor name
                        
                        # Calculate approximate total from visible items
                        total_prices = re.findall(r'"total_price":\s*([\d.]+)', content)
                        approx_total = sum(float(price) for price in total_prices)
                        
                        extracted_data = {
                            "vendor": {
                                "name": vendor_name,
                                "address": "",
                                "phone": ""
                            },
                            "transaction": {
                                "date": "",
                                "time": "",
                                "receipt_number": ""
                            },
                            "items": [],  # We'll add a summary item
                            "totals": {
                                "subtotal": approx_total,
                                "tax": 0.0,
                                "total": approx_total,
                                "currency": "USD"
                            },
                            "metadata": {
                                "confidence": 60,
                                "is_receipt": True,
                                "processing_note": f"Large receipt - partial extraction: {item_count} items detected, ${approx_total:.2f} estimated total"
                            }
                        }
                        
                        # Add a summary item
                        if item_count > 0:
                            extracted_data["items"] = [
                                {
                                    "name": f"Multiple Items ({item_count} items detected)",
                                    "quantity": item_count,
                                    "unit_price": approx_total / item_count if item_count > 0 else 0,
                                    "total_price": approx_total
                                }
                            ]
                        
                        logger.info(f"Partial extraction successful: {vendor_name}, {item_count} items, ${approx_total:.2f}")
                        
                    except Exception as partial_error:
                        logger.error(f"Partial extraction also failed: {str(partial_error)}")
                        extracted_data = {
                            "vendor": {"name": "Large Receipt - Processing Failed", "address": "", "phone": ""},
                            "transaction": {"date": "", "time": "", "receipt_number": ""},
                            "items": [{"name": "Large receipt - partial processing failed", "quantity": 1, "total_price": 0.0}],
                            "totals": {"subtotal": 0.0, "tax": 0.0, "total": 0.0, "currency": "USD"},
                            "metadata": {
                                "confidence": 20,
                                "is_receipt": True,
                                "processing_note": "Large receipt - extraction failed but receipt detected"
                            }
                        }
                else:
                    # Return structured error response for non-tall receipts
                    extracted_data = {
                        "error": "Failed to parse response",
                        "raw_response": content,
                        "metadata": {
                            "confidence": 0,
                            "is_receipt": False
                        }
                    }
            
            # Calculate processing time and cost
            processing_time = time.time() - start_time
            usage = response_data.get('usage', {})
            cost = self._calculate_cost(usage)
            
            # Add processing metadata
            extracted_data['processing_metadata'] = {
                'api_used': 'xai_grok',
                'model': self.model,
                'processing_time': processing_time,
                'cost_usd': float(cost),
                'token_usage': usage,
                'filename': filename
            }
            
            logger.info(f"XAI Grok processing completed in {processing_time:.2f}s, cost: ${cost}")
            return extracted_data
            
        except httpx.HTTPError as e:
            processing_time = time.time() - start_time
            logger.error(f"XAI Grok HTTP error: {str(e)}")
            
            return {
                'error': f"HTTP error: {str(e)}",
                'processing_metadata': {
                    'api_used': 'xai_grok',
                    'model': self.model,
                    'processing_time': processing_time,
                    'cost_usd': 0,
                    'filename': filename,
                    'failed': True
                }
            }
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"XAI Grok vision processing failed: {str(e)}")
            
            return {
                'error': str(e),
                'processing_metadata': {
                    'api_used': 'xai_grok',
                    'model': self.model,
                    'processing_time': processing_time,
                    'cost_usd': 0,
                    'filename': filename,
                    'failed': True
                }
            }
    
    async def validate_api_key(self) -> bool:
        """Validate XAI API key."""
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                response = await client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
        except Exception as e:
            logger.error(f"XAI API key validation failed: {str(e)}")
            return False
