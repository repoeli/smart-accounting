import { useState, useEffect, useCallback } from 'react';
import { reportsAPI } from '../../services/reports/reportsAPI';
import useReportAccess from './useReportAccess';

/**
 * Custom hook for managing smart analytics data
 * Handles fetching, caching, and refreshing of AI-powered insights
 */
const useSmartAnalytics = (initialFilters = {}) => {
  const [data, setData] = useState({
    cashFlow: null,
    spendingIntelligence: null,
    businessInsights: null
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  
  const { canAccessReport, userPlan } = useReportAccess();

  // Check if user can access smart analytics (Premium+)
  const canAccessAnalytics = canAccessReport('vendor-analysis'); // Premium feature

  // Fetch cash flow predictions
  const fetchCashFlow = useCallback(async (customFilters = {}) => {
    if (!canAccessAnalytics) return null;
    
    try {
      const response = await reportsAPI.getPredictiveCashFlow({
        ...filters,
        ...customFilters
      });
      return response;
    } catch (err) {
      console.error('Failed to fetch cash flow data:', err);
      throw err;
    }
  }, [filters, canAccessAnalytics]);

  // Fetch spending intelligence
  const fetchSpendingIntelligence = useCallback(async (customFilters = {}) => {
    if (!canAccessAnalytics) return null;
    
    try {
      const response = await reportsAPI.getSpendingIntelligence({
        ...filters,
        ...customFilters,
        days: customFilters.days || filters.days || 90
      });
      return response;
    } catch (err) {
      console.error('Failed to fetch spending intelligence:', err);
      throw err;
    }
  }, [filters, canAccessAnalytics]);

  // Fetch business insights (Platinum only)
  const fetchBusinessInsights = useCallback(async (customFilters = {}) => {
    if (!canAccessReport('audit-log')) return null; // Platinum feature
    
    try {
      const response = await reportsAPI.getBusinessInsights({
        ...filters,
        ...customFilters
      });
      return response;
    } catch (err) {
      console.error('Failed to fetch business insights:', err);
      throw err;
    }
  }, [filters, canAccessReport]);

  // Fetch all analytics data
  const fetchAllAnalytics = useCallback(async (customFilters = {}) => {
    if (!canAccessAnalytics) {
      setError('Smart Analytics requires Premium subscription or higher');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const mergedFilters = { ...filters, ...customFilters };
      
      // Fetch data based on subscription tier
      const promises = [
        fetchCashFlow(mergedFilters),
        fetchSpendingIntelligence(mergedFilters)
      ];

      // Add business insights for Platinum users
      if (canAccessReport('audit-log')) {
        promises.push(fetchBusinessInsights(mergedFilters));
      }

      const results = await Promise.allSettled(promises);
      
      const newData = {
        cashFlow: results[0].status === 'fulfilled' ? results[0].value : null,
        spendingIntelligence: results[1].status === 'fulfilled' ? results[1].value : null,
        businessInsights: results[2]?.status === 'fulfilled' ? results[2].value : null
      };

      // Check for any failures
      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        console.warn('Some analytics failed to load:', failures);
        setError(`Partial data load: ${failures.length} out of ${results.length} analytics failed`);
      }

      setData(newData);
      setLastRefresh(new Date());

    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [filters, canAccessAnalytics, canAccessReport, fetchCashFlow, fetchSpendingIntelligence, fetchBusinessInsights]);

  // Refresh data
  const refresh = useCallback((customFilters = {}) => {
    return fetchAllAnalytics(customFilters);
  }, [fetchAllAnalytics]);

  // Update filters and trigger refresh
  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Auto-fetch on mount and filter changes
  useEffect(() => {
    if (canAccessAnalytics) {
      fetchAllAnalytics();
    }
  }, [filters, canAccessAnalytics, fetchAllAnalytics]);

  // Helper functions for data access
  const getCashFlowSummary = useCallback(() => {
    if (!data.cashFlow) return null;
    
    return {
      avgMonthlyNet: data.cashFlow.summary?.avg_monthly_net || 0,
      trend: data.cashFlow.summary?.trend || 'stable',
      nextMonthPrediction: data.cashFlow.predictions?.[0]?.predicted_net_flow || 0,
      confidence: data.cashFlow.predictions?.[0]?.confidence || 0,
      insights: data.cashFlow.insights || [],
      alerts: data.cashFlow.alerts || []
    };
  }, [data.cashFlow]);

  const getSpendingSummary = useCallback(() => {
    if (!data.spendingIntelligence) return null;
    
    return {
      totalSpent: data.spendingIntelligence.summary?.total_spent || 0,
      avgTransactionSize: data.spendingIntelligence.summary?.avg_transaction_size || 0,
      uniqueVendors: data.spendingIntelligence.summary?.unique_vendors || 0,
      uniqueCategories: data.spendingIntelligence.summary?.unique_categories || 0,
      topCategories: data.spendingIntelligence.category_insights?.slice(0, 5) || [],
      anomalies: data.spendingIntelligence.anomalies || [],
      recommendations: data.spendingIntelligence.recommendations || [],
      potentialDuplicates: data.spendingIntelligence.potential_duplicates || []
    };
  }, [data.spendingIntelligence]);

  const getBusinessSummary = useCallback(() => {
    if (!data.businessInsights) return null;
    
    return {
      kpis: data.businessInsights.kpis || {},
      trends: data.businessInsights.trends || [],
      opportunities: data.businessInsights.opportunities || [],
      risks: data.businessInsights.risks || []
    };
  }, [data.businessInsights]);

  // Check if data is stale (older than 1 hour)
  const isDataStale = useCallback(() => {
    if (!lastRefresh) return true;
    const oneHour = 60 * 60 * 1000; // 1 hour in milliseconds
    return Date.now() - lastRefresh.getTime() > oneHour;
  }, [lastRefresh]);

  return {
    // Data
    data,
    cashFlow: data.cashFlow,
    spendingIntelligence: data.spendingIntelligence,
    businessInsights: data.businessInsights,
    
    // Summary helpers
    cashFlowSummary: getCashFlowSummary(),
    spendingSummary: getSpendingSummary(),
    businessSummary: getBusinessSummary(),
    
    // State
    loading,
    error,
    lastRefresh,
    isDataStale: isDataStale(),
    
    // Actions
    refresh,
    updateFilters,
    setFilters,
    
    // Access control
    canAccessAnalytics,
    userPlan,
    
    // Individual fetch methods
    fetchCashFlow,
    fetchSpendingIntelligence,
    fetchBusinessInsights
  };
};

export default useSmartAnalytics;
