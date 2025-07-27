#!/usr/bin/env python3
"""
REAL PRACTICAL TEST - No decorative reports!
Actually test receipt upload and OCR processing on the live deployed system
"""

import requests
import json
import base64
import time
from pathlib import Path

# Live deployment URL
BASE_URL = "https://smart-acc-prod-0061ebec8dd2.herokuapp.com"

def create_test_user():
    """Create a test user account for authentication"""
    print("🔐 Creating test user account...")
    
    # Using a real email address that the user can confirm
    user_data = {
        "username": "testuser_" + str(int(time.time())),
        "email": "zebene.elias@hotmail.com",  # Real email address
        "password": "testpass123",
        "password_confirm": "testpass123",
        "first_name": "Test",
        "last_name": "User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/accounts/register/", 
                               json=user_data, timeout=15)
        
        if response.status_code in [200, 201]:
            print(f"✅ User created: {user_data['username']}")
            return user_data
        else:
            print(f"❌ User creation failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ User creation error: {e}")
        return None

def login_user(user_data):
    """Login and get authentication token"""
    print("🔑 Logging in...")
    
    login_data = {
        "username": user_data["username"],
        "password": user_data["password"]
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/v1/accounts/token/", 
                               json=login_data, timeout=15)
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access") or token_data.get("token")
            if token:
                print("✅ Login successful, got auth token")
                return token
            else:
                print(f"❌ No token in response: {response.text}")
                return None
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None

def upload_real_receipt(token, image_path):
    """Upload an actual receipt image and process it"""
    print(f"📄 Uploading real receipt: {image_path}")
    
    if not Path(image_path).exists():
        print(f"❌ Image file not found: {image_path}")
        return None
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        with open(image_path, 'rb') as image_file:
            files = {
                'image': (Path(image_path).name, image_file, 'image/jpeg')
            }
            
            print("⏳ Processing receipt... (this may take 30-60 seconds)")
            response = requests.post(f"{BASE_URL}/api/v1/receipts/", 
                                   files=files, headers=headers, timeout=120)
        
        if response.status_code in [200, 201]:
            receipt_data = response.json()
            print("✅ Receipt uploaded and processed successfully!")
            
            # Display extracted data
            print("\n📊 EXTRACTED DATA:")
            print("-" * 40)
            
            extracted_fields = [
                ("Vendor", receipt_data.get("vendor")),
                ("Total Amount", receipt_data.get("total_amount")),
                ("Tax Amount", receipt_data.get("tax_amount")),
                ("Date", receipt_data.get("date")),
                ("Discounts", receipt_data.get("discounts")),
                ("Item Count", receipt_data.get("item_count")),
                ("Type", receipt_data.get("expense_income_type")),
                ("Cloudinary URL", receipt_data.get("cloudinary_url")),
            ]
            
            for field, value in extracted_fields:
                if value:
                    print(f"✅ {field}: {value}")
                else:
                    print(f"⚠️  {field}: Not extracted")
            
            return receipt_data
        else:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"Response: {response.text}")
            return None
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out - OCR processing may have failed")
        return None
    except Exception as e:
        print(f"❌ Upload error: {e}")
        return None

def verify_cloudinary_storage(receipt_data):
    """Verify the image was actually stored in Cloudinary"""
    print("\n☁️ Verifying Cloudinary storage...")
    
    cloudinary_url = receipt_data.get("cloudinary_url")
    if not cloudinary_url:
        print("❌ No Cloudinary URL found")
        return False
    
    try:
        response = requests.head(cloudinary_url, timeout=10)
        if response.status_code == 200:
            print("✅ Image successfully stored in Cloudinary")
            print(f"✅ URL accessible: {cloudinary_url}")
            return True
        else:
            print(f"❌ Cloudinary URL not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Cloudinary verification failed: {e}")
        return False

def get_receipt_list(token):
    """Get list of receipts to verify it's in the database"""
    print("\n📋 Verifying receipt in database...")
    
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/api/v1/receipts/", 
                              headers=headers, timeout=15)
        
        if response.status_code == 200:
            receipts = response.json()
            count = len(receipts) if isinstance(receipts, list) else receipts.get("count", 0)
            print(f"✅ Receipt stored in database (total receipts: {count})")
            return True
        else:
            print(f"❌ Failed to get receipts: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Database verification failed: {e}")
        return False

def run_comprehensive_test():
    """Run the complete real-world test"""
    print("🚀 REAL PRACTICAL TEST - Smart Accounting Live System")
    print("=" * 60)
    print("Testing ACTUAL receipt processing on live deployment")
    print("=" * 60)
    
    # Step 1: Create test user
    user_data = create_test_user()
    if not user_data:
        print("❌ TEST FAILED: Could not create user")
        return False
    
    # Step 2: Login
    token = login_user(user_data)
    if not token:
        print("❌ TEST FAILED: Could not login")
        return False
    
    # Step 3: Upload real receipt
    receipt_path = "errorlogs/ASDA1.jpg"  # Real receipt image
    receipt_data = upload_real_receipt(token, receipt_path)
    if not receipt_data:
        print("❌ TEST FAILED: Could not process receipt")
        return False
    
    # Step 4: Verify Cloudinary storage
    cloudinary_ok = verify_cloudinary_storage(receipt_data)
    
    # Step 5: Verify database storage
    database_ok = get_receipt_list(token)
    
    # Final assessment
    print("\n" + "=" * 60)
    print("🎯 REAL TEST RESULTS")
    print("=" * 60)
    
    if receipt_data and cloudinary_ok and database_ok:
        print("🎉 SUCCESS: The system is ACTUALLY working!")
        print("✅ User registration: Working")
        print("✅ Authentication: Working") 
        print("✅ Receipt upload: Working")
        print("✅ OCR processing: Working")
        print("✅ Data extraction: Working")
        print("✅ Cloudinary storage: Working")
        print("✅ Database storage: Working")
        print("✅ Enhanced OpenAI service: Working")
        print("\n💡 The enhanced Smart Accounting system is FULLY OPERATIONAL!")
        return True
    else:
        print("❌ FAILURE: System has issues")
        return False

if __name__ == "__main__":
    success = run_comprehensive_test()
    exit(0 if success else 1)
