#!/usr/bin/env python
"""
Quick test script to trigger OCR workflow and test logging
"""
import os
import django
import logging

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from receipts.services.openai_service import OpenAIVisionService
from receipts.models import Receipt
from django.contrib.auth.models import User

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

def test_ocr_workflow():
    """Test the OCR workflow with logging"""
    logger.info("=== Testing OCR Workflow ===")
    
    # Get a recent receipt that's stuck in processing
    receipts = Receipt.objects.filter(
        ocr_status__in=['processing', 'queued', 'failed']
    ).order_by('-uploaded_at')[:3]
    
    logger.info(f"Found {receipts.count()} receipts to test")
    
    for receipt in receipts:
        logger.info(f"Receipt {receipt.id}: {receipt.original_filename}")
        logger.info(f"  Status: {receipt.ocr_status}")
        logger.info(f"  Has file: {bool(receipt.file)}")
        logger.info(f"  Has cloudinary: {bool(receipt.cloudinary_url)}")
        
        # Test the queue_ocr_task function
        service = OpenAIVisionService()
        result = service.queue_ocr_task(receipt.id)
        logger.info(f"  Queue result: {result}")
        logger.info("---")

if __name__ == "__main__":
    test_ocr_workflow()
