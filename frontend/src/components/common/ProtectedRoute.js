/**
 * Protected Route Component
 * Wrapper component that protects routes requiring authentication
 */

import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function ProtectedRoute({ children, requiredRole = null }) {
  const { isAuthenticated, user, isLoading } = useAuth();
  const location = useLocation();

  console.log('=== PROTECTED ROUTE CHECK ===');
  console.log('isLoading:', isLoading);
  console.log('isAuthenticated:', isAuthenticated);
  console.log('user:', user);
  console.log('location:', location.pathname);

  // Show loading spinner while checking authentication
  if (isLoading) {
    console.log('ProtectedRoute: Showing loading spinner');
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    console.log('ProtectedRoute: User not authenticated, redirecting to login');
    return (
      <Navigate
        to="/login"
        state={{ from: location }}
        replace
      />
    );
  }

  // Check role-based access if required
  if (requiredRole && user?.role !== requiredRole) {
    console.log('ProtectedRoute: User role check failed, redirecting to dashboard');
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  console.log('ProtectedRoute: All checks passed, rendering children');
  return children;
}

export default ProtectedRoute;
