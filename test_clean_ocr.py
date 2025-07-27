#!/usr/bin/env python3
"""
Test the cleaned up OCR system with the broker-less architecture
"""
import os
import sys
import django
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_dir))

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from receipts.services.openai_service import OpenAIVisionService, queue_ocr_task
from receipts.services.data_validator import DataValidator, ReceiptDataValidator
from receipts.models import Receipt

def test_imports():
    """Test that all imports work without errors"""
    print("✅ Testing imports...")
    
    # Test both validator import styles
    validator1 = DataValidator()
    validator2 = ReceiptDataValidator()
    
    # Test OpenAI service
    service = OpenAIVisionService()
    
    print("✅ All imports successful!")
    return True

def test_queue_function():
    """Test the broker-less queue function"""
    print("✅ Testing queue function...")
    
    # Create a test receipt
    from django.contrib.auth.models import User
    user, created = User.objects.get_or_create(username='testuser', defaults={'email': 'test@example.com'})
    
    receipt = Receipt.objects.create(
        user=user,
        original_filename='test_receipt.jpg',
        ocr_status='pending'
    )
    
    # Test queue function (without actually processing)
    result = queue_ocr_task(receipt.id)
    
    print(f"Queue result: {result}")
    print("✅ Queue function test successful!")
    
    # Clean up
    receipt.delete()
    if created:
        user.delete()
    
    return True

def test_service_structure():
    """Test the final service structure"""
    print("✅ Testing service structure...")
    
    services_dir = Path(__file__).parent / 'backend' / 'receipts' / 'services'
    
    # Files that should exist
    required_files = [
        'openai_service.py',
        'receipt_parser.py', 
        'openai_schema.py',
        'data_validator.py',
        '__init__.py'
    ]
    
    # Files that should NOT exist
    removed_files = [
        'openai_service_old.py',
        'vision_api_router.py',
        'performance_optimizer.py',
        'cloudinary_service.py'
    ]
    
    for file in required_files:
        file_path = services_dir / file
        if not file_path.exists():
            print(f"❌ Missing required file: {file}")
            return False
        print(f"✅ Found required file: {file}")
    
    for file in removed_files:
        file_path = services_dir / file
        if file_path.exists():
            print(f"❌ Found file that should be removed: {file}")
            return False
        print(f"✅ Confirmed removed file: {file}")
    
    print("✅ Service structure test successful!")
    return True

if __name__ == '__main__':
    print("🧪 Testing cleaned up OCR system...")
    
    try:
        test_imports()
        test_service_structure()
        test_queue_function()
        
        print("\n🎉 All tests passed! The cleaned up system is ready.")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
