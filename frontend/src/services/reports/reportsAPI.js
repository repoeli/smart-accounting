/**
 * Reports API Service
 * Handles all report-related API calls with subscription-based access control
 */

import axiosInstance from '../../utils/axiosConfig';

class ReportsAPI {
  /**
   * Get dashboard summary data
   * @param {Object} filters - Optional filters (date_range, etc.)
   * @returns {Promise<Object>} Summary data
   */
  async getSummary(filters = {}) {
    try {
      console.log('ReportsAPI: Fetching summary data...');
      const response = await axiosInstance.get('/reports/summary/', { params: filters });
      console.log('ReportsAPI: Summary data fetched successfully:', response.data);
      return response.data;
    } catch (error) {
      console.error('ReportsAPI: Summary fetch error:', error);
      throw new Error(`Failed to fetch summary: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get income vs expense report
   * @param {Object} filters - Date range, business/personal toggle, etc.
   * @returns {Promise<Object>} Income vs expense data
   */
  async getIncomeVsExpense(filters = {}) {
    try {
      console.log('ReportsAPI: Fetching income vs expense data...', filters);
      const response = await axiosInstance.get('/reports/income-expense/', { params: filters });
      console.log('ReportsAPI: Income vs expense data fetched successfully');
      return response.data;
    } catch (error) {
      console.error('ReportsAPI: Income vs expense fetch error:', error);
      throw new Error(`Failed to fetch income vs expense report: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get category breakdown report
   * @param {Object} filters - Date range, transaction type, etc.
   * @returns {Promise<Object>} Category breakdown data
   */
  async getCategoryBreakdown(filters = {}) {
    try {
      console.log('ReportsAPI: Fetching category breakdown data...', filters);
      const response = await axiosInstance.get('/reports/category-breakdown/', { params: filters });
      console.log('ReportsAPI: Category breakdown data fetched successfully');
      return response.data;
    } catch (error) {
      console.error('ReportsAPI: Category breakdown fetch error:', error);
      throw new Error(`Failed to fetch category breakdown report: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get tax deductible items report (Platinum tier only)
   * @param {Object} filters - Date range, category filters, etc.
   * @returns {Promise<Object>} Tax deductible items data
   */
  async getTaxDeductible(filters = {}) {
    try {
      console.log('ReportsAPI: Fetching tax deductible data...', filters);
      const response = await axiosInstance.get('/reports/tax-deductible/', { params: filters });
      console.log('ReportsAPI: Tax deductible data fetched successfully');
      return response.data;
    } catch (error) {
      console.error('ReportsAPI: Tax deductible fetch error:', error);
      throw new Error(`Failed to fetch tax deductible report: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get vendor analysis report
   * @param {Object} filters - Date range, minimum transaction count, etc.
   * @returns {Promise<Object>} Vendor analysis data
   */
  async getVendorAnalysis(filters = {}) {
    try {
      console.log('ReportsAPI: Fetching vendor analysis data...', filters);
      const response = await axiosInstance.get('/reports/vendor-analysis/', { params: filters });
      console.log('ReportsAPI: Vendor analysis data fetched successfully');
      return response.data;
    } catch (error) {
      console.error('ReportsAPI: Vendor analysis fetch error:', error);
      throw new Error(`Failed to fetch vendor analysis report: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Get audit log report (Platinum tier only)
   * @param {Object} filters - Date range, status filters, etc.
   * @returns {Promise<Object>} Audit log data
   */
  async getAuditLog(filters = {}) {
    try {
      console.log('ReportsAPI: Fetching audit log data...', filters);
      const response = await axiosInstance.get('/reports/audit-log/', { params: filters });
      console.log('ReportsAPI: Audit log data fetched successfully');
      return response.data;
    } catch (error) {
      console.error('ReportsAPI: Audit log fetch error:', error);
      throw new Error(`Failed to fetch audit log report: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Export report data as CSV
   * @param {string} reportType - Type of report to export
   * @param {Object} filters - Filters to apply
   * @returns {Promise<Blob>} CSV data blob
   */
  async exportCSV(reportType, filters = {}) {
    try {
      console.log(`ReportsAPI: Exporting ${reportType} as CSV...`);
      const response = await axiosInstance.get(`/reports/${reportType}/export/csv/`, { 
        params: filters,
        responseType: 'blob'
      });
      console.log(`ReportsAPI: ${reportType} CSV export successful`);
      return response.data;
    } catch (error) {
      console.error(`ReportsAPI: ${reportType} CSV export error:`, error);
      throw new Error(`Failed to export ${reportType} as CSV: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Export report data as PDF
   * @param {string} reportType - Type of report to export
   * @param {Object} filters - Filters to apply
   * @returns {Promise<Blob>} PDF data blob
   */
  async exportPDF(reportType, filters = {}) {
    try {
      console.log(`ReportsAPI: Exporting ${reportType} as PDF...`);
      const response = await axiosInstance.get(`/reports/${reportType}/export/pdf/`, { 
        params: filters,
        responseType: 'blob'
      });
      console.log(`ReportsAPI: ${reportType} PDF export successful`);
      return response.data;
    } catch (error) {
      console.error(`ReportsAPI: ${reportType} PDF export error:`, error);
      throw new Error(`Failed to export ${reportType} as PDF: ${error.response?.data?.error || error.message}`);
    }
  }

  /**
   * Test API connectivity and authentication
   * @returns {Promise<Object>} Connection status
   */
  async testConnection() {
    try {
      const response = await axiosInstance.get('/reports/test/');
      return { status: 'connected', data: response.data };
    } catch (error) {
      console.error('ReportsAPI: Connection test failed:', error);
      return { 
        status: 'error', 
        error: error.response?.data?.error || error.message 
      };
    }
  }
}

// Export singleton instance
const reportsAPI = new ReportsAPI();
export { reportsAPI };
export default reportsAPI;
