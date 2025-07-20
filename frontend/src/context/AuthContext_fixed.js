/**
 * Auth Context
 * Provides authentication state and methods throughout the app
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../services/api/authService';
import tokenStorage from '../services/storage/tokenStorage';

// Initial state
const initialState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  error: null
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR'
};

// Reducer
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        isLoading: action.payload
      };
      
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        error: null
      };
      
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null
      };
      
    case AUTH_ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false
      };
      
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
      
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext();

// Create provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Initialize auth state on mount
  useEffect(() => {
    initializeAuth();
  }, []);

  // Listen for auth events
  useEffect(() => {
    const handleLogin = (event) => {
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: event.detail.user }
      });
    };

    const handleLogout = () => {
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    };

    window.addEventListener('auth:login', handleLogin);
    window.addEventListener('auth:logout', handleLogout);

    return () => {
      window.removeEventListener('auth:login', handleLogin);
      window.removeEventListener('auth:logout', handleLogout);
    };
  }, []);

  /**
   * Initialize authentication state
   */
  async function initializeAuth() {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

    try {
      const tokens = tokenStorage.getTokens();
      
      if (!tokens?.access) {
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      // Verify token and get user profile
      const user = await authService.getCurrentUser();
      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: user
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      tokenStorage.removeTokens();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }

  /**
   * Login user
   */
  async function login(credentials) {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const response = await authService.login(credentials);
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: response.user }
      });
      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message || 'Login failed'
      });
      throw error;
    }
  }

  /**
   * Register new user
   */
  async function register(userData) {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const response = await authService.register(userData);
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      
      // Navigate to email verification sent page with user email
      navigate('/verify-email-sent', { 
        state: { 
          email: userData.email 
        } 
      });
      
      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message || 'Registration failed'
      });
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      throw error;
    }
  }

  /**
   * Logout user
   */
  async function logout() {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });

    try {
      await authService.logout();
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  }

  /**
   * Update user profile
   */
  async function updateProfile(profileData) {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const updatedUser = await authService.updateProfile(profileData);
      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: updatedUser
      });
      return updatedUser;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message || 'Profile update failed'
      });
      throw error;
    }
  }

  /**
   * Change password
   */
  async function changePassword(passwordData) {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const response = await authService.changePassword(passwordData);
      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message || 'Password change failed'
      });
      throw error;
    }
  }

  /**
   * Verify email
   */
  async function verifyEmail(token) {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const response = await authService.verifyEmail(token);
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message || 'Email verification failed'
      });
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async function requestPasswordReset(email) {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const response = await authService.requestPasswordReset(email);
      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message || 'Password reset request failed'
      });
      throw error;
    }
  }

  /**
   * Reset password
   */
  async function resetPassword(token, newPassword) {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      const response = await authService.resetPassword(token, newPassword);
      return response;
    } catch (error) {
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.message || 'Password reset failed'
      });
      throw error;
    }
  }

  /**
   * Clear error
   */
  function clearError() {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  }

  // Context value
  const value = {
    // State
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    user: state.user,
    error: state.error,
    
    // Actions
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    clearError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}

export default AuthContext;
