/**
 * CRITICAL FIX: Enhanced Receipt Performance Service
 * Fixed FormData construction based on diagnostic requirements
 * 
 * Root Cause: Improper Content-Type header handling for multipart/form-data
 * Solution: Explicit header management and proper FormData construction
 */
import api from './api';

class ReceiptPerformanceService {
  constructor() {
    this.processingPollers = new Map();
    this.eventListeners = new Map();
  }

  /**
   * FIXED: Upload receipt with diagnostic-verified FormData construction
   */
  async uploadReceipt(file, options = {}) {
    // DIAGNOSTIC TEST 1: Validate file object
    if (!(file instanceof File)) {
      console.error('❌ DIAGNOSTIC: Invalid file object', typeof file, file);
      throw new Error('Invalid file object - must be File instance');
    }

    console.log('🔍 DIAGNOSTIC: Starting upload with file:', {
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: file.lastModified,
      instanceof_File: file instanceof File,
      instanceof_Blob: file instanceof Blob
    });

    // DIAGNOSTIC TEST 2: Construct FormData with verified pattern
    const formData = new FormData();
    formData.append('file', file); // Direct append - verified working pattern
    
    if (options.preferredApi) {
      formData.append('preferred_api', options.preferredApi);
    }

    // DIAGNOSTIC TEST 3: Log FormData entries
    console.log('🔍 DIAGNOSTIC: FormData entries:');
    for (let [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
      if (value instanceof File) {
        console.log(`    File details: ${value.name}, ${value.type}, ${value.size} bytes`);
      }
    }

    try {
      // CRITICAL FIX: Dynamic timeout based on file size and complexity
      const fileSize = file.size || 0;
      const isLargeReceipt = fileSize > 3 * 1024 * 1024; // > 3MB
      const baseTimeout = isLargeReceipt ? 60000 : 30000; // 60s for large receipts, 30s for normal
      
      const config = {
        timeout: baseTimeout,
        headers: {
          // DO NOT set Content-Type - let browser set with boundary
          // 'Content-Type': 'multipart/form-data' // ❌ WRONG - causes boundary issues
        }
      };

      console.log('🔍 DIAGNOSTIC: Request config:', config);
      console.log('🔍 DIAGNOSTIC: Making POST request to /receipts/');

      const response = await api.post('/receipts/', formData, config);

      console.log('✅ DIAGNOSTIC: Upload successful!', {
        status: response.status,
        data: response.data
      });

      // Start real-time status monitoring
      if (response.data?.id) {
        this.startStatusPolling(response.data.id, options.onStatusUpdate);
      }

      return {
        success: true,
        data: response.data,
        message: 'Receipt uploaded successfully'
      };

    } catch (error) {
      console.error('❌ DIAGNOSTIC: Upload failed:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });

      return {
        success: false,
        error: error.response?.data || error.message,
        message: 'Failed to upload receipt',
        diagnosticInfo: {
          status: error.response?.status,
          headers: error.response?.headers,
          requestData: 'FormData with file'
        }
      };
    }
  }

  /**
   * DIAGNOSTIC TEST 4: Alternative upload method for testing
   */
  async uploadReceiptAlternative(file, options = {}) {
    console.log('🧪 DIAGNOSTIC: Testing alternative upload method');
    
    // Test different field names as per backend requirements
    const fieldNames = ['file', 'receipt_file', 'upload', 'document'];
    
    for (const fieldName of fieldNames) {
      console.log(`🧪 Testing field name: ${fieldName}`);
      
      const testFormData = new FormData();
      testFormData.append(fieldName, file);
      
      if (options.preferredApi) {
        testFormData.append('preferred_api', options.preferredApi);
      }
      
      try {
        const response = await api.post('/receipts/', testFormData, {
          timeout: 10000
        });
        
        console.log(`✅ SUCCESS with field name: ${fieldName}`, response.data);
        return {
          success: true,
          data: response.data,
          workingFieldName: fieldName
        };
        
      } catch (error) {
        console.log(`❌ FAILED with field name: ${fieldName}`, error.response?.data);
      }
    }
    
    return {
      success: false,
      error: 'All field names failed'
    };
  }

  /**
   * Start real-time status polling for a receipt with adaptive intervals
   */
  startStatusPolling(receiptId, onStatusUpdate) {
    // Clear existing poller
    this.stopStatusPolling(receiptId);

    let pollCount = 0;
    const maxPolls = 150; // Increased from default for complex receipts (5 minutes)

    const pollStatus = async () => {
      try {
        const response = await api.get(`/receipts/${receiptId}/processing_status/`);
        const status = response.data;
        
        pollCount++;

        // Call status update callback
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        // Trigger custom events
        this.triggerStatusEvent(receiptId, status);

        // Stop polling if processing is complete
        if (['completed', 'failed'].includes(status.ocr_status)) {
          this.stopStatusPolling(receiptId);
          return;
        }
        
        // Stop if we've polled too many times (prevent infinite polling)
        if (pollCount >= maxPolls) {
          console.warn(`⏰ Polling timeout for receipt ${receiptId} after ${maxPolls} attempts`);
          this.stopStatusPolling(receiptId);
          return;
        }

        // Adaptive polling interval - faster at start, slower as time goes on
        let nextInterval;
        if (pollCount <= 10) {
          nextInterval = 2000; // First 20 seconds: poll every 2s
        } else if (pollCount <= 30) {
          nextInterval = 5000; // Next 2 minutes: poll every 5s  
        } else {
          nextInterval = 10000; // After that: poll every 10s
        }

        // Continue polling with adaptive interval
        const pollerId = setTimeout(pollStatus, nextInterval);
        this.processingPollers.set(receiptId, pollerId);

      } catch (error) {
        console.error('Status polling failed:', error);
        
        // For 404 errors, stop polling immediately
        if (error.response?.status === 404) {
          console.log(`🛑 Receipt ${receiptId} not found, stopping polling`);
          this.stopStatusPolling(receiptId);
          return;
        }
        
        // For other errors, retry with backoff
        if (pollCount < maxPolls) {
          const retryDelay = Math.min(30000, 5000 * Math.pow(1.5, pollCount / 10)); // Exponential backoff
          const pollerId = setTimeout(pollStatus, retryDelay);
          this.processingPollers.set(receiptId, pollerId);
        } else {
          this.stopStatusPolling(receiptId);
        }
      }
    };

    // Start immediate polling
    pollStatus();
  }

  /**
   * Stop status polling for a receipt
   */
  stopStatusPolling(receiptId) {
    const pollerId = this.processingPollers.get(receiptId);
    if (pollerId) {
      clearTimeout(pollerId);
      this.processingPollers.delete(receiptId);
    }
  }

  /**
   * Trigger custom status events
   */
  triggerStatusEvent(receiptId, status) {
    const event = new CustomEvent('receiptStatusUpdate', {
      detail: { receiptId, status }
    });
    window.dispatchEvent(event);
  }

  /**
   * Get processing analytics
   */
  async getAnalytics(days = 7) {
    try {
      const response = await api.get('/receipts/analytics/', {
        params: { days }
      });
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Reprocess receipt with specific API
   */
  async reprocessReceipt(receiptId, preferredApi) {
    try {
      const response = await api.post(`/receipts/${receiptId}/reprocess/`, {
        preferred_api: preferredApi
      });

      // Start status monitoring for reprocessing
      this.startStatusPolling(receiptId);

      return {
        success: true,
        data: response.data,
        message: 'Receipt reprocessing started'
      };
    } catch (error) {
      console.error('Reprocessing failed:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get detailed receipt with all metadata
   */
  async getReceiptDetails(receiptId) {
    try {
      const response = await api.get(`/receipts/${receiptId}/`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch receipt details:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Get receipts with pagination and filtering
   */
  async getReceipts(params = {}) {
    try {
      const response = await api.get('/receipts/', { params });
      return {
        success: true,
        data: response.data,
        pagination: {
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous
        }
      };
    } catch (error) {
      console.error('Failed to fetch receipts:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Delete a receipt
   */
  async deleteReceipt(receiptId) {
    try {
      await api.delete(`/receipts/${receiptId}/`);
      return {
        success: true,
        message: 'Receipt deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete receipt:', error);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  /**
   * Cleanup - stop all polling
   */
  cleanup() {
    for (const [receiptId] of this.processingPollers) {
      this.stopStatusPolling(receiptId);
    }
  }
}

// Create singleton instance
const receiptPerformanceService = new ReceiptPerformanceService();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  receiptPerformanceService.cleanup();
});

export default receiptPerformanceService;
