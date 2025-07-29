#!/usr/bin/env python
"""
Test script to verify reports are working locally
"""
import os
import sys
import django
from datetime import datetime, timedelta

# Add the backend directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from receipts.models import Receipt, Transaction
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
from reports.views import report_summary, income_vs_expense_report, category_breakdown_report

User = get_user_model()

def test_reports():
    print("🔍 Testing Reports Locally")
    print("=" * 50)
    
    # Get test user
    try:
        user = User.objects.get(email='ineliyow@gmail.com')
        print(f"✅ Found test user: {user.email}")
    except User.DoesNotExist:
        print("❌ Test user not found")
        return
    
    # Check data
    receipts = Receipt.objects.filter(owner=user)
    transactions = Transaction.objects.filter(owner=user)
    completed_receipts = receipts.filter(ocr_status='completed')
    receipts_with_data = completed_receipts.exclude(extracted_data={}).exclude(extracted_data__isnull=True)
    
    print(f"📊 Data Summary:")
    print(f"   Total Receipts: {receipts.count()}")
    print(f"   Completed Receipts: {completed_receipts.count()}")
    print(f"   Receipts with Data: {receipts_with_data.count()}")
    print(f"   Transactions: {transactions.count()}")
    print()
    
    # Show sample receipt data
    if receipts_with_data.exists():
        sample_receipt = receipts_with_data.first()
        print(f"📋 Sample Receipt Data:")
        print(f"   ID: {sample_receipt.id}")
        print(f"   Status: {sample_receipt.ocr_status}")
        print(f"   Extracted Data: {sample_receipt.extracted_data}")
        print()
    
    # Create request factory
    factory = RequestFactory()
    
    # Test report_summary
    print("🧪 Testing report_summary...")
    try:
        request = factory.get('/api/v1/reports/summary/')
        request.user = user
        
        response = report_summary(request)
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.data
            print(f"   Quick Metrics:")
            print(f"     Total Receipts: {data['quick_metrics']['total_receipts']}")
            print(f"     Total Completed: {data['quick_metrics'].get('total_completed_receipts', 0)}")
            print(f"     Current Month Expenses: £{data['quick_metrics']['current_month_expenses']}")
            print(f"     YTD Expenses: £{data['quick_metrics']['ytd_expenses']}")
            print(f"   Top Categories: {len(data['top_categories_ytd'])}")
        else:
            print(f"   Error: {response.data}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    print()
    
    # Test income_vs_expense_report
    print("🧪 Testing income_vs_expense_report...")
    try:
        request = factory.get('/api/v1/reports/income-expense/')
        request.user = user
        
        response = income_vs_expense_report(request)
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.data
            print(f"   Report Type: {data['report_type']}")
            print(f"   Period: {data['period']['start_date']} to {data['period']['end_date']}")
            print(f"   Summary:")
            print(f"     Total Income: £{data['summary']['total_income']}")
            print(f"     Total Expenses: £{data['summary']['total_expenses']}")
            print(f"     Net Total: £{data['summary']['net_total']}")
            print(f"   Monthly Data Points: {len(data['data'])}")
            if data['data']:
                print(f"   Sample Month: {data['data'][0]}")
        else:
            print(f"   Error: {response.data}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    print()
    
    # Test category_breakdown_report
    print("🧪 Testing category_breakdown_report...")
    try:
        request = factory.get('/api/v1/reports/category-breakdown/')
        request.user = user
        
        response = category_breakdown_report(request)
        
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.data
            print(f"   Report Type: {data['report_type']}")
            print(f"   Summary:")
            print(f"     Total Amount: £{data['summary']['total_amount']}")
            print(f"     Total Transactions: {data['summary']['total_transactions']}")
            print(f"     Categories Count: {data['summary']['categories_count']}")
            print(f"   Categories: {len(data['categories'])}")
            for i, cat in enumerate(data['categories'][:3]):
                print(f"     {i+1}. {cat['category_display']}: £{cat['total_amount']} ({cat['percentage']}%)")
        else:
            print(f"   Error: {response.data}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")
    print()
    
    # Analyze receipt data in detail
    print("🔍 Detailed Receipt Analysis:")
    valid_data_count = 0
    invalid_data_count = 0
    
    for receipt in receipts_with_data[:10]:  # Check first 10
        extracted_data = receipt.extracted_data or {}
        date_str = extracted_data.get('date')
        total = extracted_data.get('total')
        vendor = extracted_data.get('vendor')
        
        if date_str and total and vendor:
            valid_data_count += 1
            print(f"   ✅ Receipt {receipt.id}: {vendor} - £{total} - {date_str}")
        else:
            invalid_data_count += 1
            print(f"   ❌ Receipt {receipt.id}: Missing data - {extracted_data}")
    
    print(f"   Valid Data: {valid_data_count}")
    print(f"   Invalid Data: {invalid_data_count}")

if __name__ == '__main__':
    test_reports()
