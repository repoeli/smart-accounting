from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from django.utils import timezone
import tempfile
from PIL import Image
import os

from .models import Receipt, Transaction

User = get_user_model()


class TransactionModelTestCase(TestCase):
    """
    Test case for transaction model verification functionality
    """
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
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
    
    def test_transaction_requires_review_empty_vendor(self):
        """Test that transaction requires review when vendor name is empty"""
        self.transaction.vendor_name = ''
        self.transaction.save()
        
        self.assertTrue(self.transaction.requires_review)
        self.assertEqual(self.transaction.review_status, 'needs_review')
    
    def test_transaction_requires_review_missing_amount(self):
        """Test that transaction requires review when amount is zero"""
        self.transaction.total_amount = Decimal('0.00')  # Use zero instead of None
        self.transaction.save()
        
        self.assertTrue(self.transaction.requires_review)
        self.assertEqual(self.transaction.review_status, 'needs_review')
    
    def test_transaction_verify(self):
        """Test manually verifying a transaction"""
        # Verify the transaction
        self.transaction.is_verified = True
        self.transaction.verified_by = self.user
        self.transaction.verified_at = timezone.now()
        self.transaction.save()
        
        self.assertTrue(self.transaction.is_verified)
        self.assertEqual(self.transaction.verified_by, self.user)
        self.assertIsNotNone(self.transaction.verified_at)
        self.assertEqual(self.transaction.review_status, 'verified')
        self.assertFalse(self.transaction.requires_review)  # Verified transactions don't require review
    
    def test_transaction_unverify(self):
        """Test unverifying a transaction"""
        # First verify the transaction
        self.transaction.is_verified = True
        self.transaction.verified_by = self.user
        self.transaction.verified_at = timezone.now()
        self.transaction.save()
        
        # Then unverify it
        self.transaction.is_verified = False
        self.transaction.verified_by = None
        self.transaction.verified_at = None
        self.transaction.save()
        
        self.assertFalse(self.transaction.is_verified)
        self.assertIsNone(self.transaction.verified_by)
        self.assertIsNone(self.transaction.verified_at)
    
    def test_verified_transactions_dont_require_review(self):
        """Test that verified transactions don't require review even with low confidence"""
        # Set low confidence
        self.receipt.ocr_confidence = 70.0
        self.receipt.save()
        
        # Verify transaction
        self.transaction.is_verified = True
        self.transaction.verified_by = self.user
        self.transaction.verified_at = timezone.now()
        self.transaction.save()
        
        # Should not require review because it's verified
        self.assertFalse(self.transaction.requires_review)
        self.assertEqual(self.transaction.review_status, 'verified')
    
    def test_transaction_string_representation(self):
        """Test transaction string representation"""
        expected = f"{self.transaction.vendor_name} - £{self.transaction.total_amount} - {self.transaction.transaction_date}"
        self.assertEqual(str(self.transaction), expected)
    
    def test_transaction_fields_added_to_model(self):
        """Test that new verification fields were added to the model"""
        # Check that the fields exist
        self.assertTrue(hasattr(self.transaction, 'is_verified'))
        self.assertTrue(hasattr(self.transaction, 'verified_by'))
        self.assertTrue(hasattr(self.transaction, 'verified_at'))
        
        # Check field types
        self.assertIsInstance(self.transaction.is_verified, bool)
        self.assertIsNone(self.transaction.verified_by)  # Should start as None
        self.assertIsNone(self.transaction.verified_at)  # Should start as None