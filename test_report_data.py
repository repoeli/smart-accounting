#!/usr/bin/env python
"""
Direct test of report logic without authentication
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
from django.utils import timezone

User = get_user_model()

def test_report_data_directly():
    print("🔍 Direct Report Data Analysis")
    print("=" * 50)
    
    # Get test user
    try:
        user = User.objects.get(email='ineliyow@gmail.com')
        print(f"✅ Found test user: {user.email}")
    except User.DoesNotExist:
        print("❌ Test user not found")
        return
    
    # Get date range (10 years to match backend default)
    end_date = timezone.now().date()
    start_date = end_date - timedelta(days=365 * 10)
    
    print(f"📅 Date Range: {start_date} to {end_date}")
    
    # Get user's receipts with extracted data
    receipts = Receipt.objects.filter(
        owner_id=user.id,
        ocr_status='completed',
        extracted_data__isnull=False
    ).exclude(extracted_data={})
    
    print(f"📊 Found {receipts.count()} receipts with data")
    
    # Process receipts like the report does
    filtered_receipts = []
    total_amount = 0
    category_totals = {}
    monthly_data = {}
    
    for receipt in receipts:
        extracted_data = receipt.extracted_data or {}
        transaction_date_str = extracted_data.get('date')
        amount = extracted_data.get('total', 0)
        transaction_type = extracted_data.get('type', 'expense')
        vendor = extracted_data.get('vendor', 'Unknown')
        category = extracted_data.get('category', 'other')
        
        if transaction_date_str and amount:
            try:
                # Parse the date (handle different formats)
                if isinstance(transaction_date_str, str) and transaction_date_str.strip():
                    try:
                        transaction_date = datetime.strptime(transaction_date_str, '%Y-%m-%d').date()
                    except ValueError:
                        try:
                            transaction_date = datetime.strptime(transaction_date_str, '%d/%m/%Y').date()
                        except ValueError:
                            print(f"   ⚠️  Invalid date format: {transaction_date_str}")
                            continue
                else:
                    print(f"   ⚠️  Empty date: {transaction_date_str}")
                    continue
                
                # Filter by date range
                if start_date <= transaction_date <= end_date:
                    amount_float = float(amount)
                    
                    filtered_receipts.append({
                        'id': receipt.id,
                        'vendor': vendor,
                        'date': transaction_date,
                        'amount': amount_float,
                        'type': transaction_type,
                        'category': category
                    })
                    
                    total_amount += amount_float
                    
                    # Track categories
                    if category not in category_totals:
                        category_totals[category] = 0
                    category_totals[category] += amount_float
                    
                    # Track monthly data
                    month_key = transaction_date.strftime('%Y-%m')
                    if month_key not in monthly_data:
                        monthly_data[month_key] = {'income': 0, 'expenses': 0, 'count': 0}
                    
                    if transaction_type == 'income':
                        monthly_data[month_key]['income'] += amount_float
                    else:
                        monthly_data[month_key]['expenses'] += amount_float
                    monthly_data[month_key]['count'] += 1
                    
                else:
                    print(f"   📅 Date outside range: {transaction_date} - {vendor}")
                    
            except (ValueError, TypeError) as e:
                print(f"   ❌ Error processing receipt {receipt.id}: {e}")
                continue
    
    print(f"\n📈 Report Results:")
    print(f"   Filtered Receipts: {len(filtered_receipts)}")
    print(f"   Total Amount: £{total_amount:.2f}")
    print(f"   Monthly Periods: {len(monthly_data)}")
    print(f"   Categories: {len(category_totals)}")
    
    if filtered_receipts:
        print(f"\n💼 Sample Transactions:")
        for i, receipt in enumerate(filtered_receipts[:5]):
            print(f"   {i+1}. {receipt['vendor']} - £{receipt['amount']} - {receipt['date']} - {receipt['type']}")
    
    if monthly_data:
        print(f"\n📅 Monthly Breakdown:")
        for month in sorted(monthly_data.keys()):
            data = monthly_data[month]
            print(f"   {month}: Income £{data['income']:.2f}, Expenses £{data['expenses']:.2f}, Count {data['count']}")
    
    if category_totals:
        print(f"\n🏷️  Category Breakdown:")
        sorted_categories = sorted(category_totals.items(), key=lambda x: x[1], reverse=True)
        for category, amount in sorted_categories[:5]:
            percentage = (amount / total_amount) * 100 if total_amount > 0 else 0
            print(f"   {category}: £{amount:.2f} ({percentage:.1f}%)")
    
    # Test if this would show "No data available"
    if len(filtered_receipts) == 0:
        print(f"\n❌ ISSUE: No filtered receipts - This would show 'No data available for export'")
        print(f"   Possible causes:")
        print(f"   - All receipts are outside date range ({start_date} to {end_date})")
        print(f"   - Invalid date formats in extracted_data")
        print(f"   - Missing total amounts")
    else:
        print(f"\n✅ SUCCESS: {len(filtered_receipts)} receipts would generate report data")

if __name__ == '__main__':
    test_report_data_directly()
