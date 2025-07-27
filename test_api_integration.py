#!/usr/bin/env python3
"""
Test OCR API endpoints with Cloudinary integration
"""
import requests
import json
from pathlib import Path

def test_api_endpoints():
    """Test the API endpoints"""
    base_url = "http://localhost:8000"
    
    # Test the test_auth endpoint
    print("🧪 Testing API endpoints...")
    
    try:
        response = requests.get(f"{base_url}/api/v1/receipts/test_auth/", timeout=10)
        print(f"✅ test_auth endpoint: {response.status_code}")
        
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
        
    except requests.exceptions.ConnectionError:
        print("❌ Django server not running on localhost:8000")
        print("   Start the server with: python manage.py runserver 8000")
        return False
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False
    
    return True

def test_receipt_upload_endpoint():
    """Test receipt upload endpoint"""
    base_url = "http://localhost:8000"
    
    # Test image path
    test_image = Path(__file__).parent / 'errorlogs' / 'ASDA1.jpg'
    if not test_image.exists():
        print(f"❌ Test image not found: {test_image}")
        return False
    
    print("🧪 Testing receipt upload endpoint...")
    
    try:
        # For now, just test that the endpoint exists
        response = requests.get(f"{base_url}/api/v1/receipts/", timeout=10)
        print(f"✅ receipts endpoint accessible: {response.status_code}")
        
        if response.status_code in [200, 401]:  # 401 is expected without auth
            print("   Endpoint is responding correctly")
            return True
        else:
            print(f"   Unexpected status: {response.status_code}")
            return False
        
    except requests.exceptions.ConnectionError:
        print("❌ Django server not running on localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Upload test failed: {e}")
        return False

def show_api_summary():
    """Show available API endpoints"""
    print("\n📋 Available API Endpoints:")
    print("   GET  /api/v1/receipts/test_auth/     - Test authentication")
    print("   GET  /api/v1/receipts/               - List receipts") 
    print("   POST /api/v1/receipts/               - Upload receipt")
    print("   GET  /api/v1/receipts/{id}/          - Get receipt details")
    print("   GET  /api/v1/receipts/{id}/processing_status/ - Check OCR status")
    print("   POST /api/v1/receipts/{id}/reprocess/ - Reprocess receipt")
    print("   GET  /api/v1/receipts/summary/       - Get summary")
    print("   GET  /api/v1/receipts/dashboard/     - Get dashboard data")

if __name__ == '__main__':
    print("🧪 Testing OCR API with Cloudinary Integration...")
    
    success = True
    success &= test_api_endpoints()
    success &= test_receipt_upload_endpoint()
    
    show_api_summary()
    
    if success:
        print("\n🎉 API endpoints are working!")
        print("\n📝 To test full OCR + Cloudinary integration:")
        print("   1. Start the Django server: python manage.py runserver 8000")
        print("   2. Upload a receipt via POST /api/v1/receipts/")
        print("   3. Check processing status and Cloudinary data")
    else:
        print("\n❌ Some API tests failed.")
        print("   Make sure Django server is running: python manage.py runserver 8000")
