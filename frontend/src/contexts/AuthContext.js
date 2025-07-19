import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
// Import jwt-decode or use a direct token parsing approach
import authAPI from '../services/authAPI';

// Create the auth context
const AuthContext = createContext(null);

// Create a provider component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  // Check if token is expired
  const isTokenExpired = (token) => {
    if (!token) return true;
    try {
      // Simple token parsing without external library
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      return true;
    }
  };

  // Get the current access token
  const getAccessToken = async () => {
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
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setLoading(true);
      
      // Check if we have a valid token
      const token = await getAccessToken();
      
      if (token) {
        try {
          // Fetch the current user profile
          const result = await authAPI.getCurrentUser();
          if (result.success) {
            setCurrentUser(result.data);
          } else {
            // If profile fetch fails, log out
            await logout();
          }
        } catch (error) {
          setError('Failed to fetch user profile');
          await logout();
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

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
    
    // Navigate to login or verification screen
    navigate('/verify-email-sent');
    return result;
  };

  // Log in a user
  const login = async (credentials) => {
    setLoading(true);
    setError(null);
    
    const result = await authAPI.login(credentials);
    
    if (result.success) {
      // Fetch user profile
      const userResult = await authAPI.getCurrentUser();
      if (userResult.success) {
        setCurrentUser(userResult.data);
      } else {
        setError('Failed to fetch user profile');
        await logout();
      }
    } else {
      setError(result.error);
    }
    
    setLoading(false);
    return result;
  };

  // Log out a user
  const logout = async () => {
    authAPI.logout();
    setCurrentUser(null);
    navigate('/login');
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
