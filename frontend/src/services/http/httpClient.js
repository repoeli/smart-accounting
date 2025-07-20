/**
 * HTTP Client with Axios
 * Configured with interceptors for token management
 */

import axios from 'axios';
import { API_CONFIG } from '../../config/api';
import tokenStorage from '../storage/tokenStorage';

// Create axios instance with default config
const httpClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: API_CONFIG.HEADERS,
});

// Track refresh token promise to prevent multiple simultaneous requests
let refreshTokenPromise = null;

/**
 * Request Interceptor
 * Adds authorization header to requests (except public endpoints)
 */
httpClient.interceptors.request.use(
  (config) => {
    console.log('🔍 HTTP CLIENT REQUEST INTERCEPTOR - CRITICAL DEBUG');
    console.log('URL:', config.url);
    console.log('Method:', config.method?.toUpperCase());
    
    // Define public endpoints that don't need authentication
    const publicEndpoints = [
      '/accounts/register/',
      '/accounts/login/',
      '/accounts/verify-email/',
      '/accounts/resend-verification/',
      '/accounts/password/reset/',
      '/accounts/password/reset/confirm/'
    ];
    
    // Check if this is a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint) || config.url?.endsWith(endpoint)
    );
    
    console.log('🔓 Is public endpoint:', isPublicEndpoint);
    
    if (isPublicEndpoint) {
      console.log('✅ PUBLIC ENDPOINT - Skipping authorization header');
      console.log('=== REQUEST HEADERS (PUBLIC) ===');
      Object.keys(config.headers).forEach(header => {
        console.log(`${header}:`, config.headers[header]);
      });
      console.log('=== END HTTP CLIENT REQUEST INTERCEPTOR ===');
      return config;
    }
    
    // For private endpoints, add authorization header
    console.log('🔒 PRIVATE ENDPOINT - Adding authorization header');
    
    // Check all possible token sources
    console.log('=== TOKEN SOURCES CHECK ===');
    
    // 1. TokenStorage service
    const accessToken = tokenStorage.getAccessToken();
    console.log('1. TokenStorage.getAccessToken():', accessToken ? `EXISTS (${accessToken.length} chars)` : 'NULL');
    
    // 2. Direct localStorage with correct key
    const directToken = localStorage.getItem('smart_accounting_token');
    console.log('2. localStorage["smart_accounting_token"]:', directToken ? `EXISTS (${directToken.length} chars)` : 'NULL');
    
    // 3. All localStorage keys for debugging
    const allKeys = Object.keys(localStorage);
    console.log('3. All localStorage keys:', allKeys);
    
    // 4. Raw localStorage dump for tokens
    allKeys.forEach(key => {
      if (key.includes('token') || key.includes('auth') || key.includes('smart')) {
        const value = localStorage.getItem(key);
        console.log(`   ${key}:`, value ? `EXISTS (${value.length} chars)` : 'NULL');
      }
    });
    
    // Use whichever token is available
    const finalToken = accessToken || directToken;
    console.log('=== FINAL TOKEN DECISION ===');
    console.log('Final token selected:', finalToken ? `EXISTS (${finalToken.substring(0, 30)}...)` : 'NONE');
    
    if (finalToken) {
      config.headers.Authorization = `Bearer ${finalToken}`;
      console.log('✅ Authorization header SET');
      console.log('✅ Header value:', `Bearer ${finalToken.substring(0, 30)}...`);
    } else {
      console.log('❌ NO TOKEN FOUND - Authorization header NOT SET');
      console.log('❌ This will result in 401 Unauthorized');
    }
    
    // Log all headers being sent
    console.log('=== REQUEST HEADERS ===');
    Object.keys(config.headers).forEach(header => {
      if (header.toLowerCase() === 'authorization') {
        console.log(`${header}:`, config.headers[header] ? 'SET' : 'NOT_SET');
      } else {
        console.log(`${header}:`, config.headers[header]);
      }
    });
    
    console.log('=== END HTTP CLIENT REQUEST INTERCEPTOR ===');
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

/**
 * Response Interceptor
 * Handles token refresh on 401 responses
 */
httpClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('🔐 HTTP Client: Got 401 error, checking for refresh token...');
      
      // Check if we have a refresh token before attempting refresh
      const refreshToken = tokenStorage.getRefreshToken();
      console.log('Refresh token available:', refreshToken ? 'YES' : 'NO');
      
      if (!refreshToken) {
        console.log('❌ HTTP Client: No refresh token available, clearing tokens and logging out');
        tokenStorage.clearTokens();
        window.dispatchEvent(new CustomEvent('auth:logout', {
          detail: { reason: 'no_refresh_token' }
        }));
        return Promise.reject(error);
      }
      
      try {
        // If there's already a refresh in progress, wait for it
        if (refreshTokenPromise) {
          console.log('⏳ HTTP Client: Refresh already in progress, waiting...');
          await refreshTokenPromise;
          const newToken = tokenStorage.getAccessToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return httpClient(originalRequest);
          }
        }
        
        // Start token refresh
        console.log('🔄 HTTP Client: Starting token refresh...');
        refreshTokenPromise = refreshAccessToken();
        const newTokens = await refreshTokenPromise;
        
        if (newTokens?.access) {
          console.log('✅ HTTP Client: Token refresh successful, retrying request');
          // Update authorization header and retry request
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
          return httpClient(originalRequest);
        } else {
          throw new Error('Token refresh returned no access token');
        }
      } catch (refreshError) {
        console.error('❌ HTTP Client: Token refresh failed:', refreshError);
        
        // Clear tokens and redirect to login
        tokenStorage.clearTokens();
        
        // Dispatch custom event for logout
        window.dispatchEvent(new CustomEvent('auth:logout', {
          detail: { reason: 'token_refresh_failed' }
        }));
        
        return Promise.reject(refreshError);
      } finally {
        refreshTokenPromise = null;
      }
    }
    
    return Promise.reject(error);
  }
);

/**
 * Refresh access token using refresh token
 */
async function refreshAccessToken() {
  const refreshToken = tokenStorage.getRefreshToken();
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await axios.post(
      `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AUTH.REFRESH}`,
      { refresh: refreshToken },
      { headers: API_CONFIG.HEADERS }
    );
    
    const { access, refresh } = response.data;
    
    // Store new tokens
    tokenStorage.setTokens({ access, refresh });
    
    return { access, refresh };
  } catch (error) {
    console.error('Token refresh request failed:', error);
    throw error;
  }
}

export default httpClient;
