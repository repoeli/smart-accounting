/**
 * Unified Authentication Manager
 * Single source of truth for all authentication operations
 * Production-ready with fallback strategies
 */

import authService from '../api/authService';
import authAPI from '../authAPI';
import tokenStorage from '../storage/tokenStorage';

class AuthManager {
  constructor() {
    this.primaryService = authService;
    this.fallbackService = authAPI;
    this.isInitialized = false;
    
    // Migration flag for token keys
    this.tokenMigrationCompleted = this.checkTokenMigration();
    
    console.log('🔐 AuthManager initialized', {
      tokenMigrationCompleted: this.tokenMigrationCompleted,
      primaryService: 'authService.js',
      fallbackService: 'authApi.ts'
    });
  }

  /**
   * Check and perform token migration if needed
   */
  checkTokenMigration() {
    try {
      const oldToken = localStorage.getItem('token');
      const oldRefresh = localStorage.getItem('refreshToken');
      const newToken = localStorage.getItem('smart_accounting_token');
      const newRefresh = localStorage.getItem('smart_accounting_refresh_token');

      if (oldToken && !newToken) {
        console.log('🔄 Migrating token from old key to new standard');
        localStorage.setItem('smart_accounting_token', oldToken);
        localStorage.removeItem('token');
      }

      if (oldRefresh && !newRefresh) {
        console.log('🔄 Migrating refresh token from old key to new standard');
        localStorage.setItem('smart_accounting_refresh_token', oldRefresh);
        localStorage.removeItem('refreshToken');
      }

      // Also migrate old accessToken/refreshToken keys
      const oldAccessToken = localStorage.getItem('accessToken');
      const oldRefreshToken = localStorage.getItem('refreshToken');

      if (oldAccessToken && !newToken) {
        localStorage.setItem('smart_accounting_token', oldAccessToken);
        localStorage.removeItem('accessToken');
      }

      if (oldRefreshToken && !newRefresh) {
        localStorage.setItem('smart_accounting_refresh_token', oldRefreshToken);
        localStorage.removeItem('refreshToken');
      }

      return true;
    } catch (error) {
      console.error('❌ Token migration failed:', error);
      return false;
    }
  }

  /**
   * Login with primary service, fallback on failure
   */
  async login(credentials) {
    try {
      console.log('🔐 AuthManager: Attempting login with primary service');
      const result = await this.primaryService.login(credentials);
      
      if (result.success) {
        console.log('✅ AuthManager: Primary login successful');
        return result;
      } else {
        throw new Error(result.message || 'Primary login failed');
      }
    } catch (primaryError) {
      console.warn('⚠️ AuthManager: Primary login failed, trying fallback', primaryError.message);
      
      try {
        const fallbackResult = await this.fallbackService.login(credentials);
        
        if (fallbackResult.success) {
          console.log('✅ AuthManager: Fallback login successful');
          return fallbackResult;
        } else {
          throw new Error(fallbackResult.error?.message || 'Fallback login failed');
        }
      } catch (fallbackError) {
        console.error('❌ AuthManager: Both primary and fallback login failed');
        throw new Error(`Login failed: ${fallbackError.message}`);
      }
    }
  }

  /**
   * Register with primary service
   */
  async register(userData) {
    try {
      const result = await this.primaryService.register(userData);
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Registration failed:', error);
      throw error;
    }
  }

  /**
   * Logout from both services to ensure complete cleanup
   */
  async logout() {
    try {
      // Try primary service logout
      await this.primaryService.logout();
    } catch (error) {
      console.warn('⚠️ Primary logout failed:', error);
    }

    try {
      // Ensure fallback cleanup
      this.fallbackService.logout();
    } catch (error) {
      console.warn('⚠️ Fallback logout failed:', error);
    }

    // Force clear all token storage
    this.clearTokens();
    
    console.log('✅ AuthManager: Complete logout performed');
    return { success: true };
  }

  /**
   * Get current user with primary service
   */
  async getCurrentUser() {
    try {
      const result = await this.primaryService.getCurrentUser();
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Get current user failed:', error);
      throw error;
    }
  }

  /**
   * Refresh tokens
   */
  async refreshToken() {
    try {
      const tokens = this.getTokens();
      if (!tokens.refresh) {
        throw new Error('No refresh token available');
      }

      // Try primary service first
      const result = await this.primaryService.refreshToken?.(tokens.refresh);
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Token refresh failed:', error);
      // If refresh fails, logout user
      await this.logout();
      throw error;
    }
  }

  /**
   * Get tokens from unified storage
   */
  getTokens() {
    return tokenStorage.getTokens();
  }

  /**
   * Set tokens in unified storage
   */
  setTokens(tokens) {
    return tokenStorage.setTokens(tokens);
  }

  /**
   * Clear all tokens from storage
   */
  clearTokens() {
    // Clear new standard keys
    localStorage.removeItem('smart_accounting_token');
    localStorage.removeItem('smart_accounting_refresh_token');
    localStorage.removeItem('smart_accounting_user');
    
    // Clear legacy keys for complete cleanup
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('accessToken');
    
    // Use tokenStorage service
    tokenStorage.clearTokens();
    
    console.log('🧹 AuthManager: All tokens cleared');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const tokens = this.getTokens();
    return !!(tokens.accessToken && !tokenStorage.isTokenExpired(tokens.accessToken));
  }

  /**
   * Verify email
   */
  async verifyEmail(token) {
    try {
      const result = await this.primaryService.verifyEmail(token);
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const result = await this.primaryService.requestPasswordReset(email);
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Reset password
   */
  async resetPassword(token, newPassword) {
    try {
      const result = await this.primaryService.resetPassword(token, newPassword);
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Change password
   */
  async changePassword(oldPassword, newPassword) {
    try {
      const result = await this.primaryService.changePassword(oldPassword, newPassword);
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Password change failed:', error);
      throw error;
    }
  }

  /**
   * Update profile
   */
  async updateProfile(profileData) {
    try {
      const result = await this.primaryService.updateProfile(profileData);
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email) {
    try {
      const result = await this.primaryService.resendVerificationEmail(email);
      return result;
    } catch (error) {
      console.error('❌ AuthManager: Resend verification failed:', error);
      throw error;
    }
  }
}

// Create singleton instance
const authManager = new AuthManager();

export default authManager;
