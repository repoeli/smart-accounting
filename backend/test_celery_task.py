#!/usr/bin/env python
"""
Test script to manually trigger Celery OCR task processing
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from receipts.models import Receipt
from receipts.tasks import process_receipt_task
from receipts.services.openai_service import queue_ocr_task

def test_manual_queue():
    """Test manual task queuing"""
    print("=== Manual Task Queue Test ===")
    
    # Find a recent receipt with 'processing' status
    recent_receipts = Receipt.objects.filter(
        ocr_status__in=['processing', 'queued', 'failed']
    ).order_by('-uploaded_at')[:5]
    
    if not recent_receipts:
        print("No receipts found with processing/queued/failed status")
        return
    
    for receipt in recent_receipts:
        print(f"\nReceipt ID: {receipt.id}")
        print(f"Status: {receipt.ocr_status}")
        print(f"File: {receipt.original_filename}")
        print(f"Uploaded: {receipt.uploaded_at}")
        
        # Try to queue the task
        print("Attempting to queue OCR task...")
        result = queue_ocr_task(receipt.id)
        print(f"Queue result: {result}")
        
        if result.get('queued'):
            print("✅ Task queued successfully!")
        else:
            print("❌ Task queuing failed")
            if result.get('deferred'):
                print("  - Queue is busy, will retry")
            if result.get('eager'):
                print("  - Task ran eagerly (synchronously)")

def test_direct_task():
    """Test direct task execution"""
    print("\n=== Direct Task Execution Test ===")
    
    # Find a recent receipt
    recent_receipt = Receipt.objects.filter(
        ocr_status__in=['processing', 'queued', 'failed']
    ).order_by('-uploaded_at').first()
    
    if not recent_receipt:
        print("No suitable receipt found")
        return
    
    print(f"Testing direct execution on receipt {recent_receipt.id}")
    print(f"Original status: {recent_receipt.ocr_status}")
    
    try:
        # Execute the task directly
        result = process_receipt_task(recent_receipt.id)
        print(f"Task result: {result}")
        
        # Check updated status
        recent_receipt.refresh_from_db()
        print(f"New status: {recent_receipt.ocr_status}")
        
        if result.get('success'):
            print("✅ Task executed successfully!")
            print(f"Extracted data: {recent_receipt.extracted_data}")
        else:
            print("❌ Task execution failed")
            print(f"Error: {result.get('error')}")
            
    except Exception as e:
        print(f"❌ Exception during task execution: {e}")

if __name__ == "__main__":
    print("Celery Task Test Starting...\n")
    
    test_manual_queue()
    test_direct_task()
    
    print("\nTest completed!")
