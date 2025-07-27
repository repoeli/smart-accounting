#!/usr/bin/env python3
"""
openai_service.py – v1.0 (Cloudinary + Costco fix, single‑model, BC safe)
=======================================================================
This version **adds an optional Cloudinary upload step** that:
  • **Resizes** the *original* uploaded receipt to a bounded long-edge (default 1280px)
    to save Cloudinary storage and bandwidth.
  • **Uploads** the optimised JPEG to Cloudinary and returns its `public_id` and URLs
    in `processing_metadata.cloudinary` for easy retrieval later.
  • Runs **only if** `CLOUDINARY_URL` is configured; otherwise it silently skips.

Everything else you already had (tile concurrency, Costco fixes, totals/tax/items
rescue, validator shim) stays intact. **No public function names, return types,
or module structure changed.**
"""

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
import hashlib
from pathlib import Path
from typing import Any, Dict, List, Tuple, Union

import httpx
from django.conf import settings
from openai import AsyncOpenAI
from PIL import Image  # type: ignore

# Optional Cloudinary --------------------------------------------------------
# (Free-tier friendly: hard-compress, hash-dedupe, skip tiny files)
try:  # pragma: no cover – optional dependency
    import cloudinary
    from cloudinary.uploader import upload as cl_upload
except Exception:  # noqa: BLE001
    cloudinary = None
    cl_upload = None

from .receipt_parser import encode_image  # heavy image work
# Validator import compatibility: support both class names; fallback shim
try:
    from .data_validator import DataValidator  # preferred
except Exception:
    try:
        from .data_validator import ReceiptDataValidator as DataValidator  # alt name
    except Exception:  # pragma: no cover – fallback when validator missing
        class DataValidator:  # shim – keeps interface stable
            @staticmethod
            def validate_and_clean(payload: Dict[str, Any]):
                return payload
            
            @staticmethod
            def validate_and_fix(payload: Dict[str, Any]):
                return [], {}

from .openai_schema import UK_RECEIPT_JSON_SCHEMA

logger = logging.getLogger(__name__)

# Local exceptions -----------------------------------------------------------
class ImageProcessingError(Exception):
    """Raised when pre-processing or segmentation returns unusable data."""
    pass

__all__ = [
    "OpenAIVisionService",
    "validate_api_key",
    "get_metrics",
    "reset_metrics",
    "safe_enqueue",
    "queue_ocr_task",
]

# ---------------------------------------------------------------------------
# Settings / constants
# ---------------------------------------------------------------------------
MODEL_NAME_DEFAULT = os.getenv("OPENAI_VISION_MODEL", "gpt-4o")
FT_MODEL_ID = os.getenv("OPENAI_RECEIPT_FT_MODEL")  # optional fine‑tuned model
COST_PER_1K_INPUT = Decimal("0.0025")
COST_PER_1K_OUTPUT = Decimal("0.01")
THREADS = min(8, (os.cpu_count() or 1) + 4)
MAX_TOKENS_TILE = int(os.getenv("OPENAI_MAX_TOKENS_TILE", "600"))
OPENAI_TIMEOUT_SECONDS = int(os.getenv("OPENAI_TIMEOUT_SECONDS", "30"))

# Cloudinary knobs (all optional, tuned for free tier)
CLOUDINARY_ENABLED = bool(getattr(settings, "CLOUDINARY_URL", os.getenv("CLOUDINARY_URL", "")))
CLOUDINARY_FOLDER = getattr(settings, "CLOUDINARY_RECEIPTS_FOLDER", os.getenv("CLOUDINARY_RECEIPTS_FOLDER", "receipts-lite"))
CLOUDINARY_MAX_EDGE = int(getattr(settings, "CLOUDINARY_MAX_EDGE", os.getenv("CLOUDINARY_MAX_EDGE", "1024")))
CLOUDINARY_JPEG_QUALITY = int(getattr(settings, "CLOUDINARY_JPEG_QUALITY", os.getenv("CLOUDINARY_JPEG_QUALITY", "60")))
CLOUDINARY_OVERWRITE = bool(int(getattr(settings, "CLOUDINARY_OVERWRITE", os.getenv("CLOUDINARY_OVERWRITE", "0"))))
CLOUDINARY_MIN_BYTES = int(getattr(settings, "CLOUDINARY_MIN_BYTES", os.getenv("CLOUDINARY_MIN_BYTES", "40960")))

