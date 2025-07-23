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
  headers: {
    ...API_CONFIG.HEADERS
  }
});

// Track refresh token promise to prevent multiple simultaneous requests
let refreshTokenPromise = null;

/**
 * Request Interceptor
 * Adds authorization header to requests (except public endpoints)
 */
httpClient.interceptors.request.use(
  (config) => {
    // Debug logging to identify URL duplication
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 HTTP REQUEST:', config.method?.toUpperCase(), config.url);
      console.log('📡 API Request Debug:', {
        url: config.url,
        baseURL: config.baseURL,
        fullURL: config.baseURL ? new URL(config.url, config.baseURL).href : config.url,
        method: config.method
      });
    }
    
    // Define public endpoints that don't need authentication
    const publicEndpoints = [
      '/accounts/register/',
      '/accounts/login/',
      '/accounts/token/',
      '/accounts/token/refresh/',
      '/accounts/verify-email/',
      '/accounts/resend-verification/',
      '/accounts/password/reset/',
      '/accounts/password/reset/confirm/'
    ];
    
    // Check if this is a public endpoint
    const isPublicEndpoint = publicEndpoints.some(endpoint => 
      config.url?.includes(endpoint) || config.url?.endsWith(endpoint)
    );
    
    if (isPublicEndpoint) {
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ PUBLIC ENDPOINT - Skipping authorization header');
      }
      return config;
    }
    
    // For private endpoints, add authorization header
    const accessToken = tokenStorage.getAccessToken();
    const directToken = localStorage.getItem('smart_accounting_token');
    const finalToken = accessToken || directToken;
    
    if (finalToken) {
      config.headers.Authorization = `Bearer ${finalToken}`;
    } else if (process.env.NODE_ENV === 'development') {
      console.log('❌ NO TOKEN FOUND - Authorization header NOT SET');
    }
    
    // CRITICAL FIX: Handle FormData uploads properly
    if (config.data instanceof FormData) {
      // For FormData uploads, remove Content-Type header to let browser set it with boundary
      delete config.headers['Content-Type'];
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 HTTP Client: FormData detected, removing Content-Type header');
      }
    }
    
    // Log request data for debugging 415 errors (only in development)
    if (process.env.NODE_ENV === 'development' && config.data && (config.method === 'patch' || config.method === 'put' || config.method === 'post')) {
      console.log('REQUEST DATA:', typeof config.data, config.data instanceof FormData ? 'FormData' : 'JSON');
    }
    
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
    // Log response only in development and only for errors or important requests
    if (process.env.NODE_ENV === 'development' && response.status >= 400) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    // Log errors only in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
        status: error.response?.status,
        message: error.message,
      });
    }
    
    // Handle 401 errors (unauthorized)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      console.log('🔐 HTTP Client: Got 401 error, checking for refresh token...');
      
      // Define endpoints that should NOT trigger token refresh
      const authEndpoints = [
        '/accounts/token/',
        '/accounts/login/',
        '/accounts/register/',
        '/accounts/verify-email/',
        '/accounts/password/reset/',
      ];
      
      // Check if this is an auth endpoint
      const isAuthEndpoint = authEndpoints.some(endpoint => 
        originalRequest.url?.includes(endpoint) || originalRequest.url?.endsWith(endpoint)
      );
      
      if (isAuthEndpoint) {
        console.log('🔓 HTTP Client: 401 on auth endpoint, not attempting token refresh');
        return Promise.reject(error);
      }
      
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
    // Use a plain axios instance to avoid interceptor recursion
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
