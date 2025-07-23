"""
Celery Tasks for Background Receipt OCR Processing
Optimized for Heroku deployment with high concurrency
"""
import asyncio
import logging
from typing import Dict, Any, List
from celery import shared_task
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from decimal import Decimal
import json
from datetime import datetime

from .models import Receipt
from .services.vision_api_router import VisionAPIRouter

logger = logging.getLogger(__name__)

# Create a single router instance for task processing with error handling
router = None
router_error = None

def get_router():
    """Get the VisionAPIRouter instance, initializing if needed"""
    global router, router_error
    
    if router is not None:
        return router
    
    if router_error is not None:
        # Don't retry if we already failed
        raise Exception(f"VisionAPIRouter initialization previously failed: {router_error}")
    
    try:
        from .services.vision_api_router import VisionAPIRouter
        router = VisionAPIRouter()
        logger.info("VisionAPIRouter initialized successfully")
        return router
    except Exception as e:
        router_error = str(e)
        logger.error(f"Failed to initialize VisionAPIRouter: {e}")
        raise Exception(f"VisionAPIRouter initialization failed: {e}")

# Try to initialize router on import, but don't fail if it doesn't work
try:
    router = get_router()
except Exception as e:
    logger.warning(f"Initial router initialization failed: {e}. Will retry on task execution.")
    router = None

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def process_receipt_task(self, receipt_id: int, use_v5: bool = True) -> Dict[str, Any]:
    """
    Background task to process a single receipt with OCR
    
    Args:
        receipt_id: Database ID of the receipt to process
        use_v5: Whether to use v0.5 optimizations (default: True)
    
    Returns:
        Dict containing processing results and metadata
    """
    try:
        # Get router instance (will initialize if needed)
        try:
            current_router = get_router()
        except Exception as e:
            error_msg = f"VisionAPIRouter is not available: {str(e)}"
            logger.error(error_msg)
            
            # Update receipt status to failed
            try:
                receipt = Receipt.objects.get(id=receipt_id)
                receipt.status = 'failed'
                receipt.error_message = error_msg
                receipt.save()
            except:
                pass
            
            return {
                'success': False,
                'error': error_msg,
                'receipt_id': receipt_id
            }
        
        # Get receipt from database
        receipt = Receipt.objects.get(id=receipt_id)
        
        # Update status to processing
        receipt.status = 'processing'
        receipt.save()
        
        logger.info(f"Starting OCR processing for receipt {receipt_id}")
        
        # Create event loop for async processing
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # Process with router (handles API selection and fallback)
            if use_v5:
                # Use v0.5 method for enhanced processing
                result = loop.run_until_complete(
                    current_router.openai_service.process_receipt_v5(
                        receipt.image.file, 
                        receipt.filename or f"receipt_{receipt_id}"
                    )
                )
            else:
                # Use standard processing
                result = loop.run_until_complete(
                    current_router.process_receipt(
                        receipt.image.file, 
                        receipt.filename or f"receipt_{receipt_id}"
                    )
                )
            
            # Update receipt with extracted data
            if result.get('success'):
                extracted_data = result.get('extracted_data', {})
                
                # Update receipt fields
                receipt.total_amount = Decimal(str(extracted_data.get('total', 0)))
                receipt.tax_amount = Decimal(str(extracted_data.get('tax_amount', 0)))
                receipt.merchant_name = extracted_data.get('merchant_name', '')
                receipt.receipt_date = extracted_data.get('date')
                receipt.currency = extracted_data.get('currency', 'GBP')
                receipt.extracted_data = extracted_data
                receipt.status = 'completed'
                
                # Store API metadata
                receipt.api_used = result.get('api_used', 'unknown')
                receipt.processing_time = result.get('processing_time', 0)
                receipt.confidence_score = result.get('confidence_score', 0)
                
                logger.info(f"Successfully processed receipt {receipt_id} with {receipt.api_used}")
                
            else:
                receipt.status = 'failed'
                receipt.error_message = result.get('error', 'Unknown processing error')
                logger.error(f"Failed to process receipt {receipt_id}: {receipt.error_message}")
            
            receipt.save()
            
            return {
                'success': result.get('success', False),
                'receipt_id': receipt_id,
                'api_used': result.get('api_used'),
                'processing_time': result.get('processing_time'),
                'tokens_used': result.get('tokens_used'),
                'cost': float(result.get('cost', 0)),
                'extracted_data': result.get('extracted_data', {})
            }
            
        finally:
            loop.close()
            
    except Receipt.DoesNotExist:
        error_msg = f"Receipt {receipt_id} not found"
        logger.error(error_msg)
        return {'success': False, 'error': error_msg}
        
    except Exception as exc:
        # Log the error and retry if we haven't exceeded max retries
        logger.error(f"Error processing receipt {receipt_id}: {str(exc)}")
        
        # Update receipt status to failed on final retry
        try:
            receipt = Receipt.objects.get(id=receipt_id)
            receipt.status = 'failed'
            receipt.error_message = str(exc)
            receipt.save()
        except:
            pass
        
        # Retry the task if we haven't hit the limit
        if self.request.retries < self.max_retries:
            logger.info(f"Retrying receipt {receipt_id} (attempt {self.request.retries + 1})")
            raise self.retry(countdown=60 * (self.request.retries + 1), exc=exc)
        
        return {
            'success': False, 
            'receipt_id': receipt_id,
            'error': str(exc),
            'retries': self.request.retries
        }

