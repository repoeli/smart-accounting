#!/usr/bin/env python3

import requests
import json
import sys

API_BASE_URL = "https://smart-backend-56247d256139.herokuapp.com/api/v1"

def register_and_login():
    """Test registration and login flow"""
    print("Testing user registration and login...")
    
    # First, try registration
    register_data = {
        'email': 'testuser2025@example.com',
        'password': 'SecurePassword123!',
        'password_confirm': 'SecurePassword123!',
        'first_name': 'Test',
        'last_name': 'User',
        'user_type': 'individual'
    }
    
    try:
        print("1. Attempting registration...")
        register_response = requests.post(
            f"{API_BASE_URL}/accounts/register/",
            json=register_data,
            timeout=10,
            verify=True
        )
        
        print(f"   Registration Status: {register_response.status_code}")
        if register_response.status_code not in [200, 201]:
            print(f"   Registration Error: {register_response.text}")
        else:
            print("   ✅ Registration successful!")
        
    except Exception as e:
        print(f"   Registration Error: {e}")
    
    # Now try login
    login_data = {
        'email': 'testuser2025@example.com',
        'password': 'SecurePassword123!'
    }
    
    try:
        print("\n2. Attempting login...")
        login_response = requests.post(
            f"{API_BASE_URL}/accounts/token/",
            json=login_data,
            timeout=10,
            verify=True
        )
        
        print(f"   Login Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            token_data = login_response.json()
            access_token = token_data.get('access')
            
            if access_token:
                print(f"   ✅ Login successful! Token: {access_token[:50]}...")
                return access_token
            else:
                print("   ❌ No access token in response")
                return None
        else:
            print(f"   Login Error: {login_response.text}")
            return None
    
    except Exception as e:
        print(f"   Login Error: {e}")
        return None

def test_authenticated_endpoint(token):
    """Test an authenticated endpoint"""
    if not token:
        print("No token available for testing")
        return
    
    print("\n3. Testing authenticated endpoint...")
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(
            f"{API_BASE_URL}/receipts/",
            headers=headers,
            timeout=10
        )
        
        print(f"   Receipts endpoint status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Authentication working!")
        else:
            print(f"   Response: {response.text}")
    
    except Exception as e:
        print(f"   Error: {e}")

if __name__ == "__main__":
    token = register_and_login()
    test_authenticated_endpoint(token)
