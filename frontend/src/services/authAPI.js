import axios from 'axios';

// Create a base API instance
const baseAPI = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Create the auth API service
const authAPI = {
  // Register a new user
  register: async (userData) => {
    try {
      const response = await baseAPI.post('/accounts/register/', userData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Log in a user
  login: async (credentials) => {
    try {
      const response = await baseAPI.post('/accounts/token/', credentials);
      // Store the tokens
      localStorage.setItem('accessToken', response.data.access);
      localStorage.setItem('refreshToken', response.data.refresh);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Verify email address
  verifyEmail: async (token) => {
    try {
      const response = await baseAPI.post('/accounts/verify-email/', { token });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Get current user profile
  getCurrentUser: async () => {
    try {
      const response = await baseAPI.get('/accounts/me/');
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Change password
  changePassword: async (passwordData) => {
    try {
      const response = await baseAPI.post('/accounts/change_password/', passwordData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Request password reset
  requestPasswordReset: async (email) => {
    try {
      const response = await baseAPI.post('/accounts/forgot-password/', { email });
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Reset password with token
  resetPassword: async (resetData) => {
    try {
      const response = await baseAPI.post('/accounts/reset-password/', resetData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Refresh the access token
  refreshToken: async () => {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return { success: false, error: { message: 'No refresh token available' } };
    }

    try {
      const response = await baseAPI.post('/accounts/token/refresh/', { refresh: refreshToken });
      localStorage.setItem('accessToken', response.data.access);
      return { success: true, data: response.data };
    } catch (error) {
      // If refresh fails, log out the user
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return { 
        success: false, 
        error: error.response?.data || { message: 'Failed to refresh token' }
      };
    }
  },

  // Log out
  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return { success: true };
  }
};

export default authAPI;
