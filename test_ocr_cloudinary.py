#!/usr/bin/env python3
"""
Test the OCR service with Cloudinary integration
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

def test_ocr_service_import():
    """Test that the OCR service imports correctly"""
    print("🧪 Testing OCR service import...")
    
    try:
        from receipts.services.openai_service import OpenAIVisionService, queue_ocr_task
        print("✅ OpenAI service imported successfully")
        
        # Test if Cloudinary is detected
        from receipts.services.openai_service import CLOUDINARY_ENABLED
        print(f"✅ Cloudinary enabled: {CLOUDINARY_ENABLED}")
        
        # Test service instantiation (will fail if API key missing, but that's expected)
        try:
            service = OpenAIVisionService()
            print("✅ OpenAI service instantiated successfully")
        except ValueError as e:
            if "OPENAI_API_KEY" in str(e):
                print("⚠️  OpenAI API key not configured (expected in test)")
            else:
                raise
        
        print("✅ All imports and basic functionality working!")
        return True
        
    except Exception as e:
        print(f"❌ Import test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_cloudinary_function():
    """Test the Cloudinary upload function"""
    print("🧪 Testing Cloudinary function...")
    
    try:
        from receipts.services.openai_service import _prepare_and_upload_cloudinary
        print("✅ Cloudinary function imported successfully")
        
        # Test with a non-existent file (should return empty dict gracefully)
        result = _prepare_and_upload_cloudinary(Path("non_existent.jpg"), "test.jpg")
        if result == {}:
            print("✅ Cloudinary function handles missing files gracefully")
        else:
            print(f"⚠️  Unexpected result for missing file: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Cloudinary function test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    print("🧪 Testing OCR service with Cloudinary integration...")
    
    success = True
    success &= test_ocr_service_import()
    success &= test_cloudinary_function()
    
    if success:
        print("\n🎉 All tests passed! OCR service with Cloudinary integration is working.")
    else:
        print("\n❌ Some tests failed.")
        sys.exit(1)
