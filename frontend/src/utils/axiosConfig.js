import axios from 'axios';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
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
    return payload.exp < currentTime;
  } catch (error) {
    return true;
  }
};

// Function to refresh the token
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) {
    return null;
  }

  try {
    const response = await axios.post(
      `${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1'}/accounts/token/refresh/`,
      { refresh: refreshToken }
    );
    localStorage.setItem('accessToken', response.data.access);
    return response.data.access;
  } catch (error) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return null;
  }
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
    let token = localStorage.getItem('accessToken');

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
      } else {
        // Redirect to login if refresh fails
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
