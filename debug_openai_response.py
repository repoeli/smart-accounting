#!/usr/bin/env python3
"""
Debug script to see what OpenAI is actually returning
"""
import os
import sys
import asyncio
import json
from pathlib import Path

# Load environment from .env file
def load_env_file():
    env_file = Path(__file__).parent / '.env'
    if env_file.exists():
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ[key.strip()] = value.strip()

load_env_file()

# Map OPEN_AI_API_KEY to OPENAI_API_KEY for compatibility
if 'OPEN_AI_API_KEY' in os.environ and 'OPENAI_API_KEY' not in os.environ:
    os.environ['OPENAI_API_KEY'] = os.environ['OPEN_AI_API_KEY']

# Add backend to path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Configure minimal Django settings
try:
    from django.conf import settings
    if not settings.configured:
        settings.configure(
            OPENAI_API_KEY=os.getenv('OPENAI_API_KEY'),
            DEBUG=False
        )
except ImportError:
    # Create a settings shim if Django not available
    class Settings:
        OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    
    import types
    django_module = types.ModuleType('django')
    conf_module = types.ModuleType('django.conf')
    conf_module.settings = Settings()
    django_module.conf = conf_module
    
    sys.modules['django'] = django_module
    sys.modules['django.conf'] = conf_module

# Now we can import our service
from receipts.services.openai_service import OpenAIVisionService

async def debug_response(receipt_path=None):
    """Debug what OpenAI is actually returning."""
    print("🔍 Debugging OpenAI Response Format")
    print("=" * 50)
    
    service = OpenAIVisionService()
    
    if not receipt_path:
        receipt_path = 'errorlogs/ASDA1.jpg'
    
    if not Path(receipt_path).exists():
        print(f"❌ Receipt not found: {receipt_path}")
        return
    
    print(f"📄 Processing: {Path(receipt_path).name}")
    print("=" * 50)
    
    try:
        with open(receipt_path, 'rb') as f:
            result = await service.process_receipt(f, Path(receipt_path).name)
        
        print("📄 Raw OpenAI Response Structure:")
        print("=" * 50)
        print(json.dumps(result, indent=2, default=str))
        
        print("\n🔍 Key Analysis:")
        print(f"vendor_name type: {type(result.get('vendor_name'))}")
        print(f"vendor_name value: {result.get('vendor_name')}")
        print(f"total_amount type: {type(result.get('total_amount'))}")
        print(f"total_amount value: {result.get('total_amount')}")
        print(f"line_items count: {len(result.get('line_items', []))}")
        
        # Check if there are other vendor/total keys
        print("\n🔍 All keys containing 'vendor' or 'total':")
        for key, value in result.items():
            if 'vendor' in key.lower() or 'total' in key.lower():
                print(f"  {key}: {value} ({type(value)})")
        
        # Check for nested structures
        if isinstance(result.get('vendor_name'), dict):
            print("\n🔍 Vendor is a dict - checking nested structure:")
            for key, value in result['vendor_name'].items():
                print(f"  vendor.{key}: {value}")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    # Get receipt path from command line
    receipt_path = sys.argv[1] if len(sys.argv) > 1 else None
    asyncio.run(debug_response(receipt_path))
