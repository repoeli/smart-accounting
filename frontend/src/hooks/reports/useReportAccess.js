/**
 * Report Access Hook - Subscription-based Feature Control
 * Integrates with Stripe subscription system to control report access
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import subscriptionAPI from '../../services/subscriptions/subscriptionAPI';

// Plan hierarchy (higher numbers = higher tiers)
const PLAN_HIERARCHY = {
  basic: 1,
  professional: 2,
  enterprise: 3
};

// Default features for each plan
const DEFAULT_FEATURES = {
  basic: {
    current_plan: 'basic',
    subscription_active: false,
    max_documents: 10,
    has_api_access: false,
    has_report_export: false,
    has_bulk_upload: false,
    has_white_label: false,
  },
  professional: {
    current_plan: 'professional',
    subscription_active: true,
    max_documents: 1000,
    has_api_access: true,
    has_report_export: true,
    has_bulk_upload: true,
    has_white_label: false,
  },
  enterprise: {
    current_plan: 'enterprise',
    subscription_active: true,
    max_documents: 999999,
    has_api_access: true,
    has_report_export: true,
    has_bulk_upload: true,
    has_white_label: true,
  }
};

const useReportAccess = () => {
  const { user, isAuthenticated } = useAuth();
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [userPlan, setUserPlan] = useState('basic');
  const [features, setFeatures] = useState(DEFAULT_FEATURES.basic);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch subscription data
  const fetchSubscriptionData = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setUserPlan('basic');
      setFeatures(DEFAULT_FEATURES.basic);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Fetch subscription details from our API
      const response = await subscriptionAPI.getSubscriptionDetails();
      
      if (response.subscription) {
        setSubscriptionData(response);
        
        // Extract plan from subscription data
        const plan = response.subscription.plan || 'basic';
        setUserPlan(plan);
        
        // Set features based on subscription
        if (response.features) {
          setFeatures(response.features);
        } else {
          // Fallback to default features for the plan
          setFeatures(DEFAULT_FEATURES[plan] || DEFAULT_FEATURES.basic);
        }
      } else {
        // No active subscription - use basic plan
        setUserPlan('basic');
        setFeatures(DEFAULT_FEATURES.basic);
        setSubscriptionData(null);
      }
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(err.message);
      
      // Fallback to basic plan on error
      setUserPlan('basic');
      setFeatures(DEFAULT_FEATURES.basic);
      setSubscriptionData(null);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  // Initial fetch and refresh on auth change
  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Permission check functions
  const hasAccess = useCallback((requiredPlan = 'basic') => {
    const userTier = PLAN_HIERARCHY[userPlan] || 1;
    const requiredTier = PLAN_HIERARCHY[requiredPlan] || 1;
    return userTier >= requiredTier;
  }, [userPlan]);

  const canExportReports = useCallback(() => {
    return features.has_report_export || false;
  }, [features]);

  const canUseAPI = useCallback(() => {
    return features.has_api_access || false;
  }, [features]);

  const canBulkUpload = useCallback(() => {
    return features.has_bulk_upload || false;
  }, [features]);

  const hasWhiteLabel = useCallback(() => {
    return features.has_white_label || false;
  }, [features]);

  const getDocumentLimit = useCallback(() => {
    return features.max_documents || 10;
  }, [features]);

  const isSubscriptionActive = useCallback(() => {
    return features.subscription_active || false;
  }, [features]);

  // Report-specific access controls
  const canAccessReport = useCallback((reportType) => {
    // All authenticated users can access basic reports
    if (!isAuthenticated) return false;

    switch (reportType) {
      case 'category_breakdown':
      case 'income_vs_expense':
      case 'summary':
        return true; // Available to all plans
      
      case 'tax_deductible':
        return hasAccess('professional');
      
      case 'vendor_analysis':
        return hasAccess('professional');
      
      case 'audit_log':
        return hasAccess('enterprise');
      
      default:
        return hasAccess('basic');
    }
  }, [isAuthenticated, hasAccess]);

  // Convenience method for reports access
  const canViewReports = useCallback(() => {
    return isAuthenticated && hasAccess('basic');
  }, [isAuthenticated, hasAccess]);

  const canViewCategoryBreakdown = useCallback(() => {
    return canAccessReport('category_breakdown');
  }, [canAccessReport]);

  const canViewTaxDeductible = useCallback(() => {
    return canAccessReport('tax_deductible');
  }, [canAccessReport]);

  const canViewVendorAnalysis = useCallback(() => {
    return canAccessReport('vendor_analysis');
  }, [canAccessReport]);

  const canViewAuditLog = useCallback(() => {
    return canAccessReport('audit_log');
  }, [canAccessReport]);

  // Refresh function for manual updates
  const refreshSubscription = useCallback(() => {
    return fetchSubscriptionData();
  }, [fetchSubscriptionData]);

  // Upgrade prompts
  const getUpgradeMessage = useCallback((requiredPlan) => {
    const planNames = {
      professional: 'Professional',
      enterprise: 'Enterprise'
    };
    
    return `This feature requires a ${planNames[requiredPlan] || requiredPlan} subscription. Upgrade now to unlock advanced reporting capabilities.`;
  }, []);

  return {
    // Subscription data
    subscriptionData,
    subscription: subscriptionData, // alias for easier access
    userPlan,
    features,
    loading,
    error,
    
    // Permission checks
    hasAccess,
    canExportReports,
    canUseAPI,
    canBulkUpload,
    hasWhiteLabel,
    getDocumentLimit,
    isSubscriptionActive,
    canAccessReport,
    
    // Report-specific permissions
    canViewReports,
    canViewCategoryBreakdown,
    canViewTaxDeductible,
    canViewVendorAnalysis,
    canViewAuditLog,
    
    // Utilities
    refreshSubscription,
    getUpgradeMessage,
    
    // Constants
    PLAN_HIERARCHY,
    DEFAULT_FEATURES
  };
};

export { useReportAccess };
export default useReportAccess;
