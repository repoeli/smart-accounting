from celery import shared_task
from django.conf import settings
from django.utils import timezone
import httpx
import os
from .models import Receipt, BulkUploadJob, Transaction


@shared_task(bind=True)
def process_receipt_task(self, receipt_id, bulk_upload_job_id=None):
    """
    Process a receipt asynchronously using Veryfi API.
    Optionally updates a BulkUploadJob progress.
    """
    try:
        receipt = Receipt.objects.get(id=receipt_id)
        bulk_upload_job = None
        
        if bulk_upload_job_id:
            bulk_upload_job = BulkUploadJob.objects.get(id=bulk_upload_job_id)
            
        # Update receipt status to processing
        receipt.ocr_status = Receipt.PROCESSING
        receipt.save()
        
        # Get the file path
        file_path = receipt.file.path
        
        # Process with Veryfi API
        headers = {
            "CLIENT-ID": settings.VERYFI_CLIENT_ID,
            "AUTHORIZATION": f"apikey {settings.VERYFI_USERNAME}:{settings.VERYFI_API_KEY}",
            "Content-Type": "application/json"
        }
        
        # Read file as binary and prepare for sending
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Get filename from path
        filename = os.path.basename(file_path)
        
        # Create request data
        request_data = {
            "file_name": filename,
            "file_data": httpx._utils.encode_bytes(file_data),  # Base64 encode
            "categories": ["Expense", "Meals", "Travel"],
            "auto_delete": False,
            "boost_mode": 1,  # Enable boost mode for faster processing
        }
        
        # Send to Veryfi API with httpx
        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{settings.VERYFI_ENVIRONMENT_URL}/api/v8/partner/documents/",
                headers=headers,
                json=request_data
            )
            
            if response.status_code == 200:
                veryfi_data = response.json()
                
                # Update receipt with OCR results
                receipt.ocr_status = Receipt.COMPLETED
                receipt.veryfi_response_data = veryfi_data
                receipt.veryfi_document_id = veryfi_data.get('id')
                receipt.ocr_confidence = veryfi_data.get('ocr_confidence', 0) * 100  # Convert 0-1 to 0-100
                receipt.is_auto_approved = veryfi_data.get('ocr_confidence', 0) >= 0.85  # Auto-approve if confidence > 85%
                receipt.save()
                
                # Create transaction from the data
                create_transaction_from_veryfi_data(receipt, veryfi_data)
                
                # Update bulk upload job progress if applicable
                if bulk_upload_job:
                    bulk_upload_job.update_progress(success=True)
                
                return {'status': 'success', 'receipt_id': receipt_id}
            else:
                # Handle error
                receipt.ocr_status = Receipt.FAILED
                receipt.save()
                
                # Update bulk upload job progress if applicable
                if bulk_upload_job:
                    bulk_upload_job.update_progress(success=False)
                
                return {'status': 'error', 'receipt_id': receipt_id, 'error': f'Veryfi API error: {response.status_code}'}
                
    except Receipt.DoesNotExist:
        return {'status': 'error', 'receipt_id': receipt_id, 'error': 'Receipt not found'}
    except BulkUploadJob.DoesNotExist:
        return {'status': 'error', 'receipt_id': receipt_id, 'error': 'BulkUploadJob not found'}
    except Exception as e:
        # Update receipt status to failed
        try:
            receipt = Receipt.objects.get(id=receipt_id)
            receipt.ocr_status = Receipt.FAILED
            receipt.save()
            
            # Update bulk upload job progress if applicable
            if bulk_upload_job_id:
                try:
                    bulk_upload_job = BulkUploadJob.objects.get(id=bulk_upload_job_id)
                    bulk_upload_job.update_progress(success=False)
                except BulkUploadJob.DoesNotExist:
                    pass
        except:
            pass
            
        return {'status': 'error', 'receipt_id': receipt_id, 'error': str(e)}


def create_transaction_from_veryfi_data(receipt, veryfi_data):
    """
    Create a transaction from Veryfi response data.
    """
    try:
        # Extract transaction data from Veryfi response
        transaction_data = {
            'receipt': receipt,
            'owner': receipt.owner,
            'vendor_name': veryfi_data.get('vendor', {}).get('name', ''),
            'transaction_date': veryfi_data.get('date', timezone.now().date()),
            'total_amount': veryfi_data.get('total', 0),
            'currency': veryfi_data.get('currency_code', 'GBP'),
            'vat_amount': veryfi_data.get('tax', 0),
            'is_vat_registered': bool(veryfi_data.get('vendor', {}).get('vat_number')),
            'category': map_veryfi_category_to_internal(veryfi_data.get('category')),
            'line_items': veryfi_data.get('line_items', []),
        }
        
        # Create or update transaction
        Transaction.objects.update_or_create(
            receipt=receipt,
            defaults=transaction_data
        )
        return True
    except Exception as e:
        print(f"Error creating transaction: {str(e)}")
        return False


def map_veryfi_category_to_internal(veryfi_category):
    """
    Map Veryfi categories to our internal categories.
    """
    mapping = {
        'Meals & Entertainment': Transaction.MEALS,
        'Travel': Transaction.TRAVEL,
        'Supplies & Materials': Transaction.OFFICE_SUPPLIES,
        'Utilities': Transaction.UTILITIES,
        'Software': Transaction.SOFTWARE,
        'Equipment': Transaction.HARDWARE,
        'Professional Services': Transaction.PROFESSIONAL_SERVICES,
        'Advertising': Transaction.MARKETING,
        'Rent or Lease': Transaction.RENT,
    }
    
    if not veryfi_category:
        return Transaction.OTHER
        
    return mapping.get(veryfi_category, Transaction.OTHER)