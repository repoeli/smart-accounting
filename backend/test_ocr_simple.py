#!/usr/bin/env python3
"""
Test the OCR service using Django shell commands
"""

# Test script to run with: python manage.py shell < test_ocr_simple.py

import os
import asyncio
from pathlib import Path

# Test the OpenAI service directly
print("🧪 Testing OpenAI OCR Service...")

try:
    from receipts.services.openai_service import OpenAIService, queue_ocr_task
    from receipts.models import Receipt
    from django.contrib.auth.models import User
    
    print("✅ Successfully imported OCR service")
    
    # Test 1: Initialize service
    service = OpenAIService()
    print("✅ OpenAI Service initialized")
    
    # Test 2: Check if we have test images
    test_images = [
        "errorlogs/ASDA1.jpg",
        "errorlogs/receiptify-2.jpg"
    ]
    
    for image_path in test_images:
        full_path = Path(image_path)
        if full_path.exists():
            print(f"📸 Found test image: {image_path}")
            break
    else:
        print("⚠️  No test images found")
    
    # Test 3: Test queue function
    print("🔄 Testing queue functionality...")
    
    # Get or create test user
    user, created = User.objects.get_or_create(
        username='test_user_ocr',
        defaults={'email': 'test_ocr@example.com'}
    )
    print(f"{'✅ Created' if created else '✅ Found'} test user: {user.username}")
    
    # Create test receipt
    receipt = Receipt.objects.create(
        user=user,
        original_filename='test_direct.jpg',
        ocr_status='queued'
    )
    print(f"✅ Created test receipt ID: {receipt.id}")
    
    # Test queue function
    result = queue_ocr_task(receipt.id)
    print(f"✅ Queue result: {result}")
    
    # Check final status
    receipt.refresh_from_db()
    print(f"📊 Final receipt status: {receipt.ocr_status}")
    
    print("\n🎉 All tests completed successfully!")
    
except Exception as e:
    print(f"❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