# ---------------------------------------------------------------------------
# Heuristics for image state → prompt hints
# ---------------------------------------------------------------------------

def _analyze_image_state(img: Image.Image) -> Dict[str, str]:
    gray = img.convert("L").resize((256, 256))
    pixels = list(gray.getdata())
    mean = statistics.fmean(pixels)
    stdv = statistics.pstdev(pixels)
    if mean > 210:
        state = "over-exposed"
    elif mean < 40:
        state = "under-exposed"
    elif stdv < 20:
        state = "low contrast"
    else:
        state = "normal"
    detail = "high" if state in {"under-exposed", "low contrast"} else "low"
    return {"state_str": state, "detail": detail}

# ---------------------------------------------------------------------------
# Cloudinary helpers (module-level, optional, safe no-ops when disabled)
# ---------------------------------------------------------------------------

def _resize_long_edge(img: Image.Image, max_edge: int) -> Image.Image:
    w, h = img.size
    if max(w, h) <= max_edge:
        return img
    if w >= h:
        new_w = max_edge
        new_h = int(h * (max_edge / w))
    else:
        new_h = max_edge
        new_w = int(w * (max_edge / h))
    return img.resize((new_w, new_h), Image.LANCZOS)


def _prepare_and_upload_cloudinary(path: Path, filename: str) -> Dict[str, Any]:
    """Resize and upload to Cloudinary if configured.

    Returns an empty dict if Cloudinary is disabled or upload fails. This is
    called in a thread pool so it must be **sync**.
    """
    if not (CLOUDINARY_ENABLED and cl_upload):  # fast no-op
        return {}

    try:
        with Image.open(path) as im:
            im = _resize_long_edge(im.convert("RGB"), CLOUDINARY_MAX_EDGE)
            buf = BytesIO()
            im.save(buf, format="JPEG", quality=CLOUDINARY_JPEG_QUALITY, optimize=True)
            payload = buf.getvalue()
    except Exception as exc:  # be robust
        logger.warning("Cloudinary resize failed: %s", exc)
        return {}

    # Skip tiny files to save quota
    if len(payload) < CLOUDINARY_MIN_BYTES:
        return {}

    try:
        # Hash-based public_id for dedupe on free tier
        h = hashlib.sha256(payload).hexdigest()[:32]
        public_id = f"{CLOUDINARY_FOLDER}/{h}" if CLOUDINARY_FOLDER else h
        res = cl_upload(
            payload,
            public_id=public_id,
            folder=CLOUDINARY_FOLDER or None,
            overwrite=CLOUDINARY_OVERWRITE,
            resource_type="image",
            format="jpg",
            quality="auto:eco",
        )
        return {
            "public_id": res.get("public_id"),
            "secure_url": res.get("secure_url"),
            "bytes": res.get("bytes"),
            "width": res.get("width"),
            "height": res.get("height"),
            "format": res.get("format"),
            "version": res.get("version"),
        }
    except Exception as exc:
        logger.warning("Cloudinary upload failed: %s", exc)
        return {}

