/**
 * useReceiptAPI.js - v2 New Schema Hook
 * 
 * React hook for interacting with the new schema-based receipt API.
 * Handles CRUD operations and manages loading states.
 */

import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import tokenStorage from '../services/storage/tokenStorage';

const useReceiptAPI = () => {
  const { user } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Base API configuration
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const API_ENDPOINTS = {
    receipts: `${API_BASE}/api/v1/receipts/`,
    transactions: `${API_BASE}/api/v1/transactions/`,
  };

  // Helper function for API calls
  const apiCall = useCallback(async (url, options = {}) => {
    const token = tokenStorage.getAccessToken();
    const defaultHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Don't set Content-Type for FormData
    if (options.body instanceof FormData) {
      delete defaultHeaders['Content-Type'];
    }

    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || errorData.detail || `HTTP ${response.status}`);
    }

    return response.json();
  }, []);

  // Fetch all receipts
  const fetchReceipts = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      // Add filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `${API_ENDPOINTS.receipts}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const data = await apiCall(url);
      
      setReceipts(data.results || data);
    } catch (err) {
      setError(err);
      console.error('Failed to fetch receipts:', err);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Fetch single receipt
  const fetchReceipt = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall(`${API_ENDPOINTS.receipts}${id}/`);
      return data;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch receipt:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Upload new receipt - CRITICAL: Backend expects 'image' field name
  const uploadReceipt = useCallback(async (file, description = '') => {
    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', file); // MUST be 'image', not 'file'
      if (description) {
        formData.append('description', description);
      }

      const data = await apiCall(API_ENDPOINTS.receipts, {
        method: 'POST',
        body: formData,
      });

      // Add to local state
      setReceipts(prev => [data, ...prev]);
      
      return data;
    } catch (err) {
      setError(err);
      console.error('Failed to upload receipt:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Update receipt extracted data
  const updateReceipt = useCallback(async (id, updateData) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall(`${API_ENDPOINTS.receipts}${id}/update_extracted_data/`, {
        method: 'PATCH',
        body: JSON.stringify(updateData),
      });

      // Update local state
      setReceipts(prev => prev.map(receipt => 
        receipt.id === id ? data : receipt
      ));

      return data;
    } catch (err) {
      setError(err);
      console.error('Failed to update receipt:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Reprocess receipt
  const reprocessReceipt = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall(`${API_ENDPOINTS.receipts}${id}/reprocess/`, {
        method: 'POST',
      });

      // Update local state
      setReceipts(prev => prev.map(receipt => 
        receipt.id === id ? data : receipt
      ));

      return data;
    } catch (err) {
      setError(err);
      console.error('Failed to reprocess receipt:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Delete receipt
  const deleteReceipt = useCallback(async (id) => {
    setLoading(true);
    setError(null);

    try {
      await apiCall(`${API_ENDPOINTS.receipts}${id}/`, {
        method: 'DELETE',
      });

      // Remove from local state
      setReceipts(prev => prev.filter(receipt => receipt.id !== id));
    } catch (err) {
      setError(err);
      console.error('Failed to delete receipt:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Get receipt summary statistics
  const getReceiptSummary = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await apiCall(`${API_ENDPOINTS.receipts}summary/`);
      return data;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch receipt summary:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Fetch transactions
  const fetchTransactions = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, value);
        }
      });

      const url = `${API_ENDPOINTS.transactions}${queryParams.toString() ? `?${queryParams}` : ''}`;
      const data = await apiCall(url);
      
      return data.results || data;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch transactions:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Get transaction summaries
  const getTransactionSummaries = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [byCategory, byType, monthly] = await Promise.all([
        apiCall(`${API_ENDPOINTS.transactions}by_category/`),
        apiCall(`${API_ENDPOINTS.transactions}by_type/`),
        apiCall(`${API_ENDPOINTS.transactions}monthly_summary/`)
      ]);

      return {
        byCategory,
        byType,
        monthly
      };
    } catch (err) {
      setError(err);
      console.error('Failed to fetch transaction summaries:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // Utility function to validate receipt data
  const validateReceiptData = useCallback((receipt) => {
    const extractedData = receipt?.extracted_data || {};
    const metadata = receipt?.processing_metadata || {};

    return {
      hasVendor: !!extractedData.vendor,
      hasTotal: !!extractedData.total && extractedData.total > 0,
      hasDate: !!extractedData.date,
      hasValidCurrency: !!extractedData.currency,
      hasProcessingData: !!metadata.processing_time,
      isComplete: !!(extractedData.vendor && extractedData.total && extractedData.date),
      confidence: receipt?.confidence_score || 0
    };
  }, []);

  // Format currency based on receipt data
  const formatCurrency = useCallback((amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  }, []);

  return {
    // Data
    receipts,
    loading,
    error,
    
    // Receipt operations
    fetchReceipts,
    fetchReceipt,
    uploadReceipt,
    updateReceipt,
    reprocessReceipt,
    deleteReceipt,
    getReceiptSummary,
    
    // Transaction operations
    fetchTransactions,
    getTransactionSummaries,
    
    // Utilities
    validateReceiptData,
    formatCurrency,
    
    // Manual state management
    setReceipts,
    setError,
    setLoading
  };
};

export { useReceiptAPI };
