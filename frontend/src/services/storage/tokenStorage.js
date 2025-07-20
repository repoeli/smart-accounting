/**
 * Token Storage Service
 * Handles secure storage of authentication tokens
 */

import { AUTH_CONSTANTS } from '../../config/constants';

class TokenStorage {
  /**
   * Get access token from localStorage
   */
  getAccessToken() {
    try {
      console.log('🔍 TokenStorage.getAccessToken() called');
      console.log('Looking for key:', AUTH_CONSTANTS.TOKEN_KEY);
      
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      console.log('TokenStorage: Raw token from localStorage:', token ? `EXISTS (${token.length} chars)` : 'NULL');
      
      if (token) {
        console.log('TokenStorage: Token preview:', token.substring(0, 30) + '...');
      }
      
      return token;
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      return null;
    }
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken() {
    try {
      const token = localStorage.getItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY);
      console.log('TokenStorage: Getting refresh token:', token ? 'present' : 'missing');
      return token;
    } catch (error) {
      console.error('Error getting refresh token:', error);
      return null;
    }
  }

  /**
   * Get both tokens
   */
  getTokens() {
    const access = this.getAccessToken();
    const refresh = this.getRefreshToken();
    console.log('TokenStorage.getTokens() called:', { 
      access: access ? 'present' : 'null', 
      refresh: refresh ? 'present' : 'null' 
    });
    return {
      accessToken: access, // Use consistent property names
      refreshToken: refresh,
      access, // Keep backward compatibility
      refresh
    };
  }

  /**
   * Set tokens in localStorage
   */
  setTokens({ access, refresh }) {
    try {
      console.log('TokenStorage: Setting tokens...', { 
        access: access ? 'present' : 'missing', 
        refresh: refresh ? 'present' : 'missing' 
      });
      
      if (access) {
        localStorage.setItem(AUTH_CONSTANTS.TOKEN_KEY, access);
        console.log('TokenStorage: Access token stored');
      }
      if (refresh) {
        localStorage.setItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY, refresh);
        console.log('TokenStorage: Refresh token stored');
      }
      
      // Verify storage
      const storedAccess = localStorage.getItem(AUTH_CONSTANTS.TOKEN_KEY);
      const storedRefresh = localStorage.getItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY);
      console.log('TokenStorage: Verification after storage:', {
        access: storedAccess ? 'stored successfully' : 'not stored',
        refresh: storedRefresh ? 'stored successfully' : 'not stored'
      });
    } catch (error) {
      console.error('Error setting tokens:', error);
    }
  }

  /**
   * Clear all tokens from localStorage
   */
  clearTokens() {
    try {
      localStorage.removeItem(AUTH_CONSTANTS.TOKEN_KEY);
      localStorage.removeItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY);
      localStorage.removeItem(AUTH_CONSTANTS.USER_KEY);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  }

  /**
   * Get user data from localStorage
   */
  getUser() {
    try {
      const userData = localStorage.getItem(AUTH_CONSTANTS.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  }

  /**
   * Set user data in localStorage
   */
  setUser(userData) {
    try {
      localStorage.setItem(AUTH_CONSTANTS.USER_KEY, JSON.stringify(userData));
    } catch (error) {
      console.error('Error setting user data:', error);
    }
  }

  /**
   * Check if token is expired (basic check)
   */
  isTokenExpired(token) {
    if (!token) return true;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const currentTime = Date.now() / 1000;
      return payload.exp < currentTime;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Check if token needs refresh (within threshold)
   */
  needsRefresh(token = null) {
    const accessToken = token || this.getAccessToken();
    if (!accessToken) return true;
    
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const currentTime = Date.now() / 1000;
      const expirationTime = payload.exp;
      const refreshThreshold = AUTH_CONSTANTS.TOKEN_EXPIRY_THRESHOLD / 1000; // Convert to seconds
      
      return (expirationTime - currentTime) < refreshThreshold;
    } catch (error) {
      console.error('Error checking token refresh need:', error);
      return true;
    }
  }
}

// Create singleton instance
const tokenStorage = new TokenStorage();

export default tokenStorage;
