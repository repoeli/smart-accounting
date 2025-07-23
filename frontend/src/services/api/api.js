/**
 * API Client
 * Main API service that handles all HTTP requests with proper error handling
 */

import httpClient from '../http/httpClient';
import tokenStorage from '../storage/tokenStorage';

class ApiClient {
  constructor() {
    this.client = httpClient;
  }

  /**
   * GET request
   */
  async get(url, config = {}) {
    try {
      const response = await this.client.get(url, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * POST request - Fixed for FormData uploads
   */
  async post(url, data = {}, config = {}) {
    try {
      // Ensure proper headers for POST requests (except multipart/form-data)
      const finalConfig = {
        ...config,
        headers: {
          'Accept': 'application/json',
          ...config.headers
        }
      };
      
      // CRITICAL FIX: Handle FormData uploads properly
      if (data instanceof FormData) {
        // For FormData, completely remove Content-Type header
        // Browser will set it automatically with proper boundary
        delete finalConfig.headers['Content-Type'];
        
        if (process.env.NODE_ENV === 'development') {
          console.log('🔍 API Client: Detected FormData upload, removing Content-Type header');
        }
      } else if (!finalConfig.headers['Content-Type']) {
        // Only set JSON Content-Type for non-FormData requests
        finalConfig.headers['Content-Type'] = 'application/json';
      }
      
      const response = await this.client.post(url, data, finalConfig);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * PUT request
   */
  async put(url, data = {}, config = {}) {
    try {
      // Ensure proper headers for PUT requests
      const finalConfig = {
        ...config,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...config.headers
        }
      };
      
      const response = await this.client.put(url, data, finalConfig);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * PATCH request
   */
  async patch(url, data = {}, config = {}) {
    try {
      // Ensure proper headers for PATCH requests
      const finalConfig = {
        ...config,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...config.headers
        }
      };
      
      const response = await this.client.patch(url, data, finalConfig);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * DELETE request
   */
  async delete(url, config = {}) {
    try {
      const response = await this.client.delete(url, config);
      return this.handleResponse(response);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle successful responses
   */
  handleResponse(response) {
    // Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return {
      data: response.data,
      status: response.status,
      headers: response.headers,
      success: true,
    };
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        status: error.response?.status,
        message: error.message,
        data: error.response?.data,
      });
    }

    const errorResponse = {
      success: false,
      status: error.response?.status,
      message: error.message,
      data: error.response?.data,
    };

    // Handle specific HTTP status codes
    switch (error.response?.status) {
      case 400:
        errorResponse.message = 'Bad Request - Please check your input';
        break;
      case 401:
        errorResponse.message = 'Unauthorized - Please login again';
        break;
      case 403:
        errorResponse.message = 'Forbidden - You do not have permission';
        break;
      case 404:
        errorResponse.message = 'Not Found - The requested resource was not found';
        break;
      case 500:
        errorResponse.message = 'Server Error - Please try again later';
        break;
      default:
        errorResponse.message = error.message || 'An unexpected error occurred';
    }

    return errorResponse;
  }

  /**
   * Get current auth token
   */
  getAuthToken() {
    return tokenStorage.getAccessToken();
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    const token = this.getAuthToken();
    return !!token;
  }
}

// Export singleton instance
const apiClient = new ApiClient();
export default apiClient;
