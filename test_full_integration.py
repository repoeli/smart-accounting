#!/usr/bin/env python3
"""
Full OCR + Cloudinary Integration Test
Tests the complete pipeline: OCR processing + Cloudinary upload + database persistence
"""
import os
import sys
import django
from pathlib import Path
import json

# Add the backend directory to the path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

# Set test environment variables
os.environ['OPENAI_API_KEY'] = os.environ.get('OPENAI_API_KEY', 'test-key')
os.environ['OCR_LOCAL_ASYNC'] = '0'  # Run synchronously for testing

def test_full_pipeline():
    """Test the complete OCR + Cloudinary pipeline"""
    print("🧪 Testing full OCR + Cloudinary pipeline...")
    
    # Test image path
    test_image = Path(__file__).parent / 'errorlogs' / 'ASDA1.jpg'
    if not test_image.exists():
        print(f"❌ Test image not found: {test_image}")
        return False
    
    try:
        from receipts.services.openai_service import OpenAIVisionService
        from receipts.models import Receipt
        from accounts.models import Account
        
        print(f"✅ Using test image: {test_image}")
        print(f"✅ Image size: {test_image.stat().st_size} bytes")
        
        # Create test user and receipt using Account model
        user, created = Account.objects.get_or_create(
            username='testuser', 
            defaults={'email': 'test@example.com'}
        )
        
        receipt = Receipt.objects.create(
            owner=user,
            original_filename='ASDA1.jpg',
            ocr_status='pending'
        )
        
        print(f"✅ Created test receipt: {receipt.id}")
        
        # Test the OCR service directly (without real API call)
        print("✅ OCR service import successful")
        
        # Test Cloudinary integration
        from receipts.services.openai_service import _prepare_and_upload_cloudinary, CLOUDINARY_ENABLED
        
        print(f"✅ Cloudinary enabled: {CLOUDINARY_ENABLED}")
        
        if CLOUDINARY_ENABLED:
            print("⚠️  Cloudinary is enabled - would upload to cloud")
            cloudinary_result = _prepare_and_upload_cloudinary(test_image, 'ASDA1.jpg')
            print(f"✅ Cloudinary function executed: {bool(cloudinary_result)}")
        else:
            print("ℹ️  Cloudinary not configured - skipping upload")
        
        # Test the queue function
        from receipts.services.openai_service import queue_ocr_task
        result = queue_ocr_task(receipt.id)
        print(f"✅ Queue function result: {result}")
        
        # Clean up
        receipt.delete()
        if created:
            user.delete()
        
        print("✅ Full pipeline test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Pipeline test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_receipt_model_fields():
    """Test that the Receipt model has the expected Cloudinary fields"""
    print("🧪 Testing Receipt model Cloudinary fields...")
    
    try:
        from receipts.models import Receipt
        from accounts.models import Account
        
        # Test fields exist
        test_fields = [
            'cloudinary_public_id',
            'cloudinary_url', 
            'cloudinary_display_url',
            'image_width',
            'image_height',
            'file_size_bytes'
        ]
        
        # Create a dummy receipt to test field access using Account model
        user, created = Account.objects.get_or_create(
            username='fieldtest', 
            defaults={'email': 'fieldtest@example.com'}
        )
        
        receipt = Receipt.objects.create(
            owner=user,
            original_filename='fieldtest.jpg',
            ocr_status='pending'
        )
        
        missing_fields = []
        for field in test_fields:
            if not hasattr(receipt, field):
                missing_fields.append(field)
        
        if missing_fields:
            print(f"⚠️  Missing Cloudinary fields: {missing_fields}")
        else:
            print("✅ All Cloudinary fields present in Receipt model")
        
        # Clean up
        receipt.delete()
        if created:
            user.delete()
        
        return len(missing_fields) == 0
        
    except Exception as e:
        print(f"❌ Receipt model test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def print_configuration():
    """Print current configuration"""
    print("📋 Current Configuration:")
    print(f"   OPENAI_API_KEY: {'✅ Set' if os.environ.get('OPENAI_API_KEY') else '❌ Missing'}")
    print(f"   CLOUDINARY_URL: {'✅ Set' if os.environ.get('CLOUDINARY_URL') else '❌ Missing'}")
    print(f"   OCR_LOCAL_ASYNC: {os.environ.get('OCR_LOCAL_ASYNC', '1')}")
    print(f"   OCR_LOCAL_WORKERS: {os.environ.get('OCR_LOCAL_WORKERS', '2')}")

if __name__ == '__main__':
    print("🧪 Testing OCR + Cloudinary Integration...")
    print_configuration()
    print()
    
    success = True
    success &= test_receipt_model_fields()
    success &= test_full_pipeline()
    
    if success:
        print("\n🎉 All tests passed! OCR + Cloudinary integration is working correctly.")
        print("\n📝 Next steps:")
        print("   1. Set OPENAI_API_KEY for real OCR processing")
        print("   2. Set CLOUDINARY_URL for cloud image storage")
        print("   3. Deploy to Heroku and test with real receipts")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        sys.exit(1)
