import os
import tempfile
from decimal import Decimal
from django.test import TestCase, override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from unittest.mock import patch, MagicMock
from PIL import Image
import io

from .models import Receipt, Transaction
from .tasks import process_document_ocr, extract_text_from_file, extract_transaction_data
from .validators import validate_file_size, validate_file_extension, validate_document_file

User = get_user_model()


class FileValidationTest(TestCase):
    """Test file validation functions."""
    
    def setUp(self):
        # Create a small test image
        self.image = Image.new('RGB', (100, 100), color='red')
        self.image_file = io.BytesIO()
        self.image.save(self.image_file, format='JPEG')
        self.image_file.seek(0)
    
    def test_validate_file_size_valid(self):
        """Test that files under 10MB pass validation."""
        file = SimpleUploadedFile("test.jpg", self.image_file.read(), content_type="image/jpeg")
        # Should not raise an exception
        validate_file_size(file)
    
    def test_validate_file_size_invalid(self):
        """Test that files over 10MB fail validation."""
        # Create a mock file that's too large
        large_file = MagicMock()
        large_file.size = 11 * 1024 * 1024  # 11MB
        
        with self.assertRaises(Exception):
            validate_file_size(large_file)
    
    def test_validate_file_extension_valid(self):
        """Test that accepted file extensions pass validation."""
        valid_extensions = ['.jpg', '.jpeg', '.png', '.pdf', '.heic']
        
        for ext in valid_extensions:
            file = MagicMock()
            file.name = f"test{ext}"
            # Should not raise an exception
            validate_file_extension(file)
    
    def test_validate_file_extension_invalid(self):
        """Test that unaccepted file extensions fail validation."""
        invalid_extensions = ['.txt', '.doc', '.xls', '.gif']
        
        for ext in invalid_extensions:
            file = MagicMock()
            file.name = f"test{ext}"
            
            with self.assertRaises(Exception):
                validate_file_extension(file)


