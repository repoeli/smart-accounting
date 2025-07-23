#!/usr/bin/env python3
"""
openai_service.py – v0.7 British-optimized for Smart Accounting
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
Production-ready enhancement with proper £ currency handling,
Heroku-optimized resource usage, and UK-specific improvements.

Key British-specific changes:
- All costs in £ (GBP) instead of $ 
- UK retailer database expanded
- British receipt format heuristics
- Heroku dyno-optimized thread pools
- Enhanced error handling for production
"""
from __future__ import annotations

import asyncio
import base64
import concurrent.futures
import json
import logging
import os
import statistics
import time
from decimal import Decimal
from io import BytesIO
from pathlib import Path
from typing import Any, Dict, List, Tuple, Union

import httpx
from django.conf import settings
from openai import AsyncOpenAI, OpenAI
from PIL import Image, ImageStat
from tenacity import retry, stop_after_attempt, wait_random_exponential

from .receipt_parser import encode_image

logger = logging.getLogger(__name__)

__all__ = [
    "OpenAIVisionService",
    "validate_api_key", 
    "get_metrics",
    "reset_metrics",
]

# ---------------------------------------------------------------------------
# British-specific configuration
# ---------------------------------------------------------------------------
MODEL_NAME_DEFAULT = os.getenv("OPENAI_VISION_MODEL", "gpt-4o")
FT_MODEL_ID = os.getenv("OPENAI_RECEIPT_FT_MODEL")
VENDOR_DETECT_MODEL = os.getenv("OPENAI_VENDOR_MODEL", "gpt-4o-mini")

# British pricing (converted from USD at current rates ~1.27)
COST_PER_1K_INPUT_GBP = Decimal("0.00197")  # ~£0.002 per 1k tokens
COST_PER_1K_OUTPUT_GBP = Decimal("0.00787")  # ~£0.008 per 1k tokens
VENDOR_DETECT_COST_GBP = Decimal("0.00012")  # ~£0.0001 per mini call

# Heroku-optimized threading (avoid memory issues)
HEROKU_DYNO = os.getenv("DYNO") is not None
MAX_THREADS = 3 if HEROKU_DYNO else min(8, (os.cpu_count() or 1) + 4)

# UK retailers database (expanded)
UK_RETAILERS = {
    "tesco": {"vat_rate": 0.20, "currency": "GBP", "type": "supermarket"},
    "sainsburys": {"vat_rate": 0.20, "currency": "GBP", "type": "supermarket"},
    "asda": {"vat_rate": 0.20, "currency": "GBP", "type": "supermarket"},
    "morrisons": {"vat_rate": 0.20, "currency": "GBP", "type": "supermarket"},
    "waitrose": {"vat_rate": 0.20, "currency": "GBP", "type": "supermarket"},
    "marks & spencer": {"vat_rate": 0.20, "currency": "GBP", "type": "retail"},
    "john lewis": {"vat_rate": 0.20, "currency": "GBP", "type": "retail"},
    "argos": {"vat_rate": 0.20, "currency": "GBP", "type": "retail"},
    "boots": {"vat_rate": 0.20, "currency": "GBP", "type": "pharmacy"},
    "costa coffee": {"vat_rate": 0.20, "currency": "GBP", "type": "food_service"},
    "starbucks": {"vat_rate": 0.20, "currency": "GBP", "type": "food_service"},
    "pret a manger": {"vat_rate": 0.20, "currency": "GBP", "type": "food_service"},
    "royal mail": {"vat_rate": 0.20, "currency": "GBP", "type": "postal"},
}

# British receipt schema (enhanced)
UK_RECEIPT_JSON_SCHEMA = {
    "type": "object",
    "required": ["vendor", "totals", "items", "receipt_info"],
    "properties": {
        "vendor": {
            "type": "object",
            "required": ["name"],
            "properties": {
                "name": {"type": "string", "description": "Store/company name"},
                "address": {"type": "string", "description": "Full address"},
                "postcode": {"type": "string", "pattern": "^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][A-Z]{2}$"},
                "vat_number": {"type": "string", "description": "VAT registration number"},
                "phone": {"type": "string"}
            }
        },
        "receipt_info": {
            "type": "object",
            "properties": {
                "receipt_number": {"type": "string"},
                "date": {"type": "string", "format": "date"},
                "time": {"type": "string", "format": "time"},
                "currency": {"type": "string", "enum": ["GBP"], "default": "GBP"}
            }
        },
        "items": {
            "type": "array",
            "items": {
                "type": "object",
                "required": ["name", "total_price"],
                "properties": {
                    "name": {"type": "string"},
                    "quantity": {"type": "number", "minimum": 0},
                    "unit_price": {"type": "number", "minimum": 0},
                    "total_price": {"type": "number", "minimum": 0},
                    "vat_rate": {"type": "number", "enum": [0, 0.05, 0.20]},
                    "category": {"type": "string"}
                }
            }
        },
        "totals": {
            "type": "object",
            "required": ["total"],
            "properties": {
                "subtotal": {"type": "number", "minimum": 0},
                "vat_amount": {"type": "number", "minimum": 0},
                "total": {"type": "number", "minimum": 0},
                "payment_method": {"type": "string"},
                "change_given": {"type": "number", "minimum": 0}
            }
        }
    }
}

