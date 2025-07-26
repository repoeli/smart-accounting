#!/usr/bin/env python3
"""
Test OCR functionality after OpenAI API key update
"""
import requests
import json
import os
from pathlib import Path

# API Configuration
API_BASE_URL = "https://smart-backend-8c9b4bdab3b4.herokuapp.com/api"
RECEIPT_IMAGE_PATH = "errorlogs/receipt-starbucks-beverage.jpeg"

def test_receipt_upload():
    """Test receipt upload and OCR extraction"""
    
    # Check if image exists
    image_path = Path(RECEIPT_IMAGE_PATH)
    if not image_path.exists():
        print(f"❌ Image not found: {image_path}")
        return False
    
    print(f"📄 Testing OCR with: {image_path}")
    
    # Prepare the file upload
    with open(image_path, 'rb') as f:
        files = {
            'image': ('receipt.jpeg', f, 'image/jpeg')
        }
        
        # Test the receipt upload endpoint
        try:
            print("🔄 Uploading receipt to backend...")
            response = requests.post(
                f"{API_BASE_URL}/receipts/",
                files=files,
                timeout=60  # OCR can take some time
            )
            
            print(f"📊 Response status: {response.status_code}")
            
            if response.status_code == 200 or response.status_code == 201:
                receipt_data = response.json()
                print("✅ Receipt uploaded successfully!")
                print("\n📋 Extracted data:")
                print(f"   Total: £{receipt_data.get('total_amount', 'N/A')}")
                print(f"   Merchant: {receipt_data.get('merchant_name', 'N/A')}")
                print(f"   Date: {receipt_data.get('date', 'N/A')}")
                
                # Check if we got real data (not -£0.00)
                total_amount = receipt_data.get('total_amount', 0)
                if total_amount and float(total_amount) > 0:
                    print("🎉 OCR is working! Real data extracted!")
                    return True
                else:
                    print("⚠️  OCR may not be working - got zero or negative amount")
                    return False
                    
            else:
                print(f"❌ Upload failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Request error: {e}")
            return False
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            return False

def test_backend_health():
    """Test if backend is responding"""
    try:
        response = requests.get(f"{API_BASE_URL}/receipts/", timeout=10)
        print(f"🏥 Backend health: {response.status_code}")
        return response.status_code in [200, 401]  # 401 is expected without auth
    except Exception as e:
        print(f"❌ Backend health check failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing Receipt OCR Functionality")
    print("=" * 50)
    
    # Test backend health first
    if not test_backend_health():
        print("❌ Backend is not responding. Exiting.")
        exit(1)
    
    # Test OCR
    success = test_receipt_upload()
    
    if success:
        print("\n🎉 SUCCESS: OCR is working correctly!")
    else:
        print("\n❌ FAILED: OCR may still have issues")
    
    print("\n💡 Next steps:")
    print("   - Try uploading via the frontend to confirm")
    print("   - Check Heroku logs for any errors")
    print("   - Verify the OPENAI_API_KEY is correctly set")
