from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from datetime import date, timedelta
from decimal import Decimal
from receipts.models import Transaction, Receipt
from .models import Report

User = get_user_model()


class ReportModelTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )
    
    def test_create_report(self):
        """Test creating a basic report."""
        report = Report.objects.create(
            owner=self.user,
            report_type=Report.PROFIT_LOSS,
            format=Report.CSV,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        self.assertEqual(report.owner, self.user)
        self.assertEqual(report.status, Report.PENDING)
        self.assertFalse(report.is_ready)
        self.assertTrue(report.is_processing)
    
    def test_mark_as_completed(self):
        """Test marking a report as completed."""
        report = Report.objects.create(
            owner=self.user,
            report_type=Report.EXPENSE_SUMMARY,
            format=Report.PDF,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        file_path = 'reports/test_report.pdf'
        report.mark_as_completed(file_path)
        
        report.refresh_from_db()
        self.assertEqual(report.status, Report.COMPLETED)
        self.assertEqual(report.file_path, file_path)
        self.assertTrue(report.is_ready)
        self.assertFalse(report.is_processing)
        self.assertIsNotNone(report.completed_at)
    
    def test_mark_as_failed(self):
        """Test marking a report as failed."""
        report = Report.objects.create(
            owner=self.user,
            report_type=Report.PROFIT_LOSS,
            format=Report.CSV,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        error_message = "Test error message"
        report.mark_as_failed(error_message)
        
        report.refresh_from_db()
        self.assertEqual(report.status, Report.FAILED)
        self.assertEqual(report.error_message, error_message)
        self.assertFalse(report.is_ready)
        self.assertFalse(report.is_processing)


class ReportAPITest(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            username='testuser',
            first_name='Test',
            last_name='User',
            password='testpass123'
        )
        
        # Create some test transactions
        # First create a receipt
        self.receipt = Receipt.objects.create(
            owner=self.user,
            file='test_receipt.jpg',
            original_filename='test_receipt.jpg',
            ocr_status=Receipt.COMPLETED
        )
        
        self.transaction = Transaction.objects.create(
            receipt=self.receipt,
            owner=self.user,
            vendor_name='Test Vendor',
            transaction_date=date.today() - timedelta(days=15),
            total_amount=Decimal('100.00'),
            vat_amount=Decimal('20.00'),
            category=Transaction.OFFICE_SUPPLIES
        )
    
    def test_create_report_unauthenticated(self):
        """Test that unauthenticated users cannot create reports."""
        url = reverse('reports:report-list-create')
        data = {
            'report_type': Report.PROFIT_LOSS,
            'format': Report.CSV,
            'start_date': date.today() - timedelta(days=30),
            'end_date': date.today()
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_create_report_authenticated(self):
        """Test creating a report with authenticated user."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('reports:report-list-create')
        data = {
            'report_type': Report.PROFIT_LOSS,
            'format': Report.CSV,
            'start_date': str(date.today() - timedelta(days=30)),
            'end_date': str(date.today())
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check that report was created
        report = Report.objects.get(id=response.data['id'])
        self.assertEqual(report.owner, self.user)
        self.assertEqual(report.report_type, Report.PROFIT_LOSS)
    
    def test_list_reports(self):
        """Test listing reports for authenticated user."""
        self.client.force_authenticate(user=self.user)
        
        # Create a test report
        report = Report.objects.create(
            owner=self.user,
            report_type=Report.EXPENSE_SUMMARY,
            format=Report.PDF,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        url = reverse('reports:report-list-create')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['id'], report.id)
    
    def test_get_report_types(self):
        """Test getting available report types and formats."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('reports:report-types')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('report_types', response.data)
        self.assertIn('formats', response.data)
        self.assertTrue(len(response.data['report_types']) > 0)
        self.assertTrue(len(response.data['formats']) > 0)
    
    def test_report_detail(self):
        """Test getting detailed report information."""
        self.client.force_authenticate(user=self.user)
        
        report = Report.objects.create(
            owner=self.user,
            report_type=Report.PROFIT_LOSS,
            format=Report.CSV,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        url = reverse('reports:report-detail', kwargs={'pk': report.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], report.id)
        self.assertEqual(response.data['report_type'], Report.PROFIT_LOSS)
    
    def test_report_status(self):
        """Test checking report status."""
        self.client.force_authenticate(user=self.user)
        
        report = Report.objects.create(
            owner=self.user,
            report_type=Report.EXPENSE_SUMMARY,
            format=Report.PDF,
            start_date=date.today() - timedelta(days=30),
            end_date=date.today()
        )
        
        url = reverse('reports:report-status', kwargs={'pk': report.id})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('report', response.data)
        self.assertEqual(response.data['report']['id'], report.id)
    
    def test_invalid_date_range(self):
        """Test creating report with invalid date range."""
        self.client.force_authenticate(user=self.user)
        
        url = reverse('reports:report-list-create')
        data = {
            'report_type': Report.PROFIT_LOSS,
            'format': Report.CSV,
            'start_date': str(date.today()),
            'end_date': str(date.today() - timedelta(days=30))  # End before start
        }
        
        response = self.client.post(url, data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
