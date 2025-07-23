import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import authAPI from '../services/authAPI';
import axiosInstance from '../utils/axiosConfig';

// Create the auth context
const AuthContext = createContext(null);

// Function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    // Simple token parsing without external library
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    const currentTime = Date.now() / 1000;
    // Add some buffer time (30 seconds) to avoid edge cases
    return payload.exp < currentTime + 30;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
};

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Log out a user
  const logout = useCallback(async () => {
    authAPI.logout();
    setCurrentUser(null);
    navigate('/login');
  }, [navigate]);

  // Get the current access token
  const getAccessToken = useCallback(async () => {
    const token = localStorage.getItem('accessToken');
    
    // If no token exists or it's expired, try to refresh
    if (!token || isTokenExpired(token)) {
      const refreshResult = await authAPI.refreshToken();
      if (!refreshResult.success) {
        // If refresh fails, return null
        return null;
      }
      return refreshResult.data.access;
    }
    
    return token;
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Check if we have a valid token
      const token = await getAccessToken();
      
      if (token) {
        try {
          // Fetch the current user profile using axiosInstance with proper token
          const response = await axiosInstance.get('/accounts/me/');
          setCurrentUser(response.data);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          setError('Failed to fetch user profile');
          await logout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, [getAccessToken, logout]);

  // Register a new user
  const register = async (userData) => {
    setLoading(true);
    setError(null);
    
    const result = await authAPI.register(userData);
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error);
      return result;
    }
    
    // Navigate to email verification sent screen with email in state
    navigate('/verify-email-sent', { state: { email: userData.email } });
    return result;
  };

  // Log in a user
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    try {
      // Use axiosInstance for consistent error handling
      const response = await axiosInstance.post('/accounts/token/', credentials);
      
      // Store tokens
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      
      // Fetch user profile with the new token
      try {
        const userResponse = await axiosInstance.get('/accounts/me/');
        setCurrentUser(userResponse.data);
        setLoading(false);
        return { success: true, data: response.data };
      } catch (profileError) {
        console.error('Failed to fetch user profile after login:', profileError);
        setError({message: 'Login successful but failed to fetch profile'});
        await logout();
        setLoading(false);
        return { success: false, error: {message: 'Failed to fetch user profile'} };
      }
    } catch (error) {
      console.error('Login error:', error.response?.data);
      setError(error.response?.data || {message: 'Login failed'});
      setLoading(false);
      return { 
        success: false, 
        error: error.response?.data || {message: 'Network error occurred'} 
      };
    }
  };

  // Verify email
  const verifyEmail = async (token) => {
    setLoading(true);
    setError(null);
    
    const result = await authAPI.verifyEmail(token);
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error);
    }
    
    return result;
  };

  // Resend verification email
  const resendVerificationEmail = async (email) => {
    setLoading(true);
    setError(null);
    
    const result = await authAPI.resendVerificationEmail(email);
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error);
    }
    
    return result;
  };

  // Request password reset
  const requestPasswordReset = async (email) => {
    setLoading(true);
    setError(null);
    
    const result = await authAPI.requestPasswordReset(email);
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error);
    } else {
      navigate('/reset-password-sent');
    }
    
    return result;
  };

  // Reset password
  const resetPassword = async (resetData) => {
    setLoading(true);
    setError(null);
    
    const result = await authAPI.resetPassword(resetData);
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error);
    } else {
      navigate('/login');
    }
    
    return result;
  };

  // Change password
  const changePassword = async (passwordData) => {
    setLoading(true);
    setError(null);
    
    const result = await authAPI.changePassword(passwordData);
    
    setLoading(false);
    
    if (!result.success) {
      setError(result.error);
    }
    
    return result;
  };

  // Check if user is authenticated
  const isAuthenticated = !!currentUser;

  // Create an object with all the context values
  const contextValue = {
    currentUser,
    loading,
    error,
    isAuthenticated,
    register,
    login,
    logout,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    changePassword,
    getAccessToken
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Create a custom hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
