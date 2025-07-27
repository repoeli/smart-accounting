"""
Safe Celery Queue Service
Handles task enqueuing with graceful fallbacks for Redis/Celery connectivity issues
"""
import logging
import os
from typing import Dict, Any
from celery.exceptions import CeleryError

logger = logging.getLogger(__name__)

def queue_ocr_task(receipt_id: int) -> Dict[str, Any]:
    """
    Safely queue OCR processing task with fallback handling.
    
    Args:
        receipt_id: ID of the receipt to process
        
    Returns:
        Dict with queuing status:
        - {"queued": True} - Task successfully queued
        - {"queued": True, "eager": True} - Task executed immediately (CELERY_TASK_ALWAYS_EAGER=1)
        - {"queued": False, "deferred": True} - Queue unavailable, client should retry
    """
    try:
        from ..tasks import process_receipt_task
        
        # Try to queue the task
        process_receipt_task.delay(receipt_id, use_v5=True)
        logger.info(f"Successfully queued OCR task for receipt {receipt_id}")
        return {"queued": True}
        
    except CeleryError as exc:
        # Fallback: run in-process if explicitly enabled, else respond 202 so the client retries
        if os.getenv("CELERY_TASK_ALWAYS_EAGER") == "1":
            logger.info(f"Running OCR task eagerly for receipt {receipt_id}")
            from ..tasks import process_receipt_task
            process_receipt_task.apply(args=(receipt_id, True))  # use_v5=True
            return {"queued": True, "eager": True}
            
        logger.warning(f"Queue temporarily unavailable for receipt {receipt_id}; returning deferred status. Error: {exc}")
        return {"queued": False, "deferred": True}
        
    except Exception as exc:
        # Any other error (import issues, etc.)
        logger.error(f"Unexpected error queueing OCR task for receipt {receipt_id}: {exc}")
        return {"queued": False, "error": str(exc)}

def queue_reprocess_task(receipt_id: int) -> Dict[str, Any]:
    """
    Safely queue OCR reprocessing task with fallback handling.
    
    Args:
        receipt_id: ID of the receipt to reprocess
        
    Returns:
        Dict with queuing status (same as queue_ocr_task)
    """
    try:
        from ..tasks import process_receipt_task
        
        # Try to queue the reprocessing task
        process_receipt_task.delay(receipt_id, use_v5=True)
        logger.info(f"Successfully queued OCR reprocessing task for receipt {receipt_id}")
        return {"queued": True, "reprocessed": True}
        
    except CeleryError as exc:
        # Fallback: run in-process if explicitly enabled, else respond 202 so the client retries
        if os.getenv("CELERY_TASK_ALWAYS_EAGER") == "1":
            logger.info(f"Running OCR reprocessing task eagerly for receipt {receipt_id}")
            from ..tasks import process_receipt_task
            process_receipt_task.apply(args=(receipt_id, True))  # use_v5=True
            return {"queued": True, "eager": True, "reprocessed": True}
            
        logger.warning(f"Reprocessing queue temporarily unavailable for receipt {receipt_id}; returning deferred status. Error: {exc}")
        return {"queued": False, "deferred": True}
        
    except Exception as exc:
        # Any other error (import issues, etc.)
        logger.error(f"Unexpected error queueing OCR reprocessing task for receipt {receipt_id}: {exc}")
        return {"queued": False, "error": str(exc)}
