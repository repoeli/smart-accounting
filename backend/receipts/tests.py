from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.urls import reverse
from .models import Category, Transaction, Receipt

User = get_user_model()


class CategoryModelTest(TestCase):
    """Test cases for the Category model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
    
    def test_create_expense_category(self):
        """Test creating an expense category."""
        category = Category.objects.create(
            name='Test Expense',
            type='expense',
            user=self.user
        )
        self.assertEqual(category.name, 'Test Expense')
        self.assertEqual(category.type, 'expense')
        self.assertEqual(category.user, self.user)
        self.assertFalse(category.is_default)
    
    def test_create_income_category(self):
        """Test creating an income category."""
        category = Category.objects.create(
            name='Test Income',
            type='income',
            user=self.user
        )
        self.assertEqual(category.name, 'Test Income')
        self.assertEqual(category.type, 'income')
        self.assertEqual(category.user, self.user)
    
    def test_unique_constraint(self):
        """Test that users cannot create duplicate categories."""
        Category.objects.create(
            name='Duplicate',
            type='expense',
            user=self.user
        )
        
        with self.assertRaises(Exception):
            Category.objects.create(
                name='Duplicate',
                type='expense',
                user=self.user
            )
    
    def test_different_users_can_have_same_category_name(self):
        """Test that different users can have categories with the same name."""
        user2 = User.objects.create_user(
            email='test2@example.com',
            username='testuser2',
            password='testpass123'
        )
        
        category1 = Category.objects.create(
            name='Same Name',
            type='expense',
            user=self.user
        )
        
        category2 = Category.objects.create(
            name='Same Name',
            type='expense',
            user=user2
        )
        
        self.assertNotEqual(category1.id, category2.id)
        self.assertEqual(category1.name, category2.name)


class CategoryAPITest(APITestCase):
    """Test cases for the Category API endpoints."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            password='testpass123'
        )
        self.user2 = User.objects.create_user(
            email='test2@example.com',
            username='testuser2',
            password='testpass123'
        )
        
        # Create some test categories
        self.category1 = Category.objects.create(
            name='Test Expense',
            type='expense',
            user=self.user
        )
        self.category2 = Category.objects.create(
            name='Test Income',
            type='income',
            user=self.user
        )
        self.other_user_category = Category.objects.create(
            name='Other User Category',
            type='expense',
            user=self.user2
        )
    
    def test_list_categories_requires_authentication(self):
        """Test that listing categories requires authentication."""
        url = '/api/v1/receipts/categories/'
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_list_user_categories(self):
        """Test listing categories for authenticated user."""
        self.client.force_authenticate(user=self.user)
        url = '/api/v1/receipts/categories/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # Should see own categories but not other user's categories
        category_names = [cat['name'] for cat in response.data['results']]
        self.assertIn('Test Expense', category_names)
        self.assertIn('Test Income', category_names)
        self.assertNotIn('Other User Category', category_names)
    
    def test_create_category(self):
        """Test creating a new category."""
        self.client.force_authenticate(user=self.user)
        url = '/api/v1/receipts/categories/'
        data = {
            'name': 'New Category',
            'type': 'expense',
            'description': 'A new test category'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['name'], 'New Category')
        self.assertEqual(response.data['type'], 'expense')
        
        # Verify it was created in the database
        category = Category.objects.get(id=response.data['id'])
        self.assertEqual(category.user, self.user)
        self.assertEqual(category.name, 'New Category')
    
    def test_create_duplicate_category_fails(self):
        """Test that creating a duplicate category fails."""
        self.client.force_authenticate(user=self.user)
        url = '/api/v1/receipts/categories/'
        data = {
            'name': 'Test Expense',  # This already exists
            'type': 'expense'
        }
        response = self.client.post(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_update_category(self):
        """Test updating a category."""
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/receipts/categories/{self.category1.id}/'
        data = {
            'name': 'Updated Category',
            'type': 'expense',
            'description': 'Updated description'
        }
        response = self.client.put(url, data)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], 'Updated Category')
        
        # Verify it was updated in the database
        self.category1.refresh_from_db()
        self.assertEqual(self.category1.name, 'Updated Category')
    
    def test_delete_category_without_transactions(self):
        """Test deleting a category that has no transactions."""
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/receipts/categories/{self.category1.id}/'
        response = self.client.delete(url)
        
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Category.objects.filter(id=self.category1.id).exists())
    
    def test_cannot_access_other_user_category(self):
        """Test that users cannot access other users' categories."""
        self.client.force_authenticate(user=self.user)
        url = f'/api/v1/receipts/categories/{self.other_user_category.id}/'
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
