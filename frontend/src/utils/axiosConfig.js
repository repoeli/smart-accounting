import axios from 'axios';
import tokenStorage from '../services/storage/tokenStorage';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  // Add withCredentials for CORS requests with credentials
  withCredentials: false, // Set to true if using HttpOnly cookies
});

// Function to check if token is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    // Simple token parsing without external library
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    const currentTime = Date.now() / 1000;
    // Add some buffer time (30 seconds) to avoid edge cases
    return payload.exp < currentTime + 30;
  } catch (error) {
    console.error('Error parsing token:', error);
    return true;
  }
};

// Keep track of refresh token promise to avoid multiple refresh calls
let refreshTokenPromise = null;

// Function to refresh the token
const refreshToken = async () => {
  // If we already have a refresh promise in progress, return it
  if (refreshTokenPromise) {
    return refreshTokenPromise;
  }

  const refreshToken = tokenStorage.getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  // Create a new promise for token refresh
  refreshTokenPromise = axios.post(
    `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1'}/accounts/token/refresh/`,
    { refresh: refreshToken }
  )
    .then(response => {
      tokenStorage.setAccessToken(response.data.access);
      // If we got a new refresh token, store it
      if (response.data.refresh) {
        tokenStorage.setRefreshToken(response.data.refresh);
      }
      return response.data.access;
    })
    .catch(error => {
      console.error('Token refresh failed:', error);
      tokenStorage.clearTokens();
      return null;
    })
    .finally(() => {
      // Reset the refresh token promise
      refreshTokenPromise = null;
    });

  return refreshTokenPromise;
};

// Set up request interceptor
axiosInstance.interceptors.request.use(
  async (config) => {
    // Skip authentication for login, register, and token refresh endpoints
    const skipAuthEndpoints = [
      '/accounts/token/',
      '/accounts/register/',
      '/accounts/token/refresh/',
      '/accounts/verify-email/',
      '/accounts/request-password-reset/',
      '/accounts/reset-password/'
    ];

    if (skipAuthEndpoints.some(endpoint => config.url.includes(endpoint))) {
      return config;
    }

    // Get the token
    let token = tokenStorage.getAccessToken();

    // If token is expired, try to refresh it
    if (token && isTokenExpired(token)) {
      token = await refreshToken();
    }

    // If we have a token, add it to the request
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Set up response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // If the error is 401 Unauthorized, try to refresh the token
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Try to refresh the token
      const token = await refreshToken();
      
      if (token) {
        // Update the authorization header
        originalRequest.headers.Authorization = `Bearer ${token}`;
        // Retry the original request
        return axiosInstance(originalRequest);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
