import os
import csv
from io import StringIO
from datetime import datetime
from decimal import Decimal
from django.conf import settings
from django.db import models
from django.db.models import Sum, Q, Count
from celery import shared_task
from receipts.models import Transaction
from .models import Report


@shared_task(bind=True)
def generate_report(self, report_id):
    """
    Celery task to generate financial reports in the background.
    """
    try:
        report = Report.objects.get(id=report_id)
        report.mark_as_processing()
        
        # Generate the report data based on type
        if report.report_type == Report.PROFIT_LOSS:
            data = generate_profit_loss_data(report)
        elif report.report_type == Report.EXPENSE_SUMMARY:
            data = generate_expense_summary_data(report)
        else:
            raise ValueError(f"Unknown report type: {report.report_type}")
        
        # Generate the file based on format
        if report.format == Report.CSV:
            file_path = generate_csv_report(report, data)
        elif report.format == Report.PDF:
            file_path = generate_pdf_report(report, data)
        else:
            raise ValueError(f"Unknown report format: {report.format}")
        
        # Mark as completed
        report.mark_as_completed(file_path)
        
        return f"Report {report_id} generated successfully at {file_path}"
        
    except Report.DoesNotExist:
        error_msg = f"Report {report_id} not found"
        return error_msg
    except Exception as e:
        error_msg = f"Error generating report {report_id}: {str(e)}"
        try:
            report = Report.objects.get(id=report_id)
            report.mark_as_failed(error_msg)
        except:
            pass
        return error_msg


def generate_profit_loss_data(report):
    """
    Generate Profit & Loss data for the specified date range.
    """
    transactions = Transaction.objects.filter(
        owner=report.owner,
        transaction_date__gte=report.start_date,
        transaction_date__lte=report.end_date,
        is_tax_deductible=True
    )
    
    # Calculate total expenses by category
    expenses_by_category = transactions.values('category').annotate(
        total=Sum('total_amount')
    ).order_by('-total')
    
    # Calculate total expenses and VAT
    total_expenses = transactions.aggregate(
        total=Sum('total_amount'),
        total_vat=Sum('vat_amount')
    )
    
    data = {
        'report_type': 'Profit & Loss',
        'period': f"{report.start_date} to {report.end_date}",
        'total_expenses': total_expenses['total'] or Decimal('0.00'),
        'total_vat': total_expenses['total_vat'] or Decimal('0.00'),
        'expenses_by_category': expenses_by_category,
        'transaction_count': transactions.count(),
    }
    
    return data


def generate_expense_summary_data(report):
    """
    Generate Expense Summary data for the specified date range.
    """
    transactions = Transaction.objects.filter(
        owner=report.owner,
        transaction_date__gte=report.start_date,
        transaction_date__lte=report.end_date
    ).select_related('receipt')
    
    # Group by category and month
    expenses_by_category = transactions.values('category').annotate(
        total=Sum('total_amount'),
        count=Count('id')
    ).order_by('category')
    
    # Get detailed transaction list
    transaction_details = []
    for transaction in transactions.order_by('-transaction_date'):
        transaction_details.append({
            'date': transaction.transaction_date,
            'vendor': transaction.vendor_name or 'Unknown',
            'category': transaction.get_category_display(),
            'amount': transaction.total_amount,
            'vat': transaction.vat_amount,
            'deductible': transaction.is_tax_deductible,
        })
    
    data = {
        'report_type': 'Expense Summary',
        'period': f"{report.start_date} to {report.end_date}",
        'expenses_by_category': expenses_by_category,
        'transaction_details': transaction_details,
        'transaction_count': transactions.count(),
    }
    
    return data


def generate_csv_report(report, data):
    """
    Generate a CSV format report.
    """
    # Create reports directory if it doesn't exist
    reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    # Generate filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{report.report_type}_{report.owner.id}_{timestamp}.csv"
    file_path = os.path.join(reports_dir, filename)
    
    with open(file_path, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.writer(csvfile)
        
        # Write header information
        writer.writerow([data['report_type']])
        writer.writerow(['Period:', data['period']])
        writer.writerow(['Generated:', datetime.now().strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])  # Empty row
        
        if report.report_type == Report.PROFIT_LOSS:
            # Write expenses by category
            writer.writerow(['Expenses by Category'])
            writer.writerow(['Category', 'Amount (£)'])
            for expense in data['expenses_by_category']:
                writer.writerow([
                    Transaction.CATEGORY_CHOICES[expense['category']][1] if expense['category'] else 'Unknown',
                    f"{expense['total']:.2f}"
                ])
            
            writer.writerow([])  # Empty row
            writer.writerow(['Summary'])
            writer.writerow(['Total Expenses:', f"£{data['total_expenses']:.2f}"])
            writer.writerow(['Total VAT:', f"£{data['total_vat']:.2f}"])
            writer.writerow(['Transaction Count:', data['transaction_count']])
            
        elif report.report_type == Report.EXPENSE_SUMMARY:
            # Write detailed transactions
            writer.writerow(['Transaction Details'])
            writer.writerow(['Date', 'Vendor', 'Category', 'Amount (£)', 'VAT (£)', 'Tax Deductible'])
            
            for transaction in data['transaction_details']:
                writer.writerow([
                    transaction['date'].strftime('%Y-%m-%d'),
                    transaction['vendor'],
                    transaction['category'],
                    f"{transaction['amount']:.2f}",
                    f"{transaction['vat']:.2f}",
                    'Yes' if transaction['deductible'] else 'No'
                ])
            
            writer.writerow([])  # Empty row
            writer.writerow(['Summary by Category'])
            writer.writerow(['Category', 'Amount (£)', 'Count'])
            for expense in data['expenses_by_category']:
                category_name = dict(Transaction.CATEGORY_CHOICES).get(expense['category'], 'Unknown')
                writer.writerow([
                    category_name,
                    f"{expense['total']:.2f}",
                    expense['count']
                ])
    
    # Return relative path for storage
    return os.path.join('reports', filename)


def generate_pdf_report(report, data):
    """
    Generate a PDF format report.
    For now, this is a placeholder - PDF generation would require additional libraries.
    """
    # For now, generate a simple text file as placeholder
    # In a full implementation, you would use libraries like reportlab or weasyprint
    
    reports_dir = os.path.join(settings.MEDIA_ROOT, 'reports')
    os.makedirs(reports_dir, exist_ok=True)
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{report.report_type}_{report.owner.id}_{timestamp}.txt"
    file_path = os.path.join(reports_dir, filename)
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(f"{data['report_type']}\n")
        f.write(f"Period: {data['period']}\n")
        f.write(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        
        if report.report_type == Report.PROFIT_LOSS:
            f.write("Expenses by Category:\n")
            for expense in data['expenses_by_category']:
                category_name = dict(Transaction.CATEGORY_CHOICES).get(expense['category'], 'Unknown')
                f.write(f"  {category_name}: £{expense['total']:.2f}\n")
            
            f.write(f"\nSummary:\n")
            f.write(f"Total Expenses: £{data['total_expenses']:.2f}\n")
            f.write(f"Total VAT: £{data['total_vat']:.2f}\n")
            f.write(f"Transaction Count: {data['transaction_count']}\n")
        
        elif report.report_type == Report.EXPENSE_SUMMARY:
            f.write("Transaction Details:\n")
            for transaction in data['transaction_details']:
                f.write(f"  {transaction['date']} - {transaction['vendor']}: £{transaction['amount']:.2f} ({transaction['category']})\n")
    
    return os.path.join('reports', filename)