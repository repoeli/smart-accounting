#!/usr/bin/env python3
import requests
import sys

# Test the API endpoint
try:
    response = requests.get("https://smart-backend-56247d256139.herokuapp.com/api/v1/receipts/", timeout=10)
    print(f"Status Code: {response.status_code}")
    print(f"Headers: {dict(response.headers)}")
    if response.status_code == 401:
        print("SUCCESS: API is responding and authentication is working!")
    else:
        print(f"Response: {response.text[:200]}")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)
