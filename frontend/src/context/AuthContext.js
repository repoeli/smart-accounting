/**
 * Auth Context - Clean Version
 * Provides authentication state and methods throughout the app
 */
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import authManager from '../services/auth/AuthManager';
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
  console.log('🔄 AuthContext Reducer:', action.type, action.payload);
  console.log('Previous state:', { 
    isAuthenticated: state.isAuthenticated, 
    isLoading: state.isLoading, 
    user: state.user ? 'present' : 'null' 
  });
  
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      const loadingState = {
        ...state,
        isLoading: action.payload
      };
      console.log('New loading state:', loadingState);
      return loadingState;
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      const loginState = {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: action.payload.user,
        error: null
      };
      console.log('✅ New login state:', { 
        isAuthenticated: loginState.isAuthenticated, 
        isLoading: loginState.isLoading, 
        user: loginState.user ? 'present' : 'null' 
      });
      return loginState;
    case AUTH_ACTIONS.LOGOUT:
      const logoutState = {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null
      };
      console.log('🚪 New logout state:', logoutState);
      return logoutState;
    case AUTH_ACTIONS.SET_USER:
      const userState = {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        isLoading: false
      };
      console.log('👤 New user state:', { 
        isAuthenticated: userState.isAuthenticated, 
        isLoading: userState.isLoading, 
        user: userState.user ? 'present' : 'null' 
      });
      return userState;
    case AUTH_ACTIONS.SET_ERROR:
      const errorState = {
        ...state,
        error: action.payload,
        isLoading: false
      };
      console.log('❌ New error state:', errorState);
      return errorState;
    case AUTH_ACTIONS.CLEAR_ERROR:
      const clearErrorState = {
        ...state,
        error: null
      };
      console.log('🧹 Cleared error state:', clearErrorState);
      return clearErrorState;
    default:
      console.log('Unknown action type:', action.type);
      return state;
  }
}

// Create context
const AuthContext = createContext();

// Provider component
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const navigate = useNavigate();

  // Initialize auth state on mount
  useEffect(() => {
    console.log('AuthContext: useEffect called - initializing auth');
    initializeAuth();
  }, []);

  // Listen for auth events
  useEffect(() => {
    const handleLogin = (event) => {
      const { user } = event.detail;
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user }
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
      console.log('AuthContext: Initializing auth with tokens:', tokens);
      
      if (!tokens?.access) {
        console.log('AuthContext: No access token found');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        return;
      }

      console.log('AuthContext: Checking if token is valid...');
      if (tokenStorage.isTokenExpired(tokens.access)) {
        console.log('AuthContext: Access token is expired');
        tokenStorage.clearTokens();
        dispatch({ type: AUTH_ACTIONS.LOGOUT });
        return;
      }

      console.log('AuthContext: Token is valid, fetching user profile...');
      // Verify token and get user profile
      const user = await authManager.getCurrentUser();
      console.log('AuthContext: User profile response:', user);
      
      dispatch({
        type: AUTH_ACTIONS.SET_USER,
        payload: user.data
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      tokenStorage.clearTokens();
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
      console.log('🚀 AuthContext: Starting login process');
      const response = await authManager.login(credentials);
      console.log('✅ AuthContext: AuthManager login completed:', response);
      
      if (response.success) {
        console.log('🔄 AuthContext: Dispatching LOGIN_SUCCESS');
        
        // Dispatch LOGIN_SUCCESS with user data
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: { user: response.data.user }
        });
        
        // Wait for tokens to be fully stored and verified
        console.log('⏳ AuthContext: Waiting for token storage verification...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Verify tokens were stored correctly
        const storedTokens = tokenStorage.getTokens();
        console.log('🔍 AuthContext: Token verification after login:', {
          access: storedTokens.accessToken ? 'VERIFIED' : 'MISSING',
          refresh: storedTokens.refreshToken ? 'VERIFIED' : 'MISSING'
        });
        
        if (!storedTokens.accessToken) {
          throw new Error('Token storage failed - access token not found after login');
        }
        
        console.log('✅ AuthContext: Login process completed successfully');
        return response;
      }
    } catch (error) {
      console.error('❌ AuthContext: Login error:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.response?.data?.detail || error.message || 'Login failed'
      });
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      throw error;
    }
  }

  /**
   * Register user
   */
  async function register(userData) {
    dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: true });
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });

    try {
      console.log('AuthContext: Sending registration data to API:', userData);
      const response = await authManager.register(userData);
      console.log('AuthContext: Registration API response:', response);
      
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      
      // Navigate to email verification sent page with user email
      navigate('/verify-email-sent', { 
        state: { 
          email: userData.email,
          message: 'Registration successful! Please check your email to verify your account.'
        } 
      });
      
      return response;
    } catch (error) {
      console.error('AuthContext: Registration error:', error);
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: error.response?.data?.detail || error.message || 'Registration failed'
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
      await authManager.logout();
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
      const response = await authManager.updateProfile(profileData);
      if (response.success) {
        dispatch({
          type: AUTH_ACTIONS.SET_USER,
          payload: response.data
        });
      }
      return response;
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
  async function changePassword(oldPassword, newPassword) {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    try {
      const response = await authManager.changePassword(oldPassword, newPassword);
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
      console.log('AuthContext: Verifying email with token:', token);
      const response = await authManager.verifyEmail(token);
      console.log('AuthContext: Email verification response:', response);
      
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      
      // The authManager now returns { success, data, message } or { success: false, error }
      if (response.success) {
        return {
          success: true,
          message: response.message || 'Email verified successfully'
        };
      } else {
        // Handle error response from authManager
        const errorMessage = response.error?.message || 'Email verification failed';
        dispatch({
          type: AUTH_ACTIONS.SET_ERROR,
          payload: errorMessage
        });
        return {
          success: false,
          error: { message: errorMessage }
        };
      }
    } catch (error) {
      console.error('AuthContext: Email verification error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Email verification failed';
      dispatch({
        type: AUTH_ACTIONS.SET_ERROR,
        payload: errorMessage
      });
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      
      return {
        success: false,
        error: { message: errorMessage }
      };
    }
  }

  /**
   * Request password reset
   */
  async function requestPasswordReset(email) {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
    try {
      const response = await authManager.requestPasswordReset(email);
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
      const response = await authManager.resetPassword(token, newPassword);
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