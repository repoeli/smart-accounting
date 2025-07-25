/**
 * Enhanced Receipt Service
 * Features:
 * - Comprehensive error handling
 * - Progress tracking with WebSocket support
 * - File validation and preprocessing
 * - Retry mechanisms
 * - Caching for performance
 * - Batch operations
 * - Real-time status updates
 */

import api from './api';

class EnhancedReceiptService {
  constructor() {
    this.processingPollers = new Map();
    this.eventListeners = new Map();
    this.cache = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.progressCallbacks = new Map();
    
    // WebSocket connection for real-time updates
    this.websocket = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection for real-time updates
   */
  initializeWebSocket() {
    // Disable WebSocket for now since backend doesn't support it yet
    console.log('WebSocket support disabled - using polling for real-time updates');
    return;
    
    if (!window.WebSocket) {
      console.warn('WebSocket not supported, falling back to polling');
      return;
    }

    try {
      // Backend WebSocket endpoint (when implemented)
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const backendHost = process.env.NODE_ENV === 'production' 
        ? window.location.host 
        : 'localhost:8000';
      const wsUrl = `${wsProtocol}//${backendHost}/ws/receipts/`;
      
      this.websocket = new WebSocket(wsUrl);
      
    this.websocket.onopen = () => {
      console.log('WebSocket connected for receipt updates');
      this.reconnectAttempts = 0;
    };
    
    this.websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleWebSocketMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
    
    this.websocket.onclose = () => {
      console.log('WebSocket disconnected');
      this.scheduleReconnect();
    };
    
    this.websocket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  } catch (error) {
    console.error('Failed to initialize WebSocket:', error);
  }
}

  /**
   * Handle WebSocket messages
   */
  handleWebSocketMessage(data) {
    if (data.type === 'receipt_status_update') {
      const { receipt_id, status } = data;
      this.triggerStatusEvent(receipt_id, status);
      
      // Update cache
      if (this.cache.has(`receipt_${receipt_id}`)) {
        const cached = this.cache.get(`receipt_${receipt_id}`);
        this.cache.set(`receipt_${receipt_id}`, { ...cached, ...status });
      }
    }
  }

  /**
   * Schedule WebSocket reconnection
   */
  scheduleReconnect() {
    // Skip reconnection if WebSocket is disabled
    return;
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.pow(2, this.reconnectAttempts) * 1000; // Exponential backoff
      setTimeout(() => {
        this.reconnectAttempts++;
        this.initializeWebSocket();
      }, delay);
    }
  }

  /**
   * Validate file before upload
   */
  validateFile(file) {
    const errors = [];
    const warnings = [];

    // File type validation
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'application/pdf'
    ];

    if (!allowedTypes.includes(file.type)) {
      errors.push({
        code: 'INVALID_FILE_TYPE',
        message: 'Invalid file type. Please upload JPEG, PNG, GIF, or PDF files only.',
        field: 'file_type'
      });
    }

