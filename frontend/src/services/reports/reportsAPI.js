import axiosInstance from '../../utils/axiosConfig';

const REPORTS_BASE_URL = '/reports';

class ReportsAPI {
  // Helper function to build URLSearchParams from filters
  buildURLParams(filters = {}) {
    const params = new URLSearchParams();
    
    // Handle common filter parameters
    if (filters.start_date) params.append('start_date', filters.start_date);
    if (filters.end_date) params.append('end_date', filters.end_date);
    if (filters.currency) params.append('currency', filters.currency);
    if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);
    if (filters.limit) params.append('limit', filters.limit);
    if (filters.status) params.append('status', filters.status);
    if (filters.min_transactions) params.append('min_transactions', filters.min_transactions);
    if (filters.tax_year) params.append('tax_year', filters.tax_year);
    
    // Handle boolean parameters (need to check for undefined to allow false values)
    if (filters.is_business !== undefined) params.append('is_business', filters.is_business);
    if (filters.include_metadata !== undefined) params.append('include_metadata', filters.include_metadata);
    
    // Handle array parameters
    if (filters.include_categories?.length) {
      params.append('include_categories', filters.include_categories.join(','));
    }
    if (filters.exclude_categories?.length) {
      params.append('exclude_categories', filters.exclude_categories.join(','));
    }
    
    return params;
  }

  // Get summary data for dashboard
  async getSummary() {
    try {
      const response = await axiosInstance.get(`${REPORTS_BASE_URL}/summary/`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch reports summary:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch reports summary'
      };
    }
  }

  // Get income vs expense report
  async getIncomeVsExpense(filters = {}) {
    try {
      const params = this.buildURLParams(filters);

      const response = await axiosInstance.get(`${REPORTS_BASE_URL}/income-expense/?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch income vs expense report:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch income vs expense report'
      };
    }
  }

  // Get category breakdown report
  async getCategoryBreakdown(filters = {}) {
    try {
      const params = this.buildURLParams(filters);

      const response = await axiosInstance.get(`${REPORTS_BASE_URL}/category-breakdown/?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch category breakdown report:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch category breakdown report'
      };
    }
  }

  // Get tax deductible report
  async getTaxDeductible(filters = {}) {
    try {
      const params = this.buildURLParams(filters);

      const response = await axiosInstance.get(`${REPORTS_BASE_URL}/tax-deductible/?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch tax deductible report:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch tax deductible report'
      };
    }
  }

  // Get vendor analysis report
  async getVendorAnalysis(filters = {}) {
    try {
      const params = this.buildURLParams(filters);

      const response = await axiosInstance.get(`${REPORTS_BASE_URL}/vendor-analysis/?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch vendor analysis report:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch vendor analysis report'
      };
    }
  }

  // Get audit log report
  async getAuditLog(filters = {}) {
    try {
      const params = this.buildURLParams(filters);

      const response = await axiosInstance.get(`${REPORTS_BASE_URL}/audit-log/?${params}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Failed to fetch audit log report:', error);
      return {
        success: false,
        error: error.response?.data?.error || 'Failed to fetch audit log report'
      };
    }
  }
}

const reportsAPI = new ReportsAPI();

// Named export for destructuring
export { reportsAPI };

// Default export for standard import
export default reportsAPI;