# ---------------------------------------------------------------------------
class OpenAIVisionService:
    """OpenAI GPT‑4o Vision backend with concurrency, hints, Costco & Cloudinary.

    Public signatures remain unchanged. Cloudinary upload is **opt-in** via
    configuration and simply augments `processing_metadata.cloudinary`.
    """

    def __init__(self):
        # Read key from Django settings or env (Heroku-safe)
        api_key = getattr(settings, 'OPENAI_API_KEY', None) or os.environ.get('OPENAI_API_KEY', '')
        
        if not api_key:
            raise ValueError("OPENAI_API_KEY is not configured")
        
        # Handle test/development environments
        is_test_env = (
            api_key.startswith('sk-test-') or 
            api_key.startswith('test-') or
            'test' in api_key.lower() or
            os.environ.get('DJANGO_SETTINGS_MODULE', '').endswith('.testing') or
            os.environ.get('CI') == 'true'  # GitHub Actions
        )
        
        if is_test_env:
            # In test environment, create a mock client to prevent API calls
            self.async_client = None
            logger.warning("Running in test mode - OpenAI client disabled")
        else:
            # Initialize without HTTP/2 for Heroku compatibility
            try:
                # Heroku note: some OpenAI SDK builds don't accept `http2` kwarg. Use defaults.
                self.async_client = AsyncOpenAI(api_key=api_key)
                logger.info("OpenAI client initialized for Heroku production")
            except Exception as e:
                logger.error(f"Failed to initialize OpenAI client: {e}")
                raise e
            
        self.thread_pool = concurrent.futures.ThreadPoolExecutor(max_workers=THREADS)
        self.model = FT_MODEL_ID or MODEL_NAME_DEFAULT
        self.metrics: Dict[str, Union[int, Decimal]] = {
            "total_receipts": 0,
            "total_processing_time": Decimal("0.0"),
            "total_cost": Decimal("0.0"),
            "failed_attempts": 0,
        }

    # -------------------------------------------------------------------
    async def process_receipt(self, image_file, filename: str = "", *, high_res: bool = False) -> Dict[str, Any]:  # noqa: D401
        start = time.time()
        self.metrics["total_receipts"] += 1

        loop = asyncio.get_running_loop()
        path_ref = Path(getattr(image_file, "name", "")) if hasattr(image_file, "name") else Path(filename or "upload.jpg")

        # (1) Optional Cloudinary store of an optimised copy ----------------
        cloudinary_meta: Dict[str, Any] = {}
        if CLOUDINARY_ENABLED and cl_upload is not None:
            try:
                cloudinary_meta = await loop.run_in_executor(
                    self.thread_pool, _prepare_and_upload_cloudinary, path_ref, path_ref.name
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Cloudinary path failed: %s", exc)

        # (2) Heavy pre-processing / tiling for OCR ------------------------
        segments: List[Tuple[int, str]] = await loop.run_in_executor(self.thread_pool, encode_image, path_ref, high_res)
        if not segments:
            raise ImageProcessingError("encode_image returned no segments")

        # Heuristics once on first tile
        try:
            first_tile_b64 = segments[0][1]
        except Exception as exc:  # noqa: BLE001
            raise ImageProcessingError("Unexpected segment structure") from exc
        first_jpeg = base64.b64decode(first_tile_b64)
        with Image.open(BytesIO(first_jpeg)) as pil_img:
            state_info = _analyze_image_state(pil_img)
        vendor_hint = None  # single model; skip extra call

        # --- Concurrent tile calls --------------------------------------
        async def _call_tile(idx: int, total: int, y: int, b64: str, full_schema: bool):
            messages = self._build_messages(idx, total, y, b64, state_info, vendor_hint, full_schema)
            rsp = await self.async_client.chat.completions.create(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object", "require_grounding": True},
                max_tokens=MAX_TOKENS_TILE,
                temperature=0,
                timeout=OPENAI_TIMEOUT_SECONDS,
            )
            return idx, json.loads(rsp.choices[0].message.content), rsp.usage

        tasks = [
            _call_tile(i, len(segments), y, b64, full_schema=(i == 1))
            for i, (y, b64) in enumerate(segments, 1)
        ]
        results = await asyncio.gather(*tasks)
        results.sort(key=lambda x: x[0])

        merged: Dict[str, Any] = {"items": []}
        in_tok = out_tok = 0
        for idx, chunk, usage in results:
            in_tok += getattr(usage, "prompt_tokens", 0) or 0
            out_tok += getattr(usage, "completion_tokens", 0) or 0
            if idx == 1:
                merged.update({k: v for k, v in chunk.items() if k not in ("items", "line_items")})
            items = chunk.get("line_items") or chunk.get("items") or []
            merged["items"].extend(items)

        # Fuse split lines
        merged["items"] = _fuse_split_lines(merged["items"])
        merged.setdefault("line_items", merged["items"])

        # Map mandatory keys
        merged.setdefault("vendor_name", merged.get("vendor") or merged.get("merchant") or None)
        merged.setdefault("total_amount", merged.get("total") or merged.get("amount") or None)
        merged.setdefault("tax_amount", merged.get("vat_amount") if merged.get("vat_amount") is not None else merged.get("tax"))
        merged.setdefault("currency", merged.get("currency") or "GBP")

        # Validation & rescue
        try:
            errors: List[str] = []
            validator = DataValidator()
            if hasattr(validator, 'validate_and_clean'):
                cleaned_data = validator.validate_and_clean(merged)
                merged.update(cleaned_data)
            else:
                errors, fixed = validator.validate_and_fix(merged)
                if fixed:
                    merged.update(fixed)
        except Exception as e:  # validator optional
            logger.warning("Validator error: %s", e)
            errors = ["validator_exception"]

        needs_rescue = (
            ("total_mismatch" in errors) or
            (merged.get("total_amount") in (None, "N/A")) or
            ("tax_missing" in errors) or
            (merged.get("tax_amount") in (None, "N/A")) or
            ("items_count_mismatch" in errors)
        )
        if needs_rescue:
            try:
                last_b64 = None
                try:
                    last_b64 = segments[-1][1]
                except Exception:  # noqa: BLE001
                    last_b64 = None
                rescue: Dict[str, Any] = {}
                if last_b64:
                    rescue = await self._totals_rescue(last_b64)
                if rescue.get("total_amount") is not None:
                    merged["total_amount"] = rescue["total_amount"]
                if rescue.get("tax_amount") is not None:
                    merged["tax_amount"] = rescue["tax_amount"]
                if rescue.get("items_sold") is not None:
                    merged.setdefault("processing_metadata", {})
                    merged["processing_metadata"]["items_sold_declared"] = rescue["items_sold"]
                errors = [e for e in errors if e not in {"total_mismatch", "tax_missing", "items_count_mismatch"}]
            except Exception as ex:  # noqa: BLE001
                logger.debug("totals_rescue failed: %s", ex)

        # Post‑rescue: simple check for item count mismatch vs declared
        declared_items = merged.get("processing_metadata", {}).get("items_sold_declared")
        if isinstance(declared_items, int):
            if abs(declared_items - len(merged.get("line_items", []))) > 2:
                errors.append("items_count_mismatch")

        # Metrics / metadata
        elapsed = time.time() - start
        cost = Decimal(in_tok) / 1000 * COST_PER_1K_INPUT + Decimal(out_tok) / 1000 * COST_PER_1K_OUTPUT
        self.metrics["total_processing_time"] += Decimal(str(elapsed))
        self.metrics["total_cost"] += cost
        merged.setdefault("processing_metadata", {})
        merged["processing_metadata"].update({
            "model": self.model,
            "segments": len(segments),
            "state_hint": state_info["state_str"],
            "vendor_hint": vendor_hint,
            "time_sec": round(elapsed, 3),
            "cost_usd": float(cost),
            "validator_errors": errors,
            "input_tokens": int(in_tok),
            "output_tokens": int(out_tok),
        })
        if cloudinary_meta:
            merged["processing_metadata"]["cloudinary"] = cloudinary_meta
        return merged

    # -------------------------------------------------------------------
    def _build_messages(self, idx: int, total: int, y: int, b64: str, state_info: Dict[str, str], vendor_hint: str | None, full_schema: bool):
        header = f"Segment {idx}/{total} y≈{y}px. Receipt looks {state_info['state_str']}. "
        if vendor_hint:
            header += f"Vendor appears to be {vendor_hint}. "
        header += (
            "Extract UK receipt data using the schema. Keep original order. "
            "Ignore any handwritten marks, vertical pen lines or scribbles. "
            "If numbers are crossed or blacked out, use the printed machine text only."
        )
        schema_text = json.dumps(
            UK_RECEIPT_JSON_SCHEMA if full_schema else {
                "type": "object",
                "properties": {
                    "line_items": UK_RECEIPT_JSON_SCHEMA["properties"]["line_items"]
                },
                "required": ["line_items"],
            }
        )
        return [
            {"role": "system", "content": "You are a UK financial document expert. Return only valid JSON."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": header},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": state_info['detail']}},
                    {"type": "text", "text": schema_text},
                ],
            },
        ]

    # -------------------------------------------------------------------
    async def _totals_rescue(self, last_tile_b64: str) -> Dict[str, Any]:
        """Cheap follow-up to recover TOTAL/TAX when first pass fails."""
        mini_schema = {
            "type": "object",
            "properties": {
                "total_amount": {"type": "number"},
                "tax_amount": {"type": ["number", "null"]},
                "items_sold": {"type": ["integer", "null"]},
            },
            "required": ["total_amount"],
        }
        messages = [
            {"role": "system", "content": "Return ONLY the JSON object requested."},
            {"role": "user", "content": [
                {"type": "text", "text": "Ignore pen marks/scribbles/black bars. Read the printed TOTAL block only."},
                {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{last_tile_b64}", "detail": "high"}},
                {"type": "text", "text": json.dumps(mini_schema)},
            ]},
        ]
        rsp = await self.async_client.chat.completions.create(
            model=self.model,
            messages=messages,
            response_format={"type": "json_object"},
            max_tokens=120,
            temperature=0,
            timeout=min(OPENAI_TIMEOUT_SECONDS, 20),
        )
        return json.loads(rsp.choices[0].message.content)

# ---------------------------------------------------------------------------
# Local helper ---------------------------------------------------------------
# ---------------------------------------------------------------------------

def _fuse_split_lines(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Join descriptions split over two lines (no price on continuation)."""
    fused: List[Dict[str, Any]] = []
    pending: Dict[str, Any] | None = None
    for it in items:
        desc = (it.get("description") or "").strip()
        has_price = it.get("total_price") not in (None, "")
        if pending and not has_price and not any(ch.isdigit() for ch in desc[-5:]):
            pending["description"] = (pending.get("description", "") + " " + desc).strip()
        else:
            if pending:
                fused.append(pending)
            pending = it
    if pending:
        fused.append(pending)
    return fused

# ---------------------------------------------------------------------------
# Safe enqueue helpers (Celery queue resilience for web dynos)
# ---------------------------------------------------------------------------

def safe_enqueue(task, *args, **kwargs) -> dict:
    """Enqueue a Celery task safely.

    - Uses `.delay()` normally.
    - If the broker is unavailable and `CELERY_TASK_ALWAYS_EAGER=1`, falls back to `task.apply(...)`.
    - Otherwise returns a deferred signal so the caller can respond 202 without 500s.

    Returns a dict: {"queued": bool, "eager": bool, "deferred": bool}.
    """
    import os, logging
    logger = logging.getLogger(__name__)
    try:
        from celery.exceptions import CeleryError  # type: ignore
    except Exception:  # pragma: no cover
        class CeleryError(Exception):  # type: ignore
            pass

    try:
        task.delay(*args, **kwargs)
        return {"queued": True, "eager": False, "deferred": False}
    except Exception as exc:  # CeleryError or transient broker error
        if os.getenv("CELERY_TASK_ALWAYS_EAGER") == "1":
            try:
                task.apply(args=args, kwargs=kwargs)
                return {"queued": True, "eager": True, "deferred": False}
            except Exception as inner:
                logger.warning("safe_enqueue eager apply failed: %s", inner)
                return {"queued": False, "eager": True, "deferred": True}
        logger.warning("safe_enqueue deferred due to broker error: %s", exc)
        return {"queued": False, "eager": False, "deferred": True}


def queue_ocr_task(receipt_id: int) -> dict:
    """Convenience wrapper for OCR receipt processing.

    Lazily imports `process_receipt_task` so this module loads even where Celery
    isn't present. Returns the same dict as `safe_enqueue`.
    """
    import logging
    logger = logging.getLogger(__name__)
    try:
        from receipts.tasks import process_receipt_task  # type: ignore
    except Exception as exc:  # keep import errors from crashing web dynos
        logger.error("queue_ocr_task: cannot import process_receipt_task: %s", exc)
        return {"queued": False, "eager": False, "deferred": True}
    return safe_enqueue(process_receipt_task, receipt_id)

# ---------------------------------------------------------------------------
# Global helpers (unchanged signatures) -------------------------------------
# ---------------------------------------------------------------------------
from django.conf import settings as _s
_singleton: OpenAIVisionService | None = None

def _singleton_service() -> OpenAIVisionService:
    global _singleton
    if _singleton is None:
        _singleton = OpenAIVisionService()
    return _singleton

def validate_api_key() -> bool:
    return bool(_s.OPENAI_API_KEY)

def get_metrics(svc: OpenAIVisionService | None = None):
    svc = svc or _singleton_service()
    return svc.metrics

def reset_metrics(svc: OpenAIVisionService | None = None):
    svc = svc or _singleton_service()
    svc.metrics = {k: (Decimal("0.0") if isinstance(v, Decimal) else 0) for k, v in svc.metrics.items()}
