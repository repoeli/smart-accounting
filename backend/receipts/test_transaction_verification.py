from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from decimal import Decimal
from django.utils import timezone
import tempfile
from PIL import Image
import os

from .models import Receipt, Transaction

User = get_user_model()


class TransactionVerificationTestCase(TestCase):
    """
    Test case for transaction verification functionality
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        
        # Create a test receipt with a simple image
        self.test_image = self.create_test_image()
        self.receipt = Receipt.objects.create(
            owner=self.user,
            file=self.test_image,
            original_filename='test_receipt.jpg',
            ocr_status=Receipt.COMPLETED,
            ocr_confidence=90.0,
            is_auto_approved=True
        )
        
        # Create a test transaction
        self.transaction = Transaction.objects.create(
            receipt=self.receipt,
            owner=self.user,
            vendor_name='Test Vendor',
            transaction_date=timezone.now().date(),
            total_amount=Decimal('25.99'),
            currency='GBP',
            category=Transaction.OFFICE_SUPPLIES
        )
    
    def create_test_image(self):
        """Create a simple test image file"""
        # Create a simple test image
        image = Image.new('RGB', (100, 100), color='white')
        temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
        image.save(temp_file.name)
        return temp_file.name
    
    def tearDown(self):
        """Clean up test files"""
        if hasattr(self, 'test_image') and os.path.exists(self.test_image):
            os.unlink(self.test_image)
    
    def test_transaction_initial_state(self):
        """Test that transaction starts unverified"""
        self.assertFalse(self.transaction.is_verified)
        self.assertIsNone(self.transaction.verified_by)
        self.assertIsNone(self.transaction.verified_at)
        self.assertFalse(self.transaction.requires_review)
        self.assertEqual(self.transaction.review_status, 'pending')
    
    def test_transaction_requires_review_low_confidence(self):
        """Test that transaction requires review when OCR confidence is low"""
        self.receipt.ocr_confidence = 80.0  # Below 85% threshold
        self.receipt.save()
        
        # Refresh transaction from database
        self.transaction.refresh_from_db()
        self.assertTrue(self.transaction.requires_review)
        self.assertEqual(self.transaction.review_status, 'needs_review')
    
    def test_transaction_requires_review_missing_data(self):
        """Test that transaction requires review when data is missing"""
        self.transaction.vendor_name = None
        self.transaction.save()
        
        self.assertTrue(self.transaction.requires_review)
        self.assertEqual(self.transaction.review_status, 'needs_review')
    
    def test_verify_transaction_api(self):
        """Test verifying a transaction via API"""
        url = f'/api/v1/receipts/transactions/{self.transaction.pk}/verify/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh transaction from database
        self.transaction.refresh_from_db()
        self.assertTrue(self.transaction.is_verified)
        self.assertEqual(self.transaction.verified_by, self.user)
        self.assertIsNotNone(self.transaction.verified_at)
        self.assertEqual(self.transaction.review_status, 'verified')
    
    def test_unverify_transaction_api(self):
        """Test unverifying a transaction via API"""
        # First verify the transaction
        self.transaction.is_verified = True
        self.transaction.verified_by = self.user
        self.transaction.verified_at = timezone.now()
        self.transaction.save()
        
        url = f'/api/v1/receipts/transactions/{self.transaction.pk}/unverify/'
        response = self.client.post(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Refresh transaction from database
        self.transaction.refresh_from_db()
        self.assertFalse(self.transaction.is_verified)
        self.assertIsNone(self.transaction.verified_by)
        self.assertIsNone(self.transaction.verified_at)
    
    def test_filter_unverified_transactions(self):
        """Test filtering for unverified transactions"""
        # Create another receipt and verified transaction
        test_image2 = self.create_test_image()
        receipt2 = Receipt.objects.create(
            owner=self.user,
            file=test_image2,
            original_filename='test_receipt2.jpg',
            ocr_status=Receipt.COMPLETED,
            ocr_confidence=90.0,
            is_auto_approved=True
        )
        
        verified_transaction = Transaction.objects.create(
            receipt=receipt2,
            owner=self.user,
            vendor_name='Verified Vendor',
            transaction_date=timezone.now().date(),
            total_amount=Decimal('15.99'),
            currency='GBP',
            category=Transaction.MEALS,
            is_verified=True,
            verified_by=self.user,
            verified_at=timezone.now()
        )
        
        url = '/api/v1/receipts/transactions/?status=unverified'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.transaction.id)
        
        # Clean up
        if os.path.exists(test_image2):
            os.unlink(test_image2)
    
    def test_filter_verified_transactions(self):
        """Test filtering for verified transactions"""
        # Verify the existing transaction
        self.transaction.is_verified = True
        self.transaction.verified_by = self.user
        self.transaction.verified_at = timezone.now()
        self.transaction.save()
        
        url = '/api/v1/receipts/transactions/?status=verified'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], self.transaction.id)
    
    def test_transaction_stats_api(self):
        """Test transaction statistics API"""
        # Create another receipt and verified transaction
        test_image2 = self.create_test_image()
        receipt2 = Receipt.objects.create(
            owner=self.user,
            file=test_image2,
            original_filename='test_receipt2.jpg',
            ocr_status=Receipt.COMPLETED,
            ocr_confidence=90.0,
            is_auto_approved=True
        )
        
        verified_transaction = Transaction.objects.create(
            receipt=receipt2,
            owner=self.user,
            vendor_name='Verified Vendor',
            transaction_date=timezone.now().date(),
            total_amount=Decimal('15.99'),
            currency='GBP',
            category=Transaction.MEALS,
            is_verified=True,
            verified_by=self.user,
            verified_at=timezone.now()
        )
        
        url = '/api/v1/receipts/transactions/stats/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['total'], 2)
        self.assertEqual(response.data['verified'], 1)
        self.assertEqual(response.data['unverified'], 1)
        
        # Clean up
        if os.path.exists(test_image2):
            os.unlink(test_image2)
    
    def test_transaction_serializer_includes_verification_fields(self):
        """Test that transaction serializer includes verification fields"""
        url = f'/api/v1/receipts/transactions/{self.transaction.pk}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('is_verified', response.data)
        self.assertIn('verified_by', response.data)
        self.assertIn('verified_at', response.data)
        self.assertIn('requires_review', response.data)
        self.assertIn('review_status', response.data)
        
        # Check initial values
        self.assertFalse(response.data['is_verified'])
        self.assertIsNone(response.data['verified_by'])
        self.assertIsNone(response.data['verified_at'])
        self.assertFalse(response.data['requires_review'])
        self.assertEqual(response.data['review_status'], 'pending')