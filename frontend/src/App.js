import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

// Auth Context Provider
import { AuthProvider } from './contexts/AuthContext';

// Protected Route
import ProtectedRoute from './components/common/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';
import EmailVerificationSentPage from './pages/auth/EmailVerificationSentPage';
import PasswordResetSentPage from './pages/auth/PasswordResetSentPage';
import ChangePasswordPage from './pages/auth/ChangePasswordPage';

// Subscription Pages
import PricingPage from './pages/PricingPage';
import SubscriptionSuccessPage from './pages/SubscriptionSuccessPage';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
            <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
            <Route path="/verify-email-sent" element={<EmailVerificationSentPage />} />
            <Route path="/reset-password-sent" element={<PasswordResetSentPage />} />
            
            {/* Subscription Routes - can be accessed by both authenticated and unauthenticated users */}
            <Route path="/pricing" element={<PricingPage />} />
            
            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/change-password" element={<ChangePasswordPage />} />
              <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
              {/* Add other protected routes here */}
              <Route path="/dashboard" element={<div>Dashboard (to be implemented)</div>} />
              <Route path="/profile" element={<div>Profile (to be implemented)</div>} />
            </Route>
            
            {/* Redirect to login page for unknown routes */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
}

export default App;

export default App;