# ---------------------------------------------------------------------------
# Exception classes
# ---------------------------------------------------------------------------
class VisionAPIError(Exception):
    """OpenAI Vision API related errors"""
    pass

class ImageProcessingError(Exception):
    """Image processing related errors"""
    pass

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def _analyze_image_state(img: Image.Image) -> Dict[str, str]:
    """Analyze receipt image quality for optimal processing hints."""
    try:
        # Convert to grayscale for analysis (memory efficient)
        gray = img.convert("L")
        
        # Resize for speed (Heroku optimization)
        analysis_size = (128, 128) if HEROKU_DYNO else (256, 256)
        thumb = gray.resize(analysis_size)
        
        pixels = list(thumb.getdata())
        mean_brightness = statistics.fmean(pixels)
        contrast = statistics.pstdev(pixels)
        
        # British receipt specific heuristics
        if mean_brightness > 220:
            state = "over-exposed"  # Common with flash photography
        elif mean_brightness < 35:
            state = "under-exposed"  # Common with poor lighting
        elif contrast < 15:
            state = "low-contrast"  # Faded thermal receipts
        elif img.height > img.width * 3:
            state = "tall-receipt"  # Typical UK till receipts
        else:
            state = "normal"
        
        # Adaptive detail level for cost optimization
        detail = "high" if state in {"under-exposed", "low-contrast"} else "low"
        
        return {
            "state_str": state,
            "detail": detail,
            "brightness": round(mean_brightness, 1),
            "contrast": round(contrast, 1)
        }
        
    except Exception as e:
        logger.warning(f"Image analysis failed: {e}")
        return {"state_str": "unknown", "detail": "low"}

async def _predict_uk_vendor(
    async_client: AsyncOpenAI, 
    img: Image.Image
) -> Tuple[str | None, Decimal]:
    """Quick vendor detection using top portion of receipt."""
    try:
        # Crop top portion (where UK retailer names typically appear)
        crop_height = min(img.height, 400)  # Reduced for Heroku
        crop = img.crop((0, 0, img.width, crop_height))
        
        # Compress for speed
        buf = BytesIO()
        crop.save(buf, format="JPEG", quality=70, optimize=True)
        b64 = base64.b64encode(buf.getvalue()).decode()
        
        # UK-specific vendor detection prompt
        prompt = (
            "Look at this UK receipt header. What retailer/store is this? "
            "Return just the store name (e.g. 'Tesco', 'Sainsburys', 'ASDA') or 'unknown'. "
            "Focus on UK high street brands."
        )
        
        response = await async_client.chat.completions.create(
            model=VENDOR_DETECT_MODEL,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {
                        "url": f"data:image/jpeg;base64,{b64}",
                        "detail": "low"  # Cost optimization
                    }},
                ]
            }],
            max_tokens=10,  # Very short response
            temperature=0,
            timeout=10,  # Quick timeout for Heroku
        )
        
        vendor_name = response.choices[0].message.content.strip().lower()
        
        # Validate against known UK retailers
        if vendor_name == "unknown" or len(vendor_name) > 50:
            return None, VENDOR_DETECT_COST_GBP
            
        # Check if it's a known UK retailer
        for known_retailer in UK_RETAILERS.keys():
            if known_retailer.lower() in vendor_name or vendor_name in known_retailer.lower():
                return known_retailer, VENDOR_DETECT_COST_GBP
        
        return vendor_name, VENDOR_DETECT_COST_GBP
        
    except Exception as e:
        logger.debug(f"Vendor prediction failed: {e}")
        return None, VENDOR_DETECT_COST_GBP

# ---------------------------------------------------------------------------
# Main service class
# ---------------------------------------------------------------------------

