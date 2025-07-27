#!/usr/bin/env python3
"""
Direct test of the OpenAI OCR service without Heroku deployment.
This will test the OCR functionality locally using the OpenAI service.
"""

import os
import sys
import asyncio
from pathlib import Path
import django

# Add the backend directory to Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from receipts.services.openai_service import OpenAIService


async def test_ocr_service():
    """Test the OCR service directly."""
    print("🧪 Testing OpenAI OCR Service Directly...")
    print("=" * 50)
    
    # Initialize the service
    try:
        service = OpenAIService()
        print("✅ OpenAI Service initialized successfully")
    except Exception as e:
        print(f"❌ Failed to initialize OpenAI Service: {e}")
        return
    
    # Test with a sample receipt image
    test_images = [
        "errorlogs/ASDA1.jpg",
        "errorlogs/bill-ace-hardware.jpg", 
        "errorlogs/cpg-receipt-grocery.jpg",
        "errorlogs/receipt-himawari-food.jpeg",
        "errorlogs/receipt-lowes-hardware.jpeg",
        "errorlogs/receipt-starbucks-beverage.jpeg"
    ]
    
    for image_path in test_images:
        full_path = Path(__file__).parent / image_path
        if full_path.exists():
            print(f"\n📸 Testing with image: {image_path}")
            try:
                with open(full_path, 'rb') as image_file:
                    result = await service.process_receipt(
                        image_file, 
                        filename=image_path,
                        high_res=True
                    )
                
                print(f"✅ OCR Success!")
                print(f"   Merchant: {result.get('merchant', 'N/A')}")
                print(f"   Total: {result.get('total', 'N/A')}")
                print(f"   Date: {result.get('date', 'N/A')}")
                print(f"   Items: {len(result.get('items', []))}")
                
                if result.get('items'):
                    print("   Sample items:")
                    for item in result.get('items', [])[:3]:
                        print(f"     - {item.get('name', 'N/A')}: {item.get('price', 'N/A')}")
                
                return  # Exit after first successful test
                
            except Exception as e:
                print(f"❌ OCR failed for {image_path}: {e}")
                continue
    
    print("\n❌ No test images found or all tests failed")


async def test_queue_functionality():
    """Test the queuing functionality."""
    print("\n🔄 Testing Queue Functionality...")
    print("=" * 50)
    
    from receipts.services.openai_service import queue_ocr_task
    
    try:
        # Create a dummy receipt for testing
        from receipts.models import Receipt
        from django.contrib.auth.models import User
        
        # Get or create a test user
        user, created = User.objects.get_or_create(
            username='test_user',
            defaults={'email': 'test@example.com'}
        )
        
        # Create a test receipt
        receipt = Receipt.objects.create(
            user=user,
            original_filename='test_receipt.jpg',
            ocr_status='queued'
        )
        
        print(f"✅ Created test receipt with ID: {receipt.id}")
        
        # Test the queue function
        result = queue_ocr_task(receipt.id)
        print(f"✅ Queue function returned: {result}")
        
        # Check the receipt status
        receipt.refresh_from_db()
        print(f"📊 Receipt status after queuing: {receipt.ocr_status}")
        
    except Exception as e:
        print(f"❌ Queue test failed: {e}")


def main():
    """Main test function."""
    print("🚀 Starting OCR Service Tests...")
    print("=" * 60)
    
    # Run async tests
    asyncio.run(test_ocr_service())
    asyncio.run(test_queue_functionality())
    
    print("\n✨ Testing complete!")


if __name__ == "__main__":
    main()
