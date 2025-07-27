#!/usr/bin/env python3
"""
Local Testing Script for Enhanced OpenAI Service
Tests the core functionality before Heroku deployment
"""

import os
import sys
import django
from pathlib import Path

# Add backend to Python path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

def test_service_import():
    """Test that we can import the enhanced service"""
    try:
        from receipts.services.enhanced_openai_service import EnhancedOpenAIService
        print("✅ Enhanced OpenAI service imported successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import enhanced service: {e}")
        return False

def test_service_instantiation():
    """Test that we can create a service instance"""
    try:
        from receipts.services.enhanced_openai_service import EnhancedOpenAIService
        service = EnhancedOpenAIService()
        print("✅ Enhanced OpenAI service instantiated successfully")
        
        # Check if required methods exist
        required_methods = ['process_receipt_focused', 'queue_ocr_task', 'upload_to_cloudinary']
        for method in required_methods:
            if hasattr(service, method):
                print(f"✅ Method {method} exists")
            else:
                print(f"❌ Method {method} missing")
                return False
        return True
    except Exception as e:
        print(f"❌ Failed to instantiate service: {e}")
        return False

def test_environment_variables():
    """Test critical environment variables"""
    print("\n🔧 Environment Variables Check:")
    
    required_vars = {
        'OPENAI_API_KEY': 'OpenAI API Key',
        'CLOUDINARY_CLOUD_NAME': 'Cloudinary Cloud Name',
        'CLOUDINARY_API_KEY': 'Cloudinary API Key',
        'CLOUDINARY_API_SECRET': 'Cloudinary API Secret'
    }
    
    all_set = True
    for var, description in required_vars.items():
        if os.environ.get(var):
            print(f"✅ {description} is set")
        else:
            print(f"⚠️  {description} ({var}) is not set")
            all_set = False
    
    return all_set

def test_django_models():
    """Test Django models can be imported"""
    try:
        from receipts.models import Receipt
        print("✅ Receipt model imported successfully")
        
        # Test model fields
        receipt_fields = [f.name for f in Receipt._meta.fields]
        expected_fields = ['id', 'user', 'image', 'cloudinary_url', 'vendor', 'total_amount']
        
        for field in expected_fields:
            if field in receipt_fields:
                print(f"✅ Receipt model has {field} field")
            else:
                print(f"⚠️  Receipt model missing {field} field")
        
        return True
    except Exception as e:
        print(f"❌ Failed to import Receipt model: {e}")
        return False

def test_django_views():
    """Test Django views can be imported"""
    try:
        from receipts.views import ReceiptListCreateView, ReceiptDetailView
        print("✅ Receipt views imported successfully")
        return True
    except Exception as e:
        print(f"❌ Failed to import receipt views: {e}")
        return False

def main():
    print("🧪 Smart Accounting - Local Service Test")
    print("=" * 50)
    
    tests = [
        ("Service Import", test_service_import),
        ("Service Instantiation", test_service_instantiation),
        ("Environment Variables", test_environment_variables),
        ("Django Models", test_django_models),
        ("Django Views", test_django_views)
    ]
    
    results = []
    for test_name, test_func in tests:
        print(f"\n📋 Testing: {test_name}")
        print("-" * 30)
        try:
            result = test_func()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test_name} failed with exception: {e}")
            results.append(False)
    
    # Summary
    print(f"\n🎯 Test Summary")
    print("=" * 50)
    passed = sum(results)
    total = len(results)
    
    if passed == total:
        print(f"✅ All {total} tests passed! System ready for deployment.")
        return True
    else:
        print(f"❌ {passed}/{total} tests passed. Fix issues before deployment.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
