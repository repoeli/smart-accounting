from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Category, Receipt, Transaction

User = get_user_model()


class CategoryModelTest(TestCase):
    """Test Category model functionality."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
    
    def test_create_custom_category(self):
        """Test creating a custom category."""
        category = Category.objects.create(
            name='Custom Expense',
            type='expense',
            description='My custom expense category',
            owner=self.user
        )
        
        self.assertEqual(category.name, 'Custom Expense')
        self.assertEqual(category.type, 'expense')
        self.assertEqual(category.owner, self.user)
        self.assertFalse(category.is_default)
        self.assertTrue(category.can_be_deleted)
    
    def test_default_categories_exist(self):
        """Test that default categories are created."""
        # Check some default expense categories
        self.assertTrue(Category.objects.filter(
            name='Office Supplies', 
            type='expense', 
            is_default=True
        ).exists())
        
        # Check some default income categories
        self.assertTrue(Category.objects.filter(
            name='Sales Revenue', 
            type='income', 
            is_default=True
        ).exists())
    
    def test_default_category_cannot_be_deleted(self):
        """Test that default categories cannot be deleted."""
        default_category = Category.objects.filter(is_default=True).first()
        self.assertFalse(default_category.can_be_deleted)
    
    def test_unique_constraint(self):
        """Test unique constraint for name/type per user."""
        # Create first category
        Category.objects.create(
            name='Test Category',
            type='expense',
            owner=self.user
        )
        
        # Try to create duplicate - should raise validation error
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            duplicate = Category(
                name='Test Category',
                type='expense',
                owner=self.user
            )
            duplicate.full_clean()


class CategoryAPITest(APITestCase):
    """Test Category API endpoints."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            username='otheruser',
            password='testpass123'
        )
        
        # Get JWT token for authentication
        refresh = RefreshToken.for_user(self.user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {refresh.access_token}')
        
        self.category_url = '/api/v1/receipts/categories/'
    
    def test_list_categories(self):
        """Test listing categories returns defaults + user's categories."""
        # Create a custom category
        Category.objects.create(
            name='My Custom Category',
            type='expense',
            owner=self.user
        )
        
        response = self.client.get(self.category_url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Should see default categories + user's custom category
        # The response includes pagination, so get the results
        categories = response.data.get('results', response.data)  # Handle both paginated and non-paginated
        
        # Verify we have our custom category
        custom_category = next(
            (cat for cat in categories if cat['name'] == 'My Custom Category'), 
            None
        )
        self.assertIsNotNone(custom_category)
        self.assertFalse(custom_category['is_default'])
        
        # Verify we have some default categories
        default_categories = [cat for cat in categories if cat['is_default']]
        self.assertGreater(len(default_categories), 0)
    
    def test_create_custom_category(self):
        """Test creating a custom category."""
        data = {
            'name': 'New Custom Category',
            'type': 'income',
            'description': 'A new category for testing'
        }
        
        response = self.client.post(self.category_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Custom Category')
        self.assertEqual(response.data['type'], 'income')
        self.assertEqual(response.data['owner'], self.user.id)
        self.assertFalse(response.data['is_default'])
    
    def test_cannot_create_duplicate_category(self):
        """Test that duplicate category names are not allowed."""
        # Create first category
        Category.objects.create(
            name='Duplicate Test',
            type='expense',
            owner=self.user
        )
        
        # Try to create duplicate
        data = {
            'name': 'Duplicate Test',
            'type': 'expense',
            'description': 'Should fail'
        }
        
        response = self.client.post(self.category_url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_custom_category(self):
        """Test updating a custom category."""
        category = Category.objects.create(
            name='Original Name',
            type='expense',
            owner=self.user
        )
        
        data = {
            'name': 'Updated Name',
            'type': 'expense',
            'description': 'Updated description'
        }
        
        response = self.client.put(f'{self.category_url}{category.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Name')
    
    def test_cannot_update_default_category(self):
        """Test that default categories cannot be updated."""
        default_category = Category.objects.filter(is_default=True).first()
        
        data = {
            'name': 'Should Not Update',
            'type': default_category.type,
            'description': 'Should fail'
        }
        
        response = self.client.put(f'{self.category_url}{default_category.id}/', data)
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_delete_custom_category(self):
        """Test deleting a custom category."""
        category = Category.objects.create(
            name='To Delete',
            type='expense',
            owner=self.user
        )
        
        response = self.client.delete(f'{self.category_url}{category.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=category.id).exists())
    
    def test_cannot_delete_default_category(self):
        """Test that default categories cannot be deleted."""
        default_category = Category.objects.filter(is_default=True).first()
        
        response = self.client.delete(f'{self.category_url}{default_category.id}/')
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_filter_categories_by_type(self):
        """Test filtering categories by type."""
        response = self.client.get(f'{self.category_url}by_type/?type=income')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # All returned categories should be income type
        categories = response.data if isinstance(response.data, list) else response.data.get('results', [])
        for category in categories:
            self.assertEqual(category['type'], 'income')
    
    def test_authentication_required(self):
        """Test that authentication is required for all endpoints."""
        # Remove authentication
        self.client.credentials()
        
        response = self.client.get(self.category_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
