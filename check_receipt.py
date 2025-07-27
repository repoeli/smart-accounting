#!/usr/bin/env python3

import requests
import json

API_BASE_URL = "https://smart-backend-56247d256139.herokuapp.com/api/v1"

def get_auth_token():
    """Get authentication token"""
    login_data = {
        'email': 'ineliyow@gmail.com',
        'password': 'P@$$w0rd123'
    }
    
    response = requests.post(f"{API_BASE_URL}/accounts/token/", json=login_data, timeout=10)
    if response.status_code == 200:
        return response.json()['tokens']['access']
    return None

def check_receipt_status(receipt_id):
    """Check specific receipt status"""
    token = get_auth_token()
    if not token:
        print("❌ Could not get auth token")
        return
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Check receipt details
    response = requests.get(f"{API_BASE_URL}/receipts/{receipt_id}/", headers=headers, timeout=10)
    
    if response.status_code == 200:
        receipt = response.json()
        print(f"📄 Receipt {receipt_id} Status:")
        print(f"   OCR Status: {receipt.get('ocr_status', 'unknown')}")
        print(f"   Created: {receipt.get('created_at', 'unknown')}")
        print(f"   Updated: {receipt.get('updated_at', 'unknown')}")
        
        extracted_data = receipt.get('extracted_data', {})
        if extracted_data:
            print(f"   Extracted Data:")
            print(f"     Vendor: {extracted_data.get('vendor', 'N/A')}")
            print(f"     Total: £{extracted_data.get('total', 'N/A')}")
            print(f"     Date: {extracted_data.get('date', 'N/A')}")
        else:
            print("   No extracted data yet")
    else:
        print(f"❌ Could not get receipt: {response.status_code}")
        print(f"Response: {response.text}")

if __name__ == "__main__":
    check_receipt_status(16)
