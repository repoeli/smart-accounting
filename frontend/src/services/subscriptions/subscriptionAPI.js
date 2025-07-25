/**
 * Subscription API Service for Smart Accounting
 * Handles all API calls related to subscription management and Stripe integration.
 */

import axiosInstance from '../../utils/axiosConfig';

const API_BASE = '/subscriptions/api';

class SubscriptionAPIService {
  /**
   * Create a Stripe checkout session for subscription purchase
   * @param {string} planId - Plan identifier ('basic', 'premium', 'platinum')
   * @param {string} successUrl - Optional custom success URL
   * @param {string} cancelUrl - Optional custom cancel URL
   * @returns {Promise<Object>} Checkout session data
   */
  async createCheckoutSession(planId, successUrl = null, cancelUrl = null) {
    try {
      const response = await axiosInstance.post(`${API_BASE}/checkout/`, {
        plan_id: planId,
        success_url: successUrl,
        cancel_url: cancelUrl
      });
      
      return response.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get current user's subscription details
   * @returns {Promise<Object>} Subscription details and features
   */
  async getSubscriptionDetails() {
    try {
      const response = await axiosInstance.get(`${API_BASE}/details/`);
      return response.data;
    } catch (error) {
      console.error('Error getting subscription details:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Cancel user's subscription
   * @param {boolean} immediate - Whether to cancel immediately or at period end
   * @returns {Promise<Object>} Cancellation result
   */
  async cancelSubscription(immediate = false) {
    try {
      const response = await axiosInstance.post(`${API_BASE}/cancel/`, {
        immediate
      });
      
      return response.data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Change user's subscription plan
   * @param {string} newPlanId - New plan identifier
   * @returns {Promise<Object>} Plan change result
   */
  async changeSubscriptionPlan(newPlanId) {
    try {
      const response = await axiosInstance.post(`${API_BASE}/change-plan/`, {
        new_plan_id: newPlanId
      });
      
      return response.data;
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get Stripe customer portal URL for subscription management
   * @param {string} returnUrl - URL to return to after managing subscription
   * @returns {Promise<Object>} Customer portal URL
   */
  async getCustomerPortalUrl(returnUrl = null) {
    try {
      const params = returnUrl ? { return_url: returnUrl } : {};
      const response = await axiosInstance.get(`${API_BASE}/customer-portal/`, {
        params
      });
      
      return response.data;
    } catch (error) {
      console.error('Error getting customer portal URL:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get user's payment history
   * @returns {Promise<Object>} Payment history data
   */
  async getPaymentHistory() {
    try {
      const response = await axiosInstance.get(`${API_BASE}/payment-history/`);
      return response.data;
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Get available subscription plans and their features
   * @returns {Promise<Object>} Available plans data
   */
  async getSubscriptionPlans() {
    try {
      const response = await axiosInstance.get(`${API_BASE}/plans/`);
      return response.data;
    } catch (error) {
      console.error('Error getting subscription plans:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Process successful checkout completion
   * @param {string} sessionId - Stripe session ID
   * @returns {Promise<Object>} Processing result
   */
  async processCheckoutSuccess(sessionId) {
    try {
      const response = await axiosInstance.post(`${API_BASE}/process-success/`, {
        session_id: sessionId
      });
      
      return response.data;
    } catch (error) {
      console.error('Error processing checkout success:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Check subscription service health
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await axiosInstance.get(`${API_BASE}/health/`);
      return response.data;
    } catch (error) {
      console.error('Error checking subscription health:', error);
      throw this._handleError(error);
    }
  }

  /**
   * Handle API errors consistently
   * @private
   */
  _handleError(error) {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.error || 
                     error.response.data?.detail || 
                     `Server error: ${error.response.status}`;
      
      return new Error(message);
    } else if (error.request) {
      // Network error
      return new Error('Network error: Please check your connection');
    } else {
      // Other error
      return new Error(error.message || 'An unexpected error occurred');
    }
  }
}

// Create and export singleton instance
const subscriptionAPI = new SubscriptionAPIService();
export default subscriptionAPI;
