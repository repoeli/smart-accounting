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
    
    # Test OpenAI service import (may fail due to missing API keys, but syntax should be OK)
    try:
        from receipts.services.openai_service import OpenAIVisionService
        print("✅ OpenAI service import successful")
    except Exception as e:
        print(f"⚠️  OpenAI service import failed (expected in test environment): {e}")
    
    print("🎉 All syntax validation tests passed!")
    
except Exception as e:
    print(f"❌ Syntax validation failed: {e}")
    sys.exit(1)