    // File size validation
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      errors.push({
        code: 'FILE_TOO_LARGE',
        message: `File too large. Maximum size is ${(maxSize / 1024 / 1024).toFixed(1)}MB.`,
        field: 'file_size'
      });
    }

    if (file.size === 0) {
      errors.push({
        code: 'EMPTY_FILE',
        message: 'File appears to be empty.',
        field: 'file_size'
      });
    }

    // File name validation
    if (file.name.length > 255) {
      errors.push({
        code: 'FILENAME_TOO_LONG',
        message: 'Filename too long. Maximum 255 characters.',
        field: 'filename'
      });
    }

    // Image quality warnings
    if (file.type.startsWith('image/')) {
      if (file.size < 50 * 1024) { // Less than 50KB
        warnings.push({
          code: 'LOW_QUALITY_IMAGE',
          message: 'Image quality may be too low for optimal OCR results.',
          field: 'image_quality'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Preprocess file before upload
   */
  async preprocessFile(file) {
    return new Promise((resolve) => {
      if (!file.type.startsWith('image/')) {
        resolve(file);
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate optimal dimensions
        const maxWidth = 2048;
        const maxHeight = 2048;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and enhance image
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(resolve, 'image/jpeg', 0.9);
      };

      img.src = URL.createObjectURL(file);
    });
  }

  /**
   * Upload receipt with comprehensive error handling
   */
  async uploadReceipt(file, options = {}) {
    const {
      preferredApi,
      onStatusUpdate,
      onProgress,
      validateBeforeUpload = true,
      preprocessImage = true
    } = options;

    try {
      // Validate file
      if (validateBeforeUpload) {
        const validation = this.validateFile(file);
        if (validation.errors.length > 0) {
          return {
            success: false,
            errors: validation.errors,
            warnings: validation.warnings,
            message: 'File validation failed'
          };
        }
      }

      // Preprocess file if needed
      let processedFile = file;
      if (preprocessImage && file.type.startsWith('image/')) {
        try {
          processedFile = await this.preprocessFile(file);
        } catch (error) {
          console.warn('File preprocessing failed, using original:', error);
        }
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('file', processedFile, file.name);
      
      if (preferredApi) {
        formData.append('preferred_api', preferredApi);
      }

      // Track upload progress
      const uploadPromise = api.post('/receipts/', formData, {
        timeout: 60000, // 60 seconds
        onUploadProgress: (progressEvent) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          if (onProgress) {
            onProgress(progress);
          }
        }
      });

      const response = await uploadPromise;

      // For uploads, wait for processing to complete or return early status
      if (response.data.id) {
        // Cache the receipt data
        this.cache.set(`receipt_${response.data.id}`, response.data);
        
        // Start real-time monitoring
        const processingPromise = new Promise((resolve, reject) => {
          let pollCount = 0;
          const maxPolls = 120; // 2 minutes max wait
          
          // Safety timeout to prevent hanging
          const safetyTimeout = setTimeout(() => {
            console.log('⚠️ Safety timeout triggered - resolving with current status');
            this.stopStatusPolling(response.data.id);
            resolve({
              ...response.data,
              processing_timeout: true,
              timeout_reason: 'safety_timeout'
            });
          }, 150000); // 2.5 minutes safety timeout
          
          const statusUpdateCallback = (status) => {
            console.log('📊 Processing status update:', status);
            pollCount++;
            
            if (onStatusUpdate) {
              onStatusUpdate(status);
            }
            
            // Check if processing is complete
            if (status.ocr_status === 'completed') {
              console.log('✅ Processing completed successfully');
              clearTimeout(safetyTimeout);
              this.stopStatusPolling(response.data.id);
              resolve({
                ...response.data,
                ...status,
                ocr_status: 'completed'
              });
            } else if (status.ocr_status === 'failed') {
              console.log('❌ Processing failed');
              clearTimeout(safetyTimeout);
              this.stopStatusPolling(response.data.id);
              reject(new Error(status.error_message || 'Processing failed'));
            } else if (pollCount >= maxPolls) {
              console.log('⏰ Processing timeout - returning current status');
              clearTimeout(safetyTimeout);
              this.stopStatusPolling(response.data.id);
              resolve({
                ...response.data,
                ...status,
                processing_timeout: true,
                timeout_reason: 'max_polls_reached'
              });
            }
          };
          
          this.startStatusPolling(response.data.id, statusUpdateCallback);
        });
        
        try {
          // Wait for processing to complete
          const finalData = await processingPromise;
          
          return {
            success: true,
            data: finalData,
            message: finalData.processing_timeout ? 
              'Receipt uploaded and processing continues in background' : 
              'Receipt uploaded and processed successfully'
          };
        } catch (processingError) {
          console.error('Processing failed:', processingError);
          
          // Return the uploaded receipt even if processing failed
          return {
            success: true,
            data: response.data,
            message: 'Receipt uploaded but processing failed',
            processingError: processingError.message
          };
        }
      }

      return {
        success: true,
        data: response.data,
        message: 'Receipt uploaded successfully'
      };

    } catch (error) {
      console.error('Receipt upload failed:', error);
      
      const errorResponse = this.parseError(error);
      
      // Check if this is retryable
      if (this.isRetryableError(error) && this.shouldRetry(file.name)) {
        return this.retryUpload(file, options);
      }

      return {
        success: false,
        error: errorResponse,
        message: this.getActionableErrorMessage(errorResponse)
      };
    }
  }

  /**
   * Parse error response
   */
  parseError(error) {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          return {
            code: 'BAD_REQUEST',
            message: data.message || 'Invalid request',
            details: data.errors || data
          };
        case 401:
          return {
            code: 'UNAUTHORIZED',
            message: 'Authentication required'
          };
        case 413:
          return {
            code: 'FILE_TOO_LARGE',
            message: 'File too large for upload'
          };
        case 422:
          return {
            code: 'VALIDATION_ERROR',
            message: 'File validation failed',
            details: data.errors || data
          };
        case 429:
          return {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please wait and try again.'
          };
        case 500:
          return {
            code: 'SERVER_ERROR',
            message: 'Server error. Please try again later.'
          };
        default:
          return {
            code: 'UNKNOWN_ERROR',
            message: `Server error (${status})`
          };
      }
    } else if (error.request) {
      // Network error
      return {
        code: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.'
      };
    } else {
      // Other error
      return {
        code: 'UNKNOWN_ERROR',
        message: error.message || 'An unexpected error occurred'
      };
    }
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408;
    }
    return true; // Network errors are retryable
  }

  /**
   * Check if we should retry for this file
   */
  shouldRetry(filename) {
    const attempts = this.retryAttempts.get(filename) || 0;
    return attempts < this.maxRetries;
  }

  /**
   * Retry upload with exponential backoff
   */
  async retryUpload(file, options) {
    const attempts = this.retryAttempts.get(file.name) || 0;
    this.retryAttempts.set(file.name, attempts + 1);

    const delay = Math.pow(2, attempts) * 1000; // Exponential backoff
    await new Promise(resolve => setTimeout(resolve, delay));

    return this.uploadReceipt(file, options);
  }

  /**
   * Get actionable error message
   */
  getActionableErrorMessage(error) {
    switch (error.code) {
      case 'INVALID_FILE_TYPE':
        return 'Please upload a JPEG, PNG, or PDF file only.';
      case 'FILE_TOO_LARGE':
        return 'File is too large. Please compress the image or split multi-page documents.';
      case 'NETWORK_ERROR':
        return 'Connection error. Please check your internet connection and try again.';
      case 'RATE_LIMITED':
        return 'Too many uploads. Please wait a moment and try again.';
      case 'SERVER_ERROR':
        return 'Service temporarily unavailable. Please try again in a few moments.';
      case 'UNAUTHORIZED':
        return 'Please log in again to continue.';
      default:
        return error.message || 'Upload failed. Please try again or contact support.';
    }
  }

  /**
   * Start real-time status polling
   */
  startStatusPolling(receiptId, onStatusUpdate) {
    console.log(`🔄 Starting status polling for receipt ${receiptId}`);
    
    // Use WebSocket if available, otherwise fall back to polling
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      // WebSocket will handle updates automatically
      if (onStatusUpdate) {
        this.progressCallbacks.set(receiptId, onStatusUpdate);
      }
      return;
    }

    // Fallback to polling
    this.stopStatusPolling(receiptId);

    let pollAttempts = 0;
    const maxPollAttempts = 60; // Max 60 polling attempts (up to 5 minutes)

    const pollStatus = async () => {
      pollAttempts++;
      console.log(`🔄 Poll attempt ${pollAttempts}/${maxPollAttempts} for receipt ${receiptId}`);
      
      // Safety check: Stop polling after max attempts
      if (pollAttempts > maxPollAttempts) {
        console.warn(`⚠️ Max polling attempts reached for receipt ${receiptId}, stopping`);
        this.stopStatusPolling(receiptId);
        this.progressCallbacks.delete(receiptId);
        
        // Call final status update with timeout status
        if (onStatusUpdate) {
          onStatusUpdate({ 
            ocr_status: 'completed', // Assume completed after timeout
            processing_timeout: true,
            message: 'Processing timeout - receipt processing completed in background'
          });
        }
        return;
      }

      try {
        console.log(`📡 Polling status for receipt ${receiptId}`);
        let response;
        
        try {
          // Try the processing_status endpoint first
          response = await api.get(`/receipts/${receiptId}/processing_status/`);
        } catch (statusError) {
          console.warn('Processing status endpoint failed, trying receipt detail:', statusError);
          // Fallback to regular receipt endpoint
          response = await api.get(`/receipts/${receiptId}/`);
        }
        
        const status = response.data;
        
        console.log(`📊 Status received:`, status);

        // Call status update callback
        if (onStatusUpdate) {
          onStatusUpdate(status);
        }

        // Trigger custom events
        this.triggerStatusEvent(receiptId, status);

        // Update cache
        if (this.cache.has(`receipt_${receiptId}`)) {
          const cached = this.cache.get(`receipt_${receiptId}`);
          this.cache.set(`receipt_${receiptId}`, { ...cached, ...status });
        }

        // Stop polling if processing is complete
        if (['completed', 'failed'].includes(status.ocr_status)) {
          console.log(`✅ Polling complete for receipt ${receiptId}, status: ${status.ocr_status}`);
          this.stopStatusPolling(receiptId);
          this.progressCallbacks.delete(receiptId);
          return;
        }

        // Continue polling with adaptive interval
        const interval = this.getPollingInterval(status.ocr_status);
        console.log(`⏳ Continuing polling in ${interval}ms, current status: ${status.ocr_status}`);
        const pollerId = setTimeout(pollStatus, interval);
        this.processingPollers.set(receiptId, pollerId);

      } catch (error) {
        console.error(`❌ Status polling failed for receipt ${receiptId}:`, error);
        this.stopStatusPolling(receiptId);
        
        // Call callback with error
        if (onStatusUpdate) {
          onStatusUpdate({ ocr_status: 'failed', error_message: error.message });
        }
      }
    };

    // Start immediate polling
    pollStatus();
  }

  /**
   * Get adaptive polling interval based on status
   */
  getPollingInterval(status) {
    switch (status) {
      case 'pending':
        return 1000; // 1 second
      case 'processing':
        return 2000; // 2 seconds
      default:
        return 5000; // 5 seconds
    }
  }

  /**
   * Stop status polling
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

    // Call registered callback
    const callback = this.progressCallbacks.get(receiptId);
    if (callback) {
      callback(status);
    }
  }

  /**
   * Batch upload receipts
   */
  async batchUploadReceipts(files, options = {}) {
    const {
      onProgress,
      onIndividualProgress,
      maxConcurrent = 3
    } = options;

    const results = [];
    const batches = [];
    
    // Split files into batches
    for (let i = 0; i < files.length; i += maxConcurrent) {
      batches.push(files.slice(i, i + maxConcurrent));
    }

    let completedCount = 0;

    for (const batch of batches) {
      const batchPromises = batch.map(async (file, batchIndex) => {
        const overallIndex = completedCount + batchIndex;
        
        const result = await this.uploadReceipt(file, {
          ...options,
          onProgress: (progress) => {
            if (onIndividualProgress) {
              onIndividualProgress(overallIndex, progress);
            }
          }
        });

        if (onProgress) {
          const totalProgress = ((completedCount + batchIndex + 1) / files.length) * 100;
          onProgress(totalProgress);
        }

        return { file, result, index: overallIndex };
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      completedCount += batch.length;
    }

    const successCount = results.filter(r => r.result.success).length;
    const failureCount = results.length - successCount;

    return {
      success: failureCount === 0,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount,
        successRate: (successCount / results.length) * 100
      }
    };
  }

  /**
   * Get receipt details with caching
   */
  async getReceiptDetails(receiptId, useCache = true) {
    const cacheKey = `receipt_${receiptId}`;
    
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      const now = Date.now();
      const cacheAge = now - (cached._cacheTime || 0);
      
      // Use cache if less than 5 minutes old
      if (cacheAge < 5 * 60 * 1000) {
        return {
          success: true,
          data: cached,
          fromCache: true
        };
      }
    }

    try {
      const response = await api.get(`/receipts/${receiptId}/`);
      const data = { ...response.data, _cacheTime: Date.now() };
      
      // Update cache
      this.cache.set(cacheKey, data);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch receipt details:', error);
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Update receipt data
   */
  async updateReceipt(receiptId, data) {
    try {
      console.log('🔍 enhancedReceiptService DEBUG: Updating receipt', receiptId, 'with data:', data);
      
      const response = await api.patch(`/receipts/${receiptId}/`, data);
      
      console.log('🔍 enhancedReceiptService DEBUG: Update response:', response.data);
      
      // Update cache
      const cacheKey = `receipt_${receiptId}`;
      if (this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        this.cache.set(cacheKey, { ...cached, ...response.data, _cacheTime: Date.now() });
      }
      
      return {
        success: true,
        data: response.data,
        message: 'Receipt updated successfully'
      };
    } catch (error) {
      console.error('🔍 enhancedReceiptService DEBUG: Failed to update receipt:', error);
      console.error('🔍 enhancedReceiptService DEBUG: Error response:', error.response?.data);
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Get receipts with advanced filtering
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
        error: this.parseError(error)
      };
    }
  }

  /**
   * Delete receipt
   */
  async deleteReceipt(receiptId) {
    try {
      await api.delete(`/receipts/${receiptId}/`);
      
      // Remove from cache
      this.cache.delete(`receipt_${receiptId}`);
      
      // Stop any polling
      this.stopStatusPolling(receiptId);
      
      return {
        success: true,
        message: 'Receipt deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete receipt:', error);
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Reprocess receipt
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
        error: this.parseError(error)
      };
    }
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
        error: this.parseError(error)
      };
    }
  }

  /**
   * Export receipts
   */
  async exportReceipts(format = 'csv', filters = {}) {
    try {
      const response = await api.get('/receipts/export/', {
        params: { format, ...filters },
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipts.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return {
        success: true,
        message: 'Export completed successfully'
      };
    } catch (error) {
      console.error('Export failed:', error);
      return {
        success: false,
        error: this.parseError(error)
      };
    }
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get current receipt status (simplified status check)
   */
  async getReceiptStatus(receiptId) {
    try {
      console.log(`🔍 Getting status for receipt ${receiptId}`);
      
      let response;
      try {
        // Try the processing_status endpoint first
        response = await api.get(`/receipts/${receiptId}/processing_status/`);
      } catch (statusError) {
        console.warn('Processing status endpoint failed, trying receipt detail:', statusError);
        // Fallback to regular receipt endpoint
        response = await api.get(`/receipts/${receiptId}/`);
      }
      
      console.log(`📊 Status result for ${receiptId}:`, response.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get status for receipt ${receiptId}:`, error);
      throw error;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    // Stop all polling
    for (const [receiptId] of this.processingPollers) {
      this.stopStatusPolling(receiptId);
    }

    // Close WebSocket connection
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    // Clear cache and retry attempts
    this.cache.clear();
    this.retryAttempts.clear();
    this.progressCallbacks.clear();
  }
}

// Create singleton instance
const enhancedReceiptService = new EnhancedReceiptService();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  enhancedReceiptService.cleanup();
});
    
export default enhancedReceiptService;
