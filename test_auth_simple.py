#!/usr/bin/env python3

import requests
import json

API_BASE_URL = "https://smart-backend-56247d256139.herokuapp.com/api/v1"

def test_auth():
    """Simple auth test"""
    print("Testing authentication...")
    
    # Try to get token
    login_data = {
        'email': 'test@async.com',
        'password': 'testpass123'
    }
    
    try:
        print(f"Posting to: {API_BASE_URL}/accounts/token/")
        response = requests.post(
            f"{API_BASE_URL}/accounts/token/",
            json=login_data,
            timeout=10
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            token_data = response.json()
            access_token = token_data.get('access')
            print(f"Got token: {access_token[:50]}..." if access_token else "No access token found")
            return access_token
        else:
            print("Authentication failed")
            return None
            
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    test_auth()
