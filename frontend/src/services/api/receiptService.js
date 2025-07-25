/**
 * Receipt API Service
 * Handles all receipt-related API calls including dashboard metrics
 */

import axiosInstance from '../../utils/axiosConfig';

class ReceiptService {
  /**
   * Get dashboard metrics for the current user
   * @returns {Promise<Object>} Dashboard metrics data
   */
  async getDashboardMetrics() {
    try {
      console.log('ReceiptService: Attempting to fetch dashboard data...');
      const response = await axiosInstance.get('/receipts/dashboard/');
      console.log('ReceiptService: Dashboard data fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Dashboard metrics error:', error);
      console.error('ReceiptService: Error response:', error.response);
      console.error('ReceiptService: Error status:', error.response?.status);
      console.error('ReceiptService: Error data:', error.response?.data);
      throw new Error(`Failed to fetch dashboard data: ${error.response?.status || 'Unknown error'}`);
    }
  }

  /**
   * Get all receipts for the current user
   * @param {Object} params - Query parameters (page, page_size, etc.)
   * @returns {Promise<Object>} List of receipts
   */
  async getReceipts(params = {}) {
    try {
      const response = await axiosInstance.get('/receipts/', { params });
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Get receipts error:', error);
      throw error;
    }
  }

  /**
   * Upload a new receipt
   * @param {FormData} formData - Receipt file and metadata
   * @param {Object} config - Additional axios config (like onUploadProgress)
   * @returns {Promise<Object>} Upload response
   */
  async uploadReceipt(formData, config = {}) {
    try {
      console.log('ReceiptService: Uploading receipt...');
      const response = await axiosInstance.post('/receipts/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        ...config
      });
      console.log('ReceiptService: Receipt uploaded successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Upload error:', error);
      console.error('ReceiptService: Upload error response:', error.response);
      throw error;
    }
  }

  /**
   * Get a specific receipt by ID
   * @param {number|string} receiptId - Receipt ID
   * @returns {Promise<Object>} Receipt data
   */
  async getReceipt(receiptId) {
    try {
      const response = await axiosInstance.get(`/receipts/${receiptId}/`);
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Get receipt error:', error);
      throw error;
    }
  }

  /**
   * Get receipt by ID (alias for compatibility)
   */
  async getReceiptById(receiptId) {
    return this.getReceipt(receiptId);
  }

  /**
   * Update a receipt
   * @param {number|string} receiptId - Receipt ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated receipt data
   */
  async updateReceipt(receiptId, updateData) {
    try {
      const response = await axiosInstance.put(`/receipts/${receiptId}/`, updateData);
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Update receipt error:', error);
      throw new Error('Failed to update receipt');
    }
  }

  /**
   * Update extracted data for a receipt (partial update)
   * @param {number|string} receiptId - Receipt ID
   * @param {Object} extractedData - Extracted data to update
   * @returns {Promise<Object>} Updated receipt data
   */
  async updateExtractedData(receiptId, extractedData) {
    try {
      console.log('ReceiptService: Updating extracted data for receipt:', receiptId, extractedData);
      const response = await axiosInstance.patch(`/receipts/${receiptId}/update_extracted_data/`, extractedData);
      console.log('ReceiptService: Extracted data updated successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Update extracted data error:', error);
      console.error('ReceiptService: Error response:', error.response);
      throw new Error(`Failed to update extracted data: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Delete a receipt
   * @param {number|string} receiptId - Receipt ID
   * @returns {Promise<void>}
   */
  async deleteReceipt(receiptId) {
    try {
      await axiosInstance.delete(`/receipts/${receiptId}/`);
    } catch (error) {
      console.error('ReceiptService: Delete receipt error:', error);
      throw new Error('Failed to delete receipt');
    }
  }

  /**
   * Get receipt categories breakdown
   * @returns {Promise<Object>} Categories data
   */
  async getCategoriesBreakdown() {
    try {
      const response = await axiosInstance.get('/receipts/categories/');
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Categories error:', error);
      throw new Error('Failed to fetch categories breakdown');
    }
  }

  /**
   * Get monthly summary data
   * @returns {Promise<Object>} Monthly summary
   */
  async getMonthlySummary() {
    try {
      const response = await axiosInstance.get('/receipts/monthly_summary/');
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Monthly summary error:', error);
      throw new Error('Failed to fetch monthly summary');
    }
  }

  /**
   * Process receipt with AI
   * @param {number|string} receiptId - Receipt ID
   * @returns {Promise<Object>} Processing result
   */
  async processReceipt(receiptId) {
    try {
      const response = await axiosInstance.post(`/receipts/${receiptId}/process/`);
      return response.data;
    } catch (error) {
      console.error('ReceiptService: Process receipt error:', error);
      throw new Error('Failed to process receipt');
    }
  }
}

// Export singleton instance
const receiptService = new ReceiptService();
export default receiptService;