class OpenAIVisionService:
    """Enhanced OpenAI Vision service optimized for UK receipts and Heroku deployment."""
    
    def __init__(self):
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not configured")
        
        # HTTP client optimized for Heroku
        http_limits = httpx.Limits(
            max_keepalive_connections=10 if HEROKU_DYNO else 20,
            max_connections=50 if HEROKU_DYNO else 100,
            keepalive_expiry=20.0 if HEROKU_DYNO else 30.0,
        )
        
        self.async_client = AsyncOpenAI(
            api_key=settings.OPENAI_API_KEY,
            http_client=httpx.AsyncClient(http2=True, limits=http_limits)
        )
        
        # Thread pool sized for Heroku dynos
        self.thread_pool = concurrent.futures.ThreadPoolExecutor(
            max_workers=MAX_THREADS,
            thread_name_prefix="UK_Receipt_Processor"
        )
        
        self.model = FT_MODEL_ID or MODEL_NAME_DEFAULT
        
        # British-focused metrics
        self.metrics: Dict[str, Union[int, Decimal]] = {
            "total_receipts": 0,
            "uk_retailers_detected": 0,
            "vendor_predictions": 0,
            "total_processing_time": Decimal("0.0"),
            "total_cost_gbp": Decimal("0.0"),
            "vendor_detection_cost_gbp": Decimal("0.0"),
            "failed_attempts": 0,
            "heroku_optimizations": 1 if HEROKU_DYNO else 0,
        }

    async def process_receipt(
        self, 
        image_file, 
        filename: str = "", 
        *, 
        high_res: bool = False
    ) -> Dict[str, Any]:
        """Process UK receipt with enhanced accuracy and British currency."""
        start_time = time.time()
        self.metrics["total_receipts"] += 1
        
        # Encode image segments
        loop = asyncio.get_running_loop()
        path_ref = (
            Path(image_file.name) 
            if hasattr(image_file, "name") 
            else Path(filename or "upload.jpg")
        )
        
        try:
            segments = await loop.run_in_executor(
                self.thread_pool, encode_image, path_ref, high_res
            )
        except Exception as e:
            self.metrics["failed_attempts"] += 1
            raise ImageProcessingError(f"Failed to encode image: {e}")
        
        # Analyze first segment for quality hints
        first_jpeg = base64.b64decode(segments[0][1])
        vendor_cost = Decimal("0.0")
        
        try:
            with Image.open(BytesIO(first_jpeg)) as pil_img:
                state_info = _analyze_image_state(pil_img)
                
                # Optional vendor pre-detection (can be disabled for cost)
                vendor_hint = None
                if os.getenv("ENABLE_VENDOR_DETECTION", "true").lower() == "true":
                    vendor_hint, vendor_cost = await _predict_uk_vendor(
                        self.async_client, pil_img
                    )
                    if vendor_hint:
                        self.metrics["vendor_predictions"] += 1
                        if vendor_hint.lower() in UK_RETAILERS:
                            self.metrics["uk_retailers_detected"] += 1
                            
        except Exception as e:
            logger.warning(f"Image analysis failed: {e}")
            state_info = {"state_str": "unknown", "detail": "low"}
            vendor_hint = None
        
        # Process all segments
        merged_result = {"items": []}
        total_input_tokens = 0
        total_output_tokens = 0
        
        for idx, (y_offset, b64_data) in enumerate(segments, 1):
            try:
                messages = self._build_uk_optimized_messages(
                    idx, len(segments), y_offset, b64_data, state_info, vendor_hint
                )
                
                response = await self.async_client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    response_format={"type": "json_object"},
                    max_tokens=1500,
                    temperature=0,
                    timeout=45,  # Generous timeout for Heroku
                )
                
                # Track token usage
                usage = response.usage
                if usage:
                    total_input_tokens += usage.prompt_tokens or 0
                    total_output_tokens += usage.completion_tokens or 0
                
                # Parse response
                content = response.choices[0].message.content.strip()
                if content.startswith("```json"):
                    content = content[7:-3]
                elif content.startswith("```"):
                    content = content[3:-3]
                
                chunk_data = json.loads(content)
                
                # Merge results
                if idx == 1:
                    # First segment contains header info
                    merged_result.update({
                        k: v for k, v in chunk_data.items() 
                        if k != "items"
                    })
                
                # Combine items from all segments
                merged_result["items"].extend(chunk_data.get("items", []))
                
            except json.JSONDecodeError as e:
                logger.error(f"JSON decode failed for segment {idx}: {e}")
                self.metrics["failed_attempts"] += 1
                continue
                
            except Exception as e:
                logger.error(f"Processing failed for segment {idx}: {e}")
                self.metrics["failed_attempts"] += 1
                if idx == 1:  # If first segment fails, abort
                    raise VisionAPIError(f"Critical processing failure: {e}")
        
        # Calculate British costs
        elapsed_time = time.time() - start_time
        processing_cost = (
            Decimal(total_input_tokens) / 1000 * COST_PER_1K_INPUT_GBP +
            Decimal(total_output_tokens) / 1000 * COST_PER_1K_OUTPUT_GBP
        )
        total_cost_gbp = processing_cost + vendor_cost
        
        # Update metrics
        self.metrics["total_processing_time"] += Decimal(str(elapsed_time))
        self.metrics["total_cost_gbp"] += total_cost_gbp
        self.metrics["vendor_detection_cost_gbp"] += vendor_cost
        
        # Add British-specific metadata
        merged_result["processing_metadata"] = {
            "api_used": "openai",
            "model": self.model,
            "segments_processed": len(segments),
            "state_hint": state_info.get("state_str", "unknown"),
            "vendor_hint": vendor_hint,
            "processing_time_seconds": round(elapsed_time, 3),
            "cost_gbp": float(total_cost_gbp),  # British currency!
            "vendor_detection_cost_gbp": float(vendor_cost),
            "input_tokens": total_input_tokens,
            "output_tokens": total_output_tokens,
            "currency": "GBP",
            "heroku_optimized": HEROKU_DYNO,
        }
        
        # Ensure British currency in totals
        if "totals" in merged_result and "total" in merged_result["totals"]:
            # Add currency field if missing
            if "currency" not in merged_result.get("receipt_info", {}):
                if "receipt_info" not in merged_result:
                    merged_result["receipt_info"] = {}
                merged_result["receipt_info"]["currency"] = "GBP"
        
        return merged_result
    
    def _build_uk_optimized_messages(
        self, 
        segment_idx: int, 
        total_segments: int, 
        y_offset: int, 
        b64_data: str, 
        state_info: Dict[str, str], 
        vendor_hint: str | None
    ) -> List[Dict[str, Any]]:
        """Build optimized messages for UK receipt processing."""
        
        # Build context-aware prompt
        context_parts = [
            f"Segment {segment_idx}/{total_segments} (y≈{y_offset}px).",
            f"Receipt quality: {state_info.get('state_str', 'normal')}."
        ]
        
        if vendor_hint:
            context_parts.append(f"Detected retailer: {vendor_hint}.")
            if vendor_hint.lower() in UK_RETAILERS:
                retailer_info = UK_RETAILERS[vendor_hint.lower()]
                context_parts.append(
                    f"This is a UK {retailer_info['type']} with {retailer_info['vat_rate']*100}% VAT."
                )
        
        context_parts.extend([
            "Extract ALL receipt data in British format.",
            "Currency is GBP (£). VAT rates: 0%, 5%, or 20%.",
            "Keep original item order. Include postcode if visible.",
            "Return valid JSON only."
        ])
        
        prompt_text = " ".join(context_parts)
        
        return [
            {
                "role": "system", 
                "content": (
                    "You are an expert UK receipt processing system. "
                    "Extract financial data with British formatting. "
                    "Focus on accuracy for VAT, postcodes, and British retailers. "
                    "Return only valid JSON."
                )
            },
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt_text},
                    {
                        "type": "image_url", 
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{b64_data}",
                            "detail": state_info.get("detail", "low")
                        }
                    },
                    {
                        "type": "text", 
                        "text": f"Use this JSON schema:\n{json.dumps(UK_RECEIPT_JSON_SCHEMA, indent=2)}"
                    },
                ]
            }
        ]
    
    # Existing helper methods (unchanged signatures)
    @staticmethod
    def is_uk_retailer(vendor: str) -> bool:
        """Check if vendor is a known UK retailer."""
        return vendor.lower() in UK_RETAILERS
    
    def get_metrics(self) -> Dict[str, Union[int, float, str]]:
        """Get processing metrics in JSON-serializable format."""
        return {
            k: (float(v) if isinstance(v, Decimal) else v)
            for k, v in self.metrics.items()
        }
    
    def reset_metrics(self) -> None:
        """Reset all metrics counters."""
        for key in self.metrics:
            if isinstance(self.metrics[key], Decimal):
                self.metrics[key] = Decimal("0.0")
            else:
                self.metrics[key] = 0

# ---------------------------------------------------------------------------
# Module-level helper functions (unchanged signatures)
# ---------------------------------------------------------------------------

def validate_api_key() -> bool:
    """Validate OpenAI API key is configured."""
    return bool(getattr(settings, 'OPENAI_API_KEY', None))

# Singleton pattern for backward compatibility
_singleton_service: OpenAIVisionService | None = None

def _get_singleton() -> OpenAIVisionService:
    """Get or create singleton service instance."""
    global _singleton_service
    if _singleton_service is None:
        _singleton_service = OpenAIVisionService()
    return _singleton_service

def get_metrics(service: OpenAIVisionService | None = None) -> Dict[str, Any]:
    """Get metrics from service instance."""
    svc = service or _get_singleton()
    return svc.get_metrics()

def reset_metrics(service: OpenAIVisionService | None = None) -> None:
    """Reset metrics on service instance."""
    svc = service or _get_singleton()
    svc.reset_metrics()
