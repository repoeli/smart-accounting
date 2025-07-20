/**
 * Receipt Service
 * Handles receipt-related API calls
 */

import httpClient from '../http/httpClient';
import { API_CONFIG } from '../../config/api';

class ReceiptService {
  /**
   * Get receipts list with pagination and filtering
   */
  async getReceipts(params = {}) {
    try {
      const response = await httpClient.get(
        API_CONFIG.ENDPOINTS.RECEIPTS.LIST,
        { params }
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch receipts');
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(receiptId) {
    try {
      const response = await httpClient.get(
        API_CONFIG.ENDPOINTS.RECEIPTS.DETAIL.replace(':id', receiptId)
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch receipt');
    }
  }

  /**
   * Create new receipt
   */
  async createReceipt(receiptData) {
    try {
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.RECEIPTS.LIST,
        receiptData
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Receipt created successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Receipt creation failed');
    }
  }

  /**
   * Update receipt
   */
  async updateReceipt(receiptId, receiptData) {
    try {
      const response = await httpClient.patch(
        API_CONFIG.ENDPOINTS.RECEIPTS.DETAIL.replace(':id', receiptId),
        receiptData
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Receipt updated successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Receipt update failed');
    }
  }

  /**
   * Delete receipt
   */
  async deleteReceipt(receiptId) {
    try {
      await httpClient.delete(
        API_CONFIG.ENDPOINTS.RECEIPTS.DETAIL.replace(':id', receiptId)
      );
      
      return {
        success: true,
        message: 'Receipt deleted successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Receipt deletion failed');
    }
  }

  /**
   * Upload receipt image
   */
  async uploadReceiptImage(receiptId, imageFile) {
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.RECEIPTS.UPLOAD.replace(':id', receiptId),
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
        message: 'Receipt image uploaded successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Receipt image upload failed');
    }
  }

  /**
   * Process receipt with OCR
   */
  async processReceipt(receiptId) {
    try {
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.RECEIPTS.PROCESS.replace(':id', receiptId)
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Receipt processed successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Receipt processing failed');
    }
  }

  /**
   * Get receipt categories
   */
  async getCategories() {
    try {
      const response = await httpClient.get(
        API_CONFIG.ENDPOINTS.RECEIPTS.CATEGORIES
      );
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      throw this.handleError(error, 'Failed to fetch categories');
    }
  }

  /**
   * Create new category
   */
  async createCategory(categoryData) {
    try {
      const response = await httpClient.post(
        API_CONFIG.ENDPOINTS.RECEIPTS.CATEGORIES,
        categoryData
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Category created successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Category creation failed');
    }
  }

  /**
   * Update category
   */
  async updateCategory(categoryId, categoryData) {
    try {
      const response = await httpClient.patch(
        `${API_CONFIG.ENDPOINTS.RECEIPTS.CATEGORIES}${categoryId}/`,
        categoryData
      );
      
      return {
        success: true,
        data: response.data,
        message: 'Category updated successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Category update failed');
    }
  }

  /**
   * Delete category
   */
  async deleteCategory(categoryId) {
    try {
      await httpClient.delete(
        `${API_CONFIG.ENDPOINTS.RECEIPTS.CATEGORIES}${categoryId}/`
      );
      
      return {
        success: true,
        message: 'Category deleted successfully'
      };
    } catch (error) {
      throw this.handleError(error, 'Category deletion failed');
    }
  }

  /**
   * Get receipt statistics
   */
  async getReceiptStats(params = {}) {
    try {
      const endpoint = API_CONFIG.ENDPOINTS.RECEIPTS.STATS;
      console.log('ReceiptService: Getting stats from endpoint:', endpoint);
      console.log('ReceiptService: Full URL will be:', `${API_CONFIG.BASE_URL}${endpoint}`);
      
      const response = await httpClient.get(endpoint, { params });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('ReceiptService: Stats error:', error);
      throw this.handleError(error, 'Failed to fetch receipt statistics');
    }
  }

  /**
   * Export receipts
   */
  async exportReceipts(format = 'csv', params = {}) {
    try {
      const response = await httpClient.get(
        API_CONFIG.ENDPOINTS.RECEIPTS.EXPORT,
        {
          params: { ...params, format },
          responseType: 'blob'
        }
      );
      
      return {
        success: true,
        data: response.data,
        headers: response.headers
      };
    } catch (error) {
      throw this.handleError(error, 'Receipt export failed');
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
const receiptService = new ReceiptService();
export default receiptService;
