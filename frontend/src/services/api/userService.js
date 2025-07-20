/**
 * User Service
 * Handles user-related API calls
 */

import httpClient from '../http/httpClient';
import { API_CONFIG } from '../../config/api';

class UserService {
  /**
   * Get user list (admin only)
   */
  async getUsers(params = {}) {
    try {
      const response = await httpClient.get(
        API_CONFIG.ENDPOINTS.USERS.LIST,
        { params }
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch users');
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId) {
    try {
      const response = await httpClient.get(
        API_CONFIG.ENDPOINTS.USERS.DETAIL.replace(':id', userId)
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user');
    }
  }

  /**
   * Update user
   */
  async updateUser(userId, userData) {
    try {
      const response = await httpClient.patch(
        API_CONFIG.ENDPOINTS.USERS.DETAIL.replace(':id', userId),
        userData
      );
      
      return {
        success: true,
        data: response.data,
        message: 'User updated successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'User update failed');
    }
  }

  /**
   * Delete user
   */
  async deleteUser(userId) {
    try {
      await httpClient.delete(
        API_CONFIG.ENDPOINTS.USERS.DETAIL.replace(':id', userId)
      );
      
      return {
        success: true,
        message: 'User deleted successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'User deletion failed');
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    try {
      const response = await httpClient.get(
        API_CONFIG.ENDPOINTS.USERS.STATS.replace(':id', userId)
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch user statistics');
    }
  }

  /**
   * Upload user avatar
   */
  async uploadAvatar(userId, avatarFile) {
    try {
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.USERS.AVATAR.replace(':id', userId),
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Avatar uploaded successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Avatar upload failed');
    }
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
      
      if (data.errors || data.non_field_errors) {
        errorResponse.errors = data.errors || { non_field_errors: data.non_field_errors };
      }
      
      if (data.message || data.detail) {
        errorResponse.message = data.message || data.detail;
      }
      
      if (typeof data === 'object' && !data.message && !data.detail) {
        errorResponse.errors = data;
        errorResponse.message = 'Validation failed';
      }
    }

    return errorResponse;
  }
}

// Export singleton instance
const userService = new UserService();
export default userService;