class ReceiptModelTest(TestCase):
    """Test Receipt model functionality."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='test@example.com',
            password='testpass123'
        )
        self.accounting_firm_user = User.objects.create_user(
            email='firm@example.com',
            username='firm@example.com',
            password='testpass123',
            user_type='accounting_firm'
        )
        self.client_user = User.objects.create_user(
            email='client@example.com',
            username='client@example.com',
            password='testpass123'
        )
    
    def test_receipt_creation(self):
        """Test basic receipt creation."""
        # Create a small test image
        image = Image.new('RGB', (100, 100), color='red')
        image_file = io.BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        file = SimpleUploadedFile("test.jpg", image_file.read(), content_type="image/jpeg")
        
        receipt = Receipt.objects.create(
            owner=self.user,
            file=file,
            original_filename="test.jpg"
        )
        
        self.assertEqual(receipt.owner, self.user)
        self.assertEqual(receipt.original_filename, "test.jpg")
        self.assertEqual(receipt.ocr_status, Receipt.PENDING)
        self.assertIsNone(receipt.assigned_client)
    
    def test_receipt_with_assigned_client(self):
        """Test receipt creation with assigned client."""
        # Create a small test image
        image = Image.new('RGB', (100, 100), color='red')
        image_file = io.BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        file = SimpleUploadedFile("test.jpg", image_file.read(), content_type="image/jpeg")
        
        receipt = Receipt.objects.create(
            owner=self.accounting_firm_user,
            assigned_client=self.client_user,
            file=file,
            original_filename="test.jpg"
        )
        
        self.assertEqual(receipt.owner, self.accounting_firm_user)
        self.assertEqual(receipt.assigned_client, self.client_user)


class ReceiptAPITest(APITestCase):
    """Test Receipt API endpoints."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='test@example.com',
            password='testpass123'
        )
        self.accounting_firm_user = User.objects.create_user(
            email='firm@example.com',
            username='firm@example.com',
            password='testpass123',
            user_type='accounting_firm'
        )
        self.client_user = User.objects.create_user(
            email='client@example.com',
            username='client@example.com',
            password='testpass123'
        )
    
    def create_test_image(self):
        """Create a test image file."""
        image = Image.new('RGB', (100, 100), color='red')
        image_file = io.BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        return SimpleUploadedFile("test.jpg", image_file.read(), content_type="image/jpeg")
    
    @patch('receipts.tasks.process_document_ocr.delay')
    def test_upload_document_success(self, mock_task):
        """Test successful document upload."""
        self.client.force_authenticate(user=self.user)
        
        file = self.create_test_image()
        
        response = self.client.post('/api/v1/receipts/', {
            'file': file
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('message', response.data)
        self.assertEqual(response.data['ocr_status'], 'pending')
        
        # Check that the Celery task was called
        mock_task.assert_called_once()
        
        # Check that receipt was created
        self.assertEqual(Receipt.objects.count(), 1)
        receipt = Receipt.objects.first()
        self.assertEqual(receipt.owner, self.user)
        self.assertEqual(receipt.ocr_status, Receipt.PENDING)
    
    @patch('receipts.tasks.process_document_ocr.delay')
    def test_upload_document_with_client_assignment(self, mock_task):
        """Test document upload with client assignment for accounting firm."""
        self.client.force_authenticate(user=self.accounting_firm_user)
        
        file = self.create_test_image()
        
        response = self.client.post('/api/v1/receipts/', {
            'file': file,
            'assigned_client': self.client_user.id
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        receipt = Receipt.objects.first()
        self.assertEqual(receipt.assigned_client, self.client_user)
    
    def test_upload_document_unauthorized(self):
        """Test document upload without authentication."""
        file = self.create_test_image()
        
        response = self.client.post('/api/v1/receipts/', {
            'file': file
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_invalid_file_extension(self):
        """Test upload with invalid file extension."""
        self.client.force_authenticate(user=self.user)
        
        file = SimpleUploadedFile("test.txt", b"test content", content_type="text/plain")
        
        response = self.client.post('/api/v1/receipts/', {
            'file': file
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OCRTaskTest(TestCase):
    """Test OCR processing tasks."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='test@example.com',
            password='testpass123'
        )
    
    def test_extract_transaction_data(self):
        """Test transaction data extraction from OCR text."""
        sample_ocr_text = """
        TESCO EXPRESS
        123 HIGH STREET
        LONDON
        
        Date: 15/01/2024
        
        BANANAS          £2.50
        MILK             £1.20
        BREAD            £0.85
        
        TOTAL            £4.55
        VAT              £0.75
        """
        
        extracted_data = extract_transaction_data(sample_ocr_text)
        
        self.assertIn('vendor_name', extracted_data)
        self.assertIn('total_amount', extracted_data)
        self.assertIn('vat_amount', extracted_data)
        self.assertIn('transaction_date', extracted_data)
        
        # Check that some data was extracted
        self.assertTrue(extracted_data['vendor_name'])
        self.assertIsNotNone(extracted_data['total_amount'])
    
    @patch('receipts.tasks.extract_text_from_file')
    @patch('receipts.tasks.create_transaction_from_extracted_data')
    def test_process_document_ocr_success(self, mock_create_transaction, mock_extract_text):
        """Test successful OCR processing."""
        # Create a receipt
        receipt = Receipt.objects.create(
            owner=self.user,
            file='test.jpg',
            original_filename='test.jpg'
        )
        
        # Mock the OCR extraction
        mock_extract_text.return_value = "Test OCR text"
        mock_create_transaction.return_value = True
        
        # Call the task
        result = process_document_ocr(receipt.id)
        
        # Refresh the receipt from database
        receipt.refresh_from_db()
        
        self.assertEqual(receipt.ocr_status, Receipt.COMPLETED)
        self.assertEqual(receipt.ocr_text, "Test OCR text")
        self.assertIsNotNone(receipt.extracted_data)
    
    def test_process_document_ocr_receipt_not_found(self):
        """Test OCR processing with non-existent receipt."""
        result = process_document_ocr(999)  # Non-existent receipt ID
        
        self.assertIn("not found", result)


class TransactionModelTest(TestCase):
    """Test Transaction model functionality."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='test@example.com',
            password='testpass123'
        )
        
        # Create a receipt first
        image = Image.new('RGB', (100, 100), color='red')
        image_file = io.BytesIO()
        image.save(image_file, format='JPEG')
        image_file.seek(0)
        
        file = SimpleUploadedFile("test.jpg", image_file.read(), content_type="image/jpeg")
        
        self.receipt = Receipt.objects.create(
            owner=self.user,
            file=file,
            original_filename="test.jpg"
        )
    
    def test_transaction_creation(self):
        """Test basic transaction creation."""
        transaction = Transaction.objects.create(
            receipt=self.receipt,
            owner=self.user,
            vendor_name="Test Vendor",
            transaction_date="2024-01-15",
            total_amount=Decimal("10.50"),
            vat_amount=Decimal("1.75")
        )
        
        self.assertEqual(transaction.receipt, self.receipt)
        self.assertEqual(transaction.owner, self.user)
        self.assertEqual(transaction.vendor_name, "Test Vendor")
        self.assertEqual(transaction.total_amount, Decimal("10.50"))
        self.assertEqual(transaction.currency, "GBP")  # Default currency
        self.assertTrue(transaction.is_tax_deductible)  # Default value