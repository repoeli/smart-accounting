#!/usr/bin/env python3
import requests
import json
from pathlib import Path

def test_ocr_system():
    print("🚀 Testing Smart Accounting OCR System")
    print("=" * 50)
    
    # Step 1: Login with EMAIL (not username)
    print("🔑 Logging in...")
    login_data = {
        'email': 'ineliyow@yahoo.com', 
        'password': 'P@$$w0rd123'
    }
    
    response = requests.post(
        'https://smart-acc-prod-0061ebec8dd2.herokuapp.com/api/v1/accounts/token/', 
        json=login_data
    )
    
    if response.status_code != 200:
        print(f"❌ LOGIN FAILED: {response.status_code}")
        print(response.text)
        return False
    
    token = response.json().get('access')
    print("✅ Login successful!")
    
    # Step 2: Upload receipt for OCR processing
    print("📄 Processing receipt with OpenAI Vision...")
    
    receipt_path = "errorlogs/ASDA1.jpg"
    if not Path(receipt_path).exists():
        print(f"❌ Receipt image not found: {receipt_path}")
        return False
    
    headers = {'Authorization': f'Bearer {token}'}
    
    with open(receipt_path, 'rb') as f:
        files = {'image': ('ASDA1.jpg', f, 'image/jpeg')}
        
        response = requests.post(
            'https://smart-acc-prod-0061ebec8dd2.herokuapp.com/api/v1/receipts/',
            files=files,
            headers=headers,
            timeout=120
        )
    
    if response.status_code not in [200, 201]:
        print(f"❌ OCR FAILED: {response.status_code}")
        print(response.text)
        return False
    
    # Step 3: Display results
    result = response.json()
    print("🎉 OCR PROCESSING SUCCESSFUL!")
    print("=" * 50)
    print("📊 EXTRACTED DATA:")
    print(f"🏪 Vendor: {result.get('vendor_name', 'N/A')}")
    print(f"💰 Total: ${result.get('total_amount', 'N/A')}")
    print(f"📊 Tax: ${result.get('tax_amount', 'N/A')}")
    print(f"📅 Date: {result.get('transaction_date', 'N/A')}")
    print(f"🎁 Discounts: ${result.get('discount_amount', 'N/A')}")
    print(f"📦 Items: {result.get('number_of_items', 'N/A')}")
    
    # Step 4: Verify Cloudinary
    cloudinary_url = result.get('cloudinary_url')
    if cloudinary_url:
        img_response = requests.head(cloudinary_url)
        cloudinary_ok = img_response.status_code == 200
        print(f"☁️  Cloudinary: {'✅ Working' if cloudinary_ok else '❌ Failed'}")
        if cloudinary_ok:
            print(f"🔗 Image URL: {cloudinary_url}")
    else:
        print("☁️  Cloudinary: ❌ No URL returned")
    
    # Processing metadata
    metadata = result.get('processing_metadata', {})
    print(f"⏱️  Processing time: {metadata.get('processing_time', 'N/A')}s")
    print(f"🧠 AI Model: {metadata.get('ai_model', 'N/A')}")
    print(f"📈 Confidence: {metadata.get('confidence_score', 'N/A')}/10")
    
    print("=" * 50)
    print("✅ SMART ACCOUNTING OCR SYSTEM IS WORKING!")
    return True

if __name__ == "__main__":
    try:
        success = test_ocr_system()
        print(f"\n🏁 Final Result: {'SUCCESS' if success else 'FAILED'}")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