@shared_task(bind=True)
def batch_process_receipts(self, receipt_ids: List[int], use_v5: bool = True) -> Dict[str, Any]:
    """
    Background task to process multiple receipts concurrently
    
    Args:
        receipt_ids: List of receipt IDs to process
        use_v5: Whether to use v0.5 optimizations
    
    Returns:
        Dict containing batch processing results
    """
    results = []
    successful = 0
    failed = 0
    
    logger.info(f"Starting batch processing of {len(receipt_ids)} receipts")
    
    # Process receipts concurrently using Celery's group
    from celery import group
    
    # Create a group of tasks
    job = group(process_receipt_task.s(receipt_id, use_v5) for receipt_id in receipt_ids)
    result_group = job.apply_async()
    
    # Wait for all tasks to complete
    batch_results = result_group.get()
    
    # Aggregate results
    for result in batch_results:
        results.append(result)
        if result.get('success'):
            successful += 1
        else:
            failed += 1
    
    logger.info(f"Batch processing completed: {successful} successful, {failed} failed")
    
    return {
        'success': True,
        'total_processed': len(receipt_ids),
        'successful': successful,
        'failed': failed,
        'results': results
    }

@shared_task
def cleanup_temp_files():
    """
    Background task to clean up temporary files and old processed receipts
    Runs periodically to maintain storage limits on Heroku
    """
    import os
    from django.conf import settings
    from datetime import datetime, timedelta
    
    logger.info("Starting cleanup of temporary files")
    
    cleaned_count = 0
    
    try:
        # Clean up old receipts (older than 30 days for demo, adjust as needed)
        cutoff_date = datetime.now() - timedelta(days=30)
        old_receipts = Receipt.objects.filter(
            uploaded_at__lt=cutoff_date,
            status__in=['completed', 'failed']
        )
        
        for receipt in old_receipts:
            if receipt.image:
                # Delete the file from storage
                try:
                    default_storage.delete(receipt.image.name)
                    cleaned_count += 1
                except:
                    pass
        
        # Delete the receipt records
        deleted_count = old_receipts.delete()[0]
        
        logger.info(f"Cleanup completed: {cleaned_count} files deleted, {deleted_count} records removed")
        
        return {
            'success': True,
            'files_deleted': cleaned_count,
            'records_deleted': deleted_count
        }
        
    except Exception as exc:
        logger.error(f"Error during cleanup: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }

@shared_task
def update_performance_stats():
    """
    Background task to update performance statistics and monitoring data
    """
    from .services.performance_optimizer import PerformanceOptimizer
    
    try:
        optimizer = PerformanceOptimizer()
        stats = optimizer.get_recent_performance()
        
        logger.info(f"Performance stats updated: {len(stats)} APIs monitored")
        
        return {
            'success': True,
            'stats_updated': len(stats),
            'timestamp': datetime.now().isoformat()
        }
        
    except Exception as exc:
        logger.error(f"Error updating performance stats: {str(exc)}")
        return {
            'success': False,
            'error': str(exc)
        }
