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

// Receipt Pages
import ReceiptsPage from '../pages/receipts/ReceiptsPage';
import ReceiptDetailPage from '../pages/receipts/ReceiptDetailPage';
import CreateReceiptPage from '../pages/receipts/CreateReceiptPage';

// Settings Pages
import SettingsPage from '../pages/settings/SettingsPage';

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
        
        {/* Receipts */}
        <Route path="/receipts" element={<ReceiptsPage />} />
        <Route path="/receipts/new" element={<CreateReceiptPage />} />
        <Route path="/receipts/:id" element={<ReceiptDetailPage />} />
        
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
