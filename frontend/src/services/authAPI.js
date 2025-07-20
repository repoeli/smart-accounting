import axios from 'axios';

// Create a base API instance
const baseAPI = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false, // Set to true if using HttpOnly cookies
});

// Create the auth API service
const authAPI = {
  // Register a new user
  register: async (userData) => {
    try {
      // Convert camelCase to snake_case for backend
      const formattedUserData = {
        ...userData,
        username: userData.email, // This is required by Django's UserManager.create_user()
        postal_code: userData.postalCode,
        phone_number: userData.phoneNumber,
        first_name: userData.firstName,
        last_name: userData.lastName,
        password_confirm: userData.confirmPassword
      };
      
      // Remove camelCase fields
      delete formattedUserData.postalCode;
      delete formattedUserData.phoneNumber;
      delete formattedUserData.firstName;
      delete formattedUserData.lastName;
      delete formattedUserData.confirmPassword;
      
      console.log('Sending registration data:', JSON.stringify({
        ...formattedUserData,
        password: '********', // Don't log the actual password
        password_confirm: '********'
      }));
      
      const response = await baseAPI.post('/accounts/register/', formattedUserData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message || error);
      
      // Handle different types of errors
      if (error.response) {
        // Check for IntegrityError (email already exists)
        if (error.response.data && typeof error.response.data === 'string' && 
            error.response.data.includes('IntegrityError') && 
            error.response.data.includes('email_key') && 
            error.response.data.includes('already exists')) {
          // Extract the email from the error message if possible
          const emailMatch = error.response.data.match(/Key \(email\)=\(([^)]+)\) already exists/);
          const email = emailMatch ? emailMatch[1] : 'This email';
          return { 
            success: false, 
            error: { 
              message: `${email} is already registered. Please login instead or use a different email address.`,
              code: 'EMAIL_EXISTS'
            } 
          };
        }
        
        // The server responded with an error status
        if (error.response.data) {
          // Format Django validation errors nicely
          if (typeof error.response.data === 'object') {
            const errorMessages = {};
            Object.keys(error.response.data).forEach(key => {
              const value = error.response.data[key];
              errorMessages[key] = Array.isArray(value) ? value[0] : value;
            });
            return { success: false, error: errorMessages };
          }
          return { success: false, error: error.response.data };
        }
        return { success: false, error: { message: `Server error: ${error.response.status}` } };
      }
      
      // Network errors or other issues
      return { 
        success: false, 
        error: { message: 'Registration failed. ' + (error.message || 'Check server logs for details.') }
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

  // Resend verification email
  resendVerificationEmail: async (email) => {
    try {
      const response = await baseAPI.post('/accounts/resend-verification-email/', { email });
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
      // Endpoint needs to be implemented on the backend
      const response = await baseAPI.post('/accounts/request-password-reset/', { email });
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
      // Endpoint needs to be implemented on the backend
      const response = await baseAPI.post('/accounts/reset-password/', resetData);
      return { success: true, data: response.data };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Resend verification email
  resendVerificationEmail: async (email) => {
    try {
      const response = await baseAPI.post('/accounts/resend-verification-email/', { email });
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
