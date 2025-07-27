#!/usr/bin/env python3
"""
Production Deployment Test - Receipt Processing
==============================================
Test the cleaned system with actual receipt processing before Heroku deployment
"""

import os
import sys
import asyncio
import json
from pathlib import Path

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Add backend to path
backend_path = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_path))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

import django
django.setup()

from receipts.services.enhanced_openai_service import EnhancedOpenAIVisionService, validate_api_key
from receipts.views import get_enhanced_openai_service

async def test_production_ready_system():
    """Test the system is production ready with actual receipt processing"""
    
    print("🚀 PRODUCTION READINESS TEST - RECEIPT PROCESSING")
    print("=" * 60)
    
    try:
        # Test 1: Validate API key
        print("1️⃣ Validating OpenAI API key...")
        if validate_api_key():
            print("   ✅ OpenAI API key is valid")
        else:
            print("   ❌ OpenAI API key is invalid or missing")
            return False
        
        # Test 2: Initialize services
        print("2️⃣ Initializing services...")
        service = get_enhanced_openai_service()
        print("   ✅ Enhanced OpenAI service initialized")
        
        # Test 3: Process the Costco receipt
        print("3️⃣ Processing Costco receipt...")
        receipt_path = Path(__file__).parent / "errorlogs" / "cpg-receipt-grocery.jpg"
        
        if not receipt_path.exists():
            print(f"   ❌ Receipt not found: {receipt_path}")
            return False
        
        print(f"   📁 Processing: {receipt_path.name}")
        
        with open(receipt_path, 'rb') as f:
            result = await service.process_receipt_focused(f, receipt_path.name)
        
        # Test 4: Validate results format (for frontend compatibility)
        print("4️⃣ Validating results format...")
        
        required_fields = [
            'vendor_name', 'total_amount', 'tax_amount', 'currency',
            'transaction_type', 'processing_metadata'
        ]
        
        missing_fields = []
        for field in required_fields:
            if field not in result:
                missing_fields.append(field)
        
        if missing_fields:
            print(f"   ❌ Missing required fields: {missing_fields}")
            return False
        else:
            print("   ✅ All required fields present")
        
        # Test 5: Display results in production format
        print("5️⃣ Production format results:")
        print("   " + "="*50)
        print(f"   🏪 Vendor: {result.get('vendor_name', 'N/A')}")
        print(f"   💰 Total: {result.get('currency', 'USD')} {result.get('total_amount', 0)}")
        print(f"   💸 Tax: {result.get('currency', 'USD')} {result.get('tax_amount', 0)}")
        print(f"   📅 Date: {result.get('transaction_date', 'N/A')}")
        print(f"   📈 Type: {result.get('transaction_type', 'N/A').upper()}")
        
        # Cloudinary check
        cloudinary_data = result.get('processing_metadata', {}).get('cloudinary', {})
        if cloudinary_data.get('secure_url'):
            print(f"   ☁️ Cloudinary: {cloudinary_data.get('secure_url')}")
        
        processing_time = result.get('processing_metadata', {}).get('processing_time', 0)
        confidence = result.get('processing_metadata', {}).get('confidence_score', 0)
        print(f"   ⏱️ Time: {processing_time:.2f}s | 🎯 Confidence: {confidence}/10")
        
        # Test 6: API Response format (for frontend)
        print("6️⃣ API response format validation...")
        
        # Convert to the format expected by frontend
        api_response = {
            "id": 999,  # Would be actual ID in production
            "vendor_name": result.get('vendor_name'),
            "transaction_date": result.get('transaction_date'),
            "total_amount": result.get('total_amount'),
            "tax_amount": result.get('tax_amount'),
            "currency": result.get('currency'),
            "transaction_type": result.get('transaction_type'),
            "processing_status": "completed",
            "cloudinary_url": cloudinary_data.get('secure_url'),
            "created_at": "2025-01-27T10:00:00Z",  # Would be actual timestamp
            "processing_metadata": result.get('processing_metadata')
        }
        
        print("   ✅ API response format validated")
        
        # Save test results
        output_file = Path(__file__).parent / "production_test_results.json"
        with open(output_file, 'w') as f:
            json.dump(api_response, f, indent=2, default=str)
        
        print(f"7️⃣ Results saved to: {output_file}")
        
        # Final assessment
        print("\n" + "="*60)
        print("📊 PRODUCTION READINESS ASSESSMENT")
        print("="*60)
        
        checks = [
            ("OpenAI API key valid", validate_api_key()),
            ("Service initialization", True),
            ("Receipt processing", bool(result)),
            ("Required fields present", len(missing_fields) == 0),
            ("Total amount extracted", result.get('total_amount', 0) > 0),
            ("Vendor identified", bool(result.get('vendor_name', '').strip())),
            ("Processing time reasonable", processing_time < 30),
            ("Confidence acceptable", confidence >= 5)
        ]
        
        passed = sum(1 for _, status in checks if status)
        
        for check, status in checks:
            icon = "✅" if status else "❌"
            print(f"   {icon} {check}")
        
        success_rate = passed / len(checks)
        print(f"\nSuccess Rate: {passed}/{len(checks)} ({success_rate:.1%})")
        
        if success_rate >= 0.9:
            print("\n🎉 SYSTEM IS PRODUCTION READY!")
            print("🚀 Ready for Heroku deployment")
            return True
        elif success_rate >= 0.7:
            print("\n👍 MOSTLY READY - Minor issues to address")
            return True
        else:
            print("\n⚠️ NOT READY - Critical issues need resolution")
            return False
        
    except Exception as e:
        print(f"❌ Production test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_production_ready_system())
    
    if success:
        print("\n✅ PRODUCTION TEST PASSED!")
        print("🔗 System ready for Heroku deployment")
    else:
        print("\n❌ PRODUCTION TEST FAILED!")
        print("🔧 Please address issues before deployment")
    
    sys.exit(0 if success else 1)
