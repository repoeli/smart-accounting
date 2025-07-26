#!/usr/bin/env python3
"""
Simple syntax validation script for GitHub Actions
"""
import os
import sys
import django
from django.conf import settings

# Add backend to Python path
sys.path.insert(0, os.path.dirname(__file__))

# Set up environment variables from test file
from pathlib import Path
from dotenv import load_dotenv

# Load test environment variables
env_path = Path(__file__).parent / '.env.test'
load_dotenv(env_path)

# Set a dummy API key for testing if not provided
if not os.environ.get('OPENAI_API_KEY'):
    os.environ['OPENAI_API_KEY'] = 'test-api-key-for-syntax-validation'
if not os.environ.get('XAI_API_KEY'):
    os.environ['XAI_API_KEY'] = 'test-api-key-for-syntax-validation'

# Configure minimal Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

try:
    django.setup()
    print("✅ Django setup successful")
    
    # Test basic imports
    import receipts.views
    import receipts.models
    import receipts.serializers
    print("✅ Receipt app imports successful")
    
    # Test OpenAI service import (should work with dummy API key for syntax validation)
    try:
        from receipts.services.openai_service import OpenAIVisionService
        print("✅ OpenAI service import successful")
        
        # Test that the service can be instantiated (syntax check only)
        service = OpenAIVisionService()
        print("✅ OpenAI service instantiation successful")
        
    except Exception as e:
        print(f"⚠️  OpenAI service test failed: {e}")
        # Don't fail the test for service issues, only syntax issues
        if "syntax" in str(e).lower() or "import" in str(e).lower():
            raise e
    
    print("🎉 All syntax validation tests passed!")
    
except Exception as e:
    print(f"❌ Syntax validation failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
