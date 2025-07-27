#!/usr/bin/env python3
"""
Test Celery/Redis setup and async receipt processing
"""
import requests
import time
import json

# Configuration
API_BASE_URL = "https://smart-backend-56247d256139.herokuapp.com/api"
RECEIPT_IMAGE_PATH = "errorlogs/receipt-starbucks-beverage.jpeg"

def test_async_receipt_processing():
    """Test the new async receipt processing workflow"""
    print("🧪 Testing Async Receipt Processing")
    print("=" * 50)
    
    # Step 1: Upload receipt (should return immediately with processing status)
    print("📤 Step 1: Uploading receipt...")
    
    try:
        with open(RECEIPT_IMAGE_PATH, 'rb') as f:
            files = {'image': ('receipt.jpeg', f, 'image/jpeg')}
            response = requests.post(f"{API_BASE_URL}/receipts/", files=files, timeout=30)
        
        if response.status_code not in [200, 201]:
            print(f"❌ Upload failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
        
        receipt_data = response.json()
        receipt_id = receipt_data['id']
        ocr_status = receipt_data.get('ocr_status', 'unknown')
        
        print(f"✅ Receipt uploaded successfully!")
        print(f"   Receipt ID: {receipt_id}")
        print(f"   Initial OCR Status: {ocr_status}")
        
        if ocr_status == 'processing':
            print("🎉 SUCCESS: Receipt is processing asynchronously!")
        else:
            print(f"⚠️  Unexpected status: {ocr_status}")
        
        # Step 2: Poll for completion
        print(f"\n📊 Step 2: Polling for completion...")
        max_polls = 20  # 2 minutes max
        poll_count = 0
        
        while poll_count < max_polls:
            time.sleep(6)  # Wait 6 seconds between polls
            poll_count += 1
            
            try:
                status_response = requests.get(
                    f"{API_BASE_URL}/receipts/{receipt_id}/processing_status/",
                    timeout=10
                )
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    current_status = status_data.get('ocr_status')
                    
                    print(f"   Poll {poll_count}: Status = {current_status}")
                    
                    if current_status == 'completed':
                        print("🎉 OCR processing completed!")
                        
                        # Get final receipt data
                        final_response = requests.get(
                            f"{API_BASE_URL}/receipts/{receipt_id}/",
                            timeout=10
                        )
                        
                        if final_response.status_code == 200:
                            final_data = final_response.json()
                            extracted_data = final_data.get('extracted_data', {})
                            
                            print("\n📋 Extracted Data:")
                            print(f"   Merchant: {extracted_data.get('vendor', 'N/A')}")
                            print(f"   Total: £{extracted_data.get('total', 'N/A')}")
                            print(f"   Date: {extracted_data.get('date', 'N/A')}")
                            
                            total_amount = extracted_data.get('total', 0)
                            if total_amount and float(total_amount) > 0:
                                print("🎉 SUCCESS: Real OCR data extracted via Celery!")
                                return True
                            else:
                                print("⚠️  OCR completed but no meaningful data extracted")
                                return False
                        
                        break
                    
                    elif current_status == 'failed':
                        print("❌ OCR processing failed!")
                        print(f"   Error info: {status_data}")
                        return False
                    
                else:
                    print(f"⚠️  Status check failed: {status_response.status_code}")
                    
            except Exception as e:
                print(f"⚠️  Status check error: {e}")
        
        if poll_count >= max_polls:
            print("⚠️  Polling timeout - processing may still be ongoing")
            return False
            
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_celery_health():
    """Test if Celery workers are responding"""
    print("\n🏥 Testing Celery Health...")
    
    # This is a simple test - in production you'd have a dedicated health endpoint
    try:
        response = requests.get(f"{API_BASE_URL}/receipts/", timeout=10)
        if response.status_code in [200, 401]:  # 401 expected without auth
            print("✅ Backend is responding")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Backend health check error: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Smart Accounting - Async Processing Test")
    print("=" * 60)
    
    if not test_celery_health():
        print("❌ Backend not healthy. Exiting.")
        exit(1)
    
    success = test_async_receipt_processing()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 ASYNC PROCESSING TEST PASSED!")
        print("✅ Celery workers are processing OCR tasks")
        print("✅ Redis is working as message broker")
        print("✅ Receipt data is being extracted properly")
    else:
        print("❌ ASYNC PROCESSING TEST FAILED!")
        print("🔍 Check Heroku logs for worker/beat dynos")
        print("🔍 Verify Redis add-on is provisioned")
        print("🔍 Ensure worker dyno is scaled up")
    
    print("\n💡 Heroku Commands to Debug:")
    print("   heroku ps -a smart-backend")
    print("   heroku logs --tail -a smart-backend --dyno worker")
    print("   heroku logs --tail -a smart-backend --dyno beat") 
    print("   heroku redis:info -a smart-backend")
