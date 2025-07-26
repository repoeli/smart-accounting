/**
 * App Routes
 * Main routing configuration for the application
 */

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Layout Components
import PublicLayout from '../components/layout/PublicLayout';
import PrivateLayout from '../components/layout/PrivateLayout';

// Protected Route Component
import ProtectedRoute from '../components/common/ProtectedRoute';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage';
import ResetPasswordPage from '../pages/auth/ResetPasswordPage';
import EmailVerificationPage from '../pages/auth/EmailVerificationPage';
import EmailVerificationSentPage from '../pages/auth/EmailVerificationSentPage';

// Dashboard Pages
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProfilePage from '../pages/profile/ProfilePage';

// Receipt Pages (v2 Only)
import ReceiptPageV2 from '../pages/ReceiptPageV2'; // New v2 page
import ProfessionalReceiptDashboard from '../pages/ProfessionalReceiptDashboard'; // Professional UI
import ReceiptPageSimple from '../pages/ReceiptPageSimple'; // Simple fallback page

// DEBUG - Diagnostic Component for Critical Issue Resolution
import ReceiptUploadDiagnostic from '../components/debug/ReceiptUploadDiagnostic';

// Settings Pages
import SettingsPage from '../pages/settings/SettingsPage';

// Reports Pages
import ReportsPage from '../components/reports/ReportsPage';
import ReportsTestPage from '../components/reports/ReportsTestPage';

// Subscription Pages
import SubscriptionPage from '../components/subscriptions/SubscriptionPage';
import SubscriptionDetails from '../components/subscriptions/SubscriptionDetails';
import Checkout from '../components/subscriptions/Checkout';
import PaymentHistory from '../components/subscriptions/PaymentHistory';
import SubscriptionSuccess from '../components/subscriptions/SubscriptionSuccess';
import SubscriptionTestPage from '../components/subscriptions/SubscriptionTestPage';

// Debug/Test Components (development only)
import TokenDebug from '../components/debug/TokenDebug';
import SimpleTokenTest from '../components/test/SimpleTokenTest';
import EmailVerificationTest from '../components/test/EmailVerificationTest';

// Error Pages
import NotFoundPage from '../pages/error/NotFoundPage';

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading spinner while checking auth status
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<PublicLayout />}>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
          }
        />
        <Route
          path="/register"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />
          }
        />
        <Route
          path="/forgot-password"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPasswordPage />
          }
        />
        <Route
          path="/reset-password/:token"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <ResetPasswordPage />
          }
        />
        <Route
          path="/verify-email/:token"
          element={<EmailVerificationPage />}
        />
        <Route
          path="/verify-email-sent"
          element={<EmailVerificationSentPage />}
        />
        
        {/* Debug/Test Routes (development only) */}
        <Route path="/token-debug" element={<TokenDebug />} />
        <Route path="/simple-test" element={<SimpleTokenTest />} />
        <Route path="/email-test" element={<EmailVerificationTest />} />
        <Route path="/upload-diagnostic" element={<ReceiptUploadDiagnostic />} />
      </Route>

      {/* Protected Routes */}
      <Route
        element={
          <ProtectedRoute>
            <PrivateLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Profile */}
        <Route path="/profile" element={<ProfilePage />} />
        
        {/* Receipts - Professional Dashboard */}
        <Route path="/receipts" element={<ProfessionalReceiptDashboard />} />
        <Route path="/receipts-v2" element={<ReceiptPageV2 />} />
        <Route path="/receipts-simple" element={<ReceiptPageSimple />} />
        <Route path="/receipts/upload" element={<ProfessionalReceiptDashboard />} />
        <Route path="/receipts/list" element={<ProfessionalReceiptDashboard />} />
        <Route path="/receipts/:id" element={<ProfessionalReceiptDashboard />} />
        <Route path="/receipts/:id/edit" element={<ProfessionalReceiptDashboard />} />
        
        {/* Reports */}
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:reportType" element={<ReportsPage />} />
        <Route path="/reports-test" element={<ReportsTestPage />} />
        
        {/* Subscriptions */}
        <Route path="/subscriptions" element={<SubscriptionPage />} />
        <Route path="/subscriptions/details" element={<SubscriptionDetails />} />
        <Route path="/subscriptions/checkout" element={<Checkout />} />
        <Route path="/subscriptions/history" element={<PaymentHistory />} />
        <Route path="/subscriptions/success" element={<SubscriptionSuccess />} />
        <Route path="/subscriptions/test" element={<SubscriptionTestPage />} />
        
        {/* Settings */}
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Default Redirects */}
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />
      
      {/* 404 Page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;
