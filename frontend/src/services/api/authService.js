/**
 * Authentication Service
 * Handles all authentication-related API calls
 */

import httpClient from '../http/httpClient';
import { API_CONFIG } from '../../config/api';
import tokenStorage from '../storage/tokenStorage';
import emailVerificationManager from '../verification/EmailVerificationManager';

class AuthService {
  /**
   * User registration
   */
  async register(userData) {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.AUTH.REGISTER;
      
      console.log('AuthService: BASE_URL:', API_CONFIG.BASE_URL);
      console.log('AuthService: Registration endpoint:', endpoint);
      console.log('AuthService: Registration data:', userData);
      
      const response = await httpClient.post(endpoint, userData);
      
      console.log('AuthService: Registration response:', response.data);
      
      return {
        success: true,
        data: response.data,
        message: 'Registration successful. Please verify your email.'
      };
    } catch (error) {
      console.error('AuthService: Registration error:', error);
      console.error('AuthService: Error response:', error.response?.data);
      console.error('AuthService: Error status:', error.response?.status);
      console.error('AuthService: Error config:', error.config);
      throw error; // Pass the original error to preserve response structure
    }
  }

  /**
   * User login
   */
  async login(credentials) {
    try {
      console.log('=== AUTHSERVICE LOGIN START ===');
      console.log('Credentials:', { email: credentials.email, password: '***' });
      
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.AUTH.LOGIN,
        credentials
      );
      
      console.log('✅ Login API response status:', response.status);
      console.log('🔍 CRITICAL: Full response data structure:', JSON.stringify(response.data, null, 2));
      
      // The backend returns: { success: true, tokens: { access: "...", refresh: "..." }, user: {...} }
      let access, refresh, user;
      
      if (response.data.tokens && response.data.tokens.access && response.data.tokens.refresh) {
        // Correct format from our backend
        access = response.data.tokens.access;
        refresh = response.data.tokens.refresh;
        user = response.data.user;
        console.log('✅ Using correct backend format: tokens nested object');
      } else {
        // This should not happen with our backend
        console.error('❌ UNEXPECTED RESPONSE FORMAT:', response.data);
        throw new Error('Invalid login response format: ' + JSON.stringify(response.data));
      }
      
      console.log('Extracted tokens:', { 
        access: access ? `EXISTS (${access.substring(0, 30)}...)` : 'MISSING', 
        refresh: refresh ? `EXISTS (${refresh.substring(0, 30)}...)` : 'MISSING',
        user: user ? 'EXISTS' : 'MISSING'
      });
      
      if (!access || !refresh) {
        throw new Error('Login response missing required tokens');
      }
      
      // Store tokens using tokenStorage service (recommended approach)
      console.log('📁 CRITICAL: Starting token storage process...');
      console.log('📁 Tokens to store:', { 
        access: access ? `${access.substring(0, 30)}... (${access.length} chars)` : 'MISSING',
        refresh: refresh ? `${refresh.substring(0, 30)}... (${refresh.length} chars)` : 'MISSING'
      });
      
      // First, let's see what AUTH_CONSTANTS contains
      const { AUTH_CONSTANTS } = await import('../../config/constants');
      console.log('📁 AUTH_CONSTANTS:', AUTH_CONSTANTS);
      
      tokenStorage.setTokens({ access, refresh });
      
      // Wait for storage to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Store user data
      if (user) {
        tokenStorage.setUser(user);
        console.log('👤 User data stored');
      }
      
      // Verify tokens were stored correctly with multiple checks
      console.log('🔍 Verifying token storage...');
      let verificationAttempts = 0;
      const maxAttempts = 5;
      
      while (verificationAttempts < maxAttempts) {
        const storedTokens = tokenStorage.getTokens();
        const directAccess = localStorage.getItem('smart_accounting_token');
        const directRefresh = localStorage.getItem('smart_accounting_refresh_token');
        
        console.log(`Verification attempt ${verificationAttempts + 1}:`, {
          tokenStorageAccess: storedTokens.accessToken ? 'VERIFIED' : 'FAILED',
          tokenStorageRefresh: storedTokens.refreshToken ? 'VERIFIED' : 'FAILED',
          directAccess: directAccess ? 'VERIFIED' : 'FAILED',
          directRefresh: directRefresh ? 'VERIFIED' : 'FAILED'
        });
        
        // Check if at least one method worked
        if ((storedTokens.accessToken && storedTokens.refreshToken) || 
            (directAccess && directRefresh)) {
          console.log('✅ Token storage verified successfully');
          break;
        }
        
        verificationAttempts++;
        if (verificationAttempts < maxAttempts) {
          console.log('⏳ Token storage not ready, waiting 100ms...');
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      if (verificationAttempts >= maxAttempts) {
        console.error('❌ Token storage verification failed after multiple attempts');
        throw new Error('Token storage verification failed');
      }
      
      // Dispatch login event for AuthContext
      window.dispatchEvent(new CustomEvent('auth:login', {
        detail: { user, tokens: { access, refresh } }
      }));
      
      console.log('✅ AUTHSERVICE LOGIN COMPLETED SUCCESSFULLY');
      console.log('=== AUTHSERVICE LOGIN END ===');
      
      return {
        success: true,
        data: { user, tokens: { access, refresh } },
        message: 'Login successful'
      };
    } catch (error) {
      console.error('❌ AuthService login error:', error);
      throw this.handleError(error, 'Login failed');
    }
  }

  /**
   * User logout
   */
  async logout() {
    try {
      const refreshToken = tokenStorage.getRefreshToken();
      
      if (refreshToken) {
        await httpClient.post(API_CONFIG.ENDPOINTS.AUTH.LOGOUT, {
          refresh: refreshToken
        });
      }
    } catch (error) {
      console.warn('Logout request failed:', error);
      // Continue with client-side logout even if server request fails
    } finally {
      // Clear tokens
      tokenStorage.clearTokens();
      
      // Dispatch logout event
      window.dispatchEvent(new CustomEvent('auth:logout', {
        detail: { reason: 'user_logout' }
      }));
      
      return {
        success: true,
        message: 'Logged out successfully'
      };
    }
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    console.log('🔍 AuthService.verifyEmail: Starting verification process');
    
    // Check global verification state
    const status = emailVerificationManager.getStatus(token);
    console.log('📊 EmailVerificationManager status:', status);
    
    if (status === 'completed') {
      console.log('✅ Token already verified, returning cached success');
      return {
        success: true,
        message: 'Email already verified successfully',
        cached: true
      };
    }
    
    if (status === 'verifying') {
      console.log('⏳ Verification already in progress, rejecting duplicate request');
      throw new Error('Email verification already in progress');
    }

    try {
      // Mark as started
      emailVerificationManager.startVerification(token);
      
      console.log('AuthService: Verifying email with token:', token);
      console.log('AuthService: Verify email endpoint:', API_CONFIG.ENDPOINTS.AUTH.VERIFY_EMAIL);
      console.log('AuthService: Sending request body:', { token });
      
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.AUTH.VERIFY_EMAIL,
        { token }
      );
      
      console.log('AuthService: Email verification response:', response.data);
      
      // Mark as completed on success
      emailVerificationManager.completeVerification(token);
      
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Email verified successfully'
      };
    } catch (error) {
      console.error('AuthService: Email verification error:', error);
      console.error('AuthService: Error response:', error.response?.data);
      console.error('AuthService: Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || error.message || 'Email verification failed';
      
      // Mark as failed (this may mark as completed for permanent errors)
      emailVerificationManager.failVerification(token, errorMessage);
      
      // For 400 errors, assume token was already used and return success
      if (error.response?.status === 400) {
        const message = 'Email verification token may have already been used. If you can log in, your email is verified.';
        console.log('🔄 AuthService: Converting 400 error to success response');
        return {
          success: true,
          message: message,
          assumedSuccess: true
        };
      }
      
      // Return structured error response instead of throwing
      return {
        success: false,
        error: {
          message: errorMessage,
          status: error.response?.status
        }
      };
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    try {
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.AUTH.RESEND_VERIFICATION,
        { email }
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Verification email sent'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to send verification email');
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.AUTH.FORGOT_PASSWORD,
        { email }
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Password reset email sent'
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to send password reset email');
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    try {
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.AUTH.RESET_PASSWORD,
        { token, password: newPassword }
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Password reset successful'
      };
    } catch (error) {
      throw this.handleError(error, 'Password reset failed');
    }
  }

  /**
   * Change password (authenticated user)
   */
  async changePassword(oldPassword, newPassword) {
    try {
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.AUTH.CHANGE_PASSWORD,
        {
          old_password: oldPassword,
          new_password: newPassword
        }
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Password changed successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Password change failed');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser() {
    try {
      const response = await httpClient.get(
        API_CONFIG.ENDPOINTS.AUTH.PROFILE
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user profile');
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(profileData) {
    try {
      const response = await httpClient.patch(
        API_CONFIG.ENDPOINTS.AUTH.PROFILE,
        profileData
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Profile updated successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Profile update failed');
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = tokenStorage.getAccessToken();
    return !!(token && !tokenStorage.isTokenExpired(token));
  }

  /**
   * Check if token needs refresh
   */
  needsTokenRefresh() {
    return tokenStorage.needsRefresh();
  }

  /**
   * Handle API errors consistently
   */
  handleError(error, defaultMessage = 'An error occurred') {
    const errorResponse = {
      success: false,
      message: defaultMessage,
      errors: {},
      status: error.response?.status
    };

    if (error.response?.data) {
      const { data } = error.response;
      
      // Handle validation errors
      if (data.errors || data.non_field_errors) {
        errorResponse.errors = data.errors || { non_field_errors: data.non_field_errors };
      }
      
      // Handle specific error messages
      if (data.message || data.detail) {
        errorResponse.message = data.message || data.detail;
      }
      
      // Handle field-specific errors
      if (typeof data === 'object' && !data.message && !data.detail) {
        errorResponse.errors = data;
        errorResponse.message = 'Validation failed';
      }
    }

    return errorResponse;
  }
}

// Export singleton instance
const authService = new AuthService();
export default authService;
