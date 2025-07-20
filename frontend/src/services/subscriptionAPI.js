import axios from 'axios';

// Create base API instance
const baseAPI = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
baseAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const subscriptionAPI = {
  // Get available subscription plans
  getPlans: async () => {
    try {
      const response = await baseAPI.get('/subscriptions/plans/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Create Stripe checkout session
  createCheckoutSession: async (planId, successUrl, cancelUrl) => {
    try {
      const response = await baseAPI.post('/subscriptions/create-checkout-session/', {
        plan_id: planId,
        success_url: successUrl,
        cancel_url: cancelUrl
      });
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Get current subscription
  getCurrentSubscription: async () => {
    try {
      const response = await baseAPI.get('/subscriptions/current/');
      return { success: true, data: response.data };
    } catch (error) {
      if (error.response?.status === 404) {
        return { success: true, data: null }; // No subscription found
      }
      return {
        success: false,
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  },

  // Get payment history
  getPaymentHistory: async () => {
    try {
      const response = await baseAPI.get('/subscriptions/payment-history/');
      return { success: true, data: response.data };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || { message: 'Network error occurred' }
      };
    }
  }
};

export default subscriptionAPI;