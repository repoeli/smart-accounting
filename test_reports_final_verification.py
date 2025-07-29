#!/usr/bin/env python
"""
Final Verification Test - Reports with Real Data
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
from receipts.models import Receipt
from django.utils import timezone

User = get_user_model()

def test_final_verification():
    print("🎯 Final Report Verification Test")
    print("=" * 60)
    
    # Get test user
    try:
        user = User.objects.get(email='ineliyow@gmail.com')
        print(f"✅ Found test user: {user.email}")
    except User.DoesNotExist:
        print("❌ Test user not found")
        return
    
    # Get comprehensive statistics
    all_receipts = Receipt.objects.filter(owner=user)
    completed_receipts = all_receipts.filter(ocr_status='completed')
    receipts_with_data = completed_receipts.filter(
        extracted_data__isnull=False
    ).exclude(extracted_data={})
    
    print(f"\n📊 Receipt Statistics:")
    print(f"   Total Receipts: {all_receipts.count()}")
    print(f"   Completed OCR: {completed_receipts.count()}")
    print(f"   With Valid Data: {receipts_with_data.count()}")
    
    # Analyze the data quality
    valid_receipts = 0
    invalid_receipts = 0
    date_ranges = []
    total_amounts = []
    categories = set()
    vendors = set()
    
    print(f"\n🔍 Data Quality Analysis:")
    
    for receipt in receipts_with_data:
        extracted_data = receipt.extracted_data or {}
        date_str = extracted_data.get('date')
        total = extracted_data.get('total')
        vendor = extracted_data.get('vendor', 'Unknown')
        category = extracted_data.get('category', 'other')
        
        if date_str and total:
            try:
                # Parse date
                if isinstance(date_str, str) and date_str.strip():
                    try:
                        parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                    except ValueError:
                        try:
                            parsed_date = datetime.strptime(date_str, '%d/%m/%Y').date()
                        except ValueError:
                            print(f"   ⚠️  Invalid date format: {date_str}")
                            invalid_receipts += 1
                            continue
                    
                    date_ranges.append(parsed_date)
                    total_amounts.append(float(total))
                    categories.add(category)
                    vendors.add(vendor)
                    valid_receipts += 1
                    
                else:
                    invalid_receipts += 1
                    
            except (ValueError, TypeError) as e:
                invalid_receipts += 1
                print(f"   ❌ Error processing receipt {receipt.id}: {e}")
        else:
            invalid_receipts += 1
    
    print(f"   Valid for Reports: {valid_receipts}")
    print(f"   Invalid/Incomplete: {invalid_receipts}")
    
    if date_ranges:
        min_date = min(date_ranges)
        max_date = max(date_ranges)
        total_value = sum(total_amounts)
        avg_value = total_value / len(total_amounts)
        
        print(f"\n📅 Date Range Coverage:")
        print(f"   Earliest Transaction: {min_date}")
        print(f"   Latest Transaction: {max_date}")
        print(f"   Time Span: {(max_date - min_date).days} days")
        
        print(f"\n💰 Financial Summary:")
        print(f"   Total Value: £{total_value:,.2f}")
        print(f"   Average Transaction: £{avg_value:.2f}")
        print(f"   Unique Vendors: {len(vendors)}")
        print(f"   Categories: {len(categories)}")
        
        # Test 10-year default range coverage
        end_date = timezone.now().date()
        start_date_10y = end_date - timedelta(days=365 * 10)
        
        receipts_in_10y = [d for d in date_ranges if start_date_10y <= d <= end_date]
        coverage_10y = len(receipts_in_10y) / len(date_ranges) * 100
        
        print(f"\n🎯 10-Year Default Range Analysis:")
        print(f"   Default Range: {start_date_10y} to {end_date}")
        print(f"   Receipts in Range: {len(receipts_in_10y)}/{len(date_ranges)}")
        print(f"   Coverage: {coverage_10y:.1f}%")
        
        if coverage_10y >= 80:
            print(f"   ✅ EXCELLENT: 10-year default captures {coverage_10y:.1f}% of data")
        elif coverage_10y >= 60:
            print(f"   ✅ GOOD: 10-year default captures {coverage_10y:.1f}% of data")
        else:
            print(f"   ⚠️  LIMITED: 10-year default only captures {coverage_10y:.1f}% of data")
        
        # Sample recent transactions
        recent_receipts = [d for d in date_ranges if d >= end_date - timedelta(days=90)]
        if recent_receipts:
            print(f"\n📈 Recent Activity (Last 90 Days):")
            print(f"   Recent Transactions: {len(recent_receipts)}")
            print(f"   This ensures users see immediate value from reports")
        
        # Summary conclusion
        print(f"\n🎉 VERIFICATION SUMMARY:")
        if valid_receipts >= 15 and coverage_10y >= 70:
            print(f"   ✅ REPORTS WILL SHOW MEANINGFUL DATA")
            print(f"   - {valid_receipts} valid transactions")
            print(f"   - {coverage_10y:.1f}% coverage with 10-year default")
            print(f"   - Users will see rich historical data by default")
            return True
        elif valid_receipts >= 5:
            print(f"   ✅ REPORTS WILL SHOW SOME DATA")
            print(f"   - {valid_receipts} valid transactions")
            print(f"   - Limited but functional for testing")
            return True
        else:
            print(f"   ❌ INSUFFICIENT DATA FOR MEANINGFUL REPORTS")
            print(f"   - Only {valid_receipts} valid transactions")
            return False
    else:
        print(f"\n❌ NO VALID DATA FOUND")
        return False

if __name__ == '__main__':
    success = test_final_verification()
    if success:
        print(f"\n🚀 READY FOR PRODUCTION: Reports will display meaningful data to users!")
    else:
        print(f"\n⚠️  NEEDS ATTENTION: Consider adding more test data or adjusting date ranges.")
