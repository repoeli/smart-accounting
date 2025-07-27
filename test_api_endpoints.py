#!/usr/bin/env python3
"""
Comprehensive test of the Smart Accounting API endpoints
"""

import requests
import json
import time
from pathlib import Path

# Base URL for testing
BASE_URL = "http://localhost:8000/api/v1"  # Local testing
# BASE_URL = "https://smart-accounting-backend.herokuapp.com/api/v1"  # Heroku testing

def test_api_endpoints():
    """Test all available API endpoints"""
    
    print("🚀 Testing Smart Accounting API Endpoints")
    print("=" * 60)
    
    # Test 1: Test Auth Endpoint
    print("\n1️⃣  Testing Authentication Endpoint...")
    try:
        response = requests.get(f"{BASE_URL}/receipts/test_auth/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
            print("   ✅ Auth endpoint working!")
        else:
            print(f"   ❌ Auth endpoint failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
    
    # Test 2: List Receipts
    print("\n2️⃣  Testing List Receipts...")
    try:
        response = requests.get(f"{BASE_URL}/receipts/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Found {len(data.get('results', []))} receipts")
            print("   ✅ List receipts working!")
        else:
            print(f"   ❌ List receipts failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
    
    # Test 3: Dashboard
    print("\n3️⃣  Testing Dashboard...")
    try:
        response = requests.get(f"{BASE_URL}/receipts/dashboard/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Dashboard data keys: {list(data.keys())}")
            print("   ✅ Dashboard working!")
        else:
            print(f"   ❌ Dashboard failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
    
    # Test 4: Summary
    print("\n4️⃣  Testing Summary...")
    try:
        response = requests.get(f"{BASE_URL}/receipts/summary/")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   Summary data keys: {list(data.keys())}")
            print("   ✅ Summary working!")
        else:
            print(f"   ❌ Summary failed: {response.text}")
    except Exception as e:
        print(f"   ❌ Connection failed: {e}")
    
    # Test 5: Upload Receipt (if we have test image)
    print("\n5️⃣  Testing Receipt Upload...")
    test_images = [
        "../errorlogs/ASDA1.jpg",
        "../errorlogs/receiptify-2.jpg"
    ]
    
    for image_path in test_images:
        full_path = Path(__file__).parent / image_path
        if full_path.exists():
            print(f"   📸 Found test image: {image_path}")
            try:
                with open(full_path, 'rb') as f:
                    files = {'file': f}
                    data = {'original_filename': full_path.name}
                    
                    response = requests.post(f"{BASE_URL}/receipts/", files=files, data=data)
                    print(f"   Upload Status: {response.status_code}")
                    
                    if response.status_code in [200, 201]:
                        result = response.json()
                        receipt_id = result.get('id')
                        print(f"   ✅ Upload successful! Receipt ID: {receipt_id}")
                        
                        # Test processing status
                        if receipt_id:
                            time.sleep(2)  # Give it time to process
                            status_response = requests.get(f"{BASE_URL}/receipts/{receipt_id}/processing_status/")
                            print(f"   Processing Status: {status_response.status_code}")
                            if status_response.status_code == 200:
                                status_data = status_response.json()
                                print(f"   OCR Status: {status_data.get('ocr_status', 'N/A')}")
                    else:
                        print(f"   ❌ Upload failed: {response.text}")
                        
            except Exception as e:
                print(f"   ❌ Upload test failed: {e}")
            break
    else:
        print("   ⚠️  No test images found for upload test")
    
    print("\n✨ API Testing Complete!")


if __name__ == "__main__":
    test_api_endpoints()
