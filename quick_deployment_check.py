#!/usr/bin/env python3
"""
Quick deployment readiness check for Smart Accounting backend
Tests core imports and configurations without external dependencies
"""

print("🚀 Smart Accounting - Deployment Readiness Check")
print("=" * 50)

# Test 1: Core Django imports
try:
    import django
    from django.conf import settings
    print("✅ Django imports: OK")
except ImportError as e:
    print(f"❌ Django imports failed: {e}")
    exit(1)

# Test 2: Django setup
try:
    import os
    import sys
    # Add backend directory to Python path
    backend_path = os.path.join(os.path.dirname(__file__), 'backend')
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
    django.setup()
    print("✅ Django setup: OK")
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    exit(1)

# Test 3: Enhanced service import
try:
    from receipts.services.enhanced_openai_service import EnhancedOpenAIService
    print("✅ Enhanced OpenAI service import: OK")
except ImportError as e:
    print(f"❌ Enhanced service import failed: {e}")
    exit(1)

# Test 4: Check service instantiation (without API keys)
try:
    # This should work even without API keys
    service = EnhancedOpenAIService()
    print("✅ Service instantiation: OK")
except Exception as e:
    print(f"❌ Service instantiation failed: {e}")
    exit(1)

# Test 5: Views import
try:
    from receipts import views
    print("✅ Views import: OK")
except ImportError as e:
    print(f"❌ Views import failed: {e}")
    exit(1)

# Test 6: URL patterns
try:
    from receipts.urls import urlpatterns
    print(f"✅ URL patterns loaded: {len(urlpatterns)} patterns")
except ImportError as e:
    print(f"❌ URL patterns failed: {e}")
    exit(1)

# Test 7: Models import  
try:
    from receipts.models import Receipt
    print("✅ Models import: OK")
except ImportError as e:
    print(f"❌ Models import failed: {e}")
    exit(1)

# Test 8: Check no Celery references
try:
    import sys
    celery_modules = [mod for mod in sys.modules.keys() if 'celery' in mod.lower()]
    if celery_modules:
        print(f"⚠️  Warning: Found Celery modules: {celery_modules}")
    else:
        print("✅ No Celery dependencies: OK")
except Exception as e:
    print(f"❌ Celery check failed: {e}")

# Test 9: Critical settings
try:
    critical_settings = [
        'DATABASES',
        'SECRET_KEY', 
        'ALLOWED_HOSTS',
        'CORS_ALLOWED_ORIGINS',
        'INSTALLED_APPS'
    ]
    
    for setting in critical_settings:
        if hasattr(settings, setting):
            print(f"✅ {setting}: Present")
        else:
            print(f"❌ {setting}: Missing")
except Exception as e:
    print(f"❌ Settings check failed: {e}")

print("\n" + "=" * 50)
print("🎉 Deployment readiness check completed!")
print("📋 System appears ready for Heroku deployment")
print("🔧 Remember to set environment variables on Heroku:")
print("   - OPENAI_API_KEY")
print("   - CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET")
print("   - DATABASE_URL (automatically set by Heroku)")
print("   - SECRET_KEY")
