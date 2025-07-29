import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import BarChart from '../charts/BarChart';
import PieChart from '../charts/PieChart';
import ExportButtons from '../ExportButtons';
import ReportFilters from '../ReportFilters';
import { reportsAPI } from '../../../services/reports/reportsAPI';

/**
 * TaxDeductibleReport Component
 * 
 * @param {Function} onBack - Callback function for navigation back
 * @param {number} defaultTaxRate - Default tax rate (0.0-1.0) for tax savings calculations 
 *                                  when not provided by backend (default: 0.25 = 25%)
 */
const TaxDeductibleReport = ({ onBack, defaultTaxRate = 0.25 }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    tax_year: new Date().getFullYear(),
    start_date: '',
    end_date: ''
  });
  const [chartType, setChartType] = useState('bar');

  // Memoize colors array to prevent recalculation on every render
  const categoryColors = useMemo(() => {
    if (!data?.deductible_categories || !Array.isArray(data.deductible_categories)) {
      return [];
    }
    return generateColors(data.deductible_categories.length);
  }, [data?.deductible_categories?.length]);

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getTaxDeductible(filters);
      setData(response);
    } catch (err) {
      // Log full error details for debugging
      console.error('TaxDeductibleReport fetch error:', {
        message: err.message,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        stack: err.stack,
        timestamp: new Date().toISOString()
      });

      // Differentiate between network and API errors
      let errorMessage = 'Failed to load tax deductible report data';
      
      if (err.response) {
        // API error (server responded with error status)
        const status = err.response.status;
        const apiError = err.response.data?.error || err.response.data?.message;
        
        if (status === 401) {
          errorMessage = 'Authentication required. Please log in again.';
        } else if (status === 403) {
          errorMessage = 'Access denied. You do not have permission to view this report.';
        } else if (status === 404) {
          errorMessage = 'Report endpoint not found. Please contact support.';
        } else if (status >= 500) {
          errorMessage = 'Server error occurred. Please try again later.';
        } else if (apiError) {
          errorMessage = `Server error: ${apiError}`;
        } else {
          errorMessage = `Request failed with status ${status}`;
        }
      } else if (err.request) {
        // Network error (no response received)
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.message) {
        // Other error
        errorMessage = `Error: ${err.message}`;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const generateColors = (count) => {
    const colors = [
      '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0',
      '#3f51b5', '#009688', '#8bc34a', '#ff5722', '#795548'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  const prepareChartData = () => {
    // Comprehensive null safety checks
    if (!data || typeof data !== 'object') {
      return null;
    }

    // Ensure deductible_categories exists and is an array
    const categories = data.deductible_categories;
    if (!Array.isArray(categories) || categories.length === 0) {
      return null;
    }

    // Safely process categories with null/undefined protection
    const validCategories = categories.filter(item => 
      item && typeof item === 'object'
    );

    if (validCategories.length === 0) {
      return null;
    }

    // Safe mapping with default values and validation
    const labels = validCategories.map(item => {
      const category = item.category;
      return (typeof category === 'string' && category.trim()) 
        ? category.trim() 
        : 'Uncategorized';
    });

    const values = validCategories.map(item => {
      const amount = item.total_amount;
      // Handle various possible data types and null/undefined
      if (amount === null || amount === undefined) return 0;
      
      const parsed = typeof amount === 'number' 
        ? amount 
        : parseFloat(amount);
      
      return isNaN(parsed) || !isFinite(parsed) ? 0 : Math.max(0, parsed);
    });

    return {
      labels,
      datasets: [
        {
          label: 'Tax Deductible Amount',
          data: values,
          backgroundColor: categoryColors,
          borderColor: categoryColors.map(color => color + '80'),
          borderWidth: 1
        }
      ]
    };
  };

  const prepareSummaryData = () => {
    if (!data) return [];

    // Use tax rate from backend response if available, otherwise use prop default, finally fallback to 25%
    const taxRate = data.tax_guidance?.tax_rate || 
                   data.summary?.tax_rate || 
                   defaultTaxRate || 
                   0.25;
    
    const potentialSavings = parseFloat(data.total_deductible || 0) * taxRate;

    return [
      {
        label: 'Total Deductible',
        value: `$${parseFloat(data.total_deductible || 0).toLocaleString()}`,
        color: '#4caf50'
      },
      {
        label: 'Deductible Items',
        value: data.total_items?.toString() || '0',
        color: '#2196f3'
      },
      {
        label: 'Categories',
        value: data.deductible_categories?.length.toString() || '0',
        color: '#ff9800'
      },
      {
        label: 'Potential Tax Savings*',
        value: `$${potentialSavings.toLocaleString()}`,
        color: '#9c27b0',
        subtitle: `(${(taxRate * 100).toFixed(1)}% tax rate)`
      }
    ];
  };

  const getDeductibilityColor = (category) => {
    const highDeductible = ['office_supplies', 'business_meals', 'travel', 'equipment'];
    const mediumDeductible = ['utilities', 'rent', 'insurance'];
    
    if (highDeductible.includes(category?.toLowerCase())) return '#4caf50';
    if (mediumDeductible.includes(category?.toLowerCase())) return '#ff9800';
    return '#f44336';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  const chartData = prepareChartData();
  const summaryData = prepareSummaryData();

  return (
    <Box ref={reportRef}>
      {/* Export Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ExportButtons
          reportData={data}
          reportType="tax-deductible"
          reportRef={reportRef}
          title="Tax Deductible Report"
        />
      </Box>

      {/* Filters */}
      <ReportFilters
        onFiltersChange={handleFiltersChange}
        reportType="tax-deductible"
        initialFilters={filters}
        compact={true}
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryData.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: item.color, mb: 1 }}>
                  {item.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
                {item.subtitle && (
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem', mt: 0.5, display: 'block' }}>
                    {item.subtitle}
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tax Savings Disclaimer */}
      <Alert severity="info" sx={{ mb: 3 }}>
        * Potential tax savings calculated using estimated 25% tax rate. Consult your tax professional for accurate calculations.
      </Alert>

      {/* Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Chart Type</InputLabel>
              <Select
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                label="Chart Type"
              >
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="pie">Pie Chart</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {chartData && (
            <Box sx={{ height: 400 }}>
              {chartType === 'bar' ? (
                <BarChart
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      title: {
                        display: true,
                        text: `Tax Deductible Expenses by Category (${filters.tax_year})`
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return '$' + value.toLocaleString();
                          }
                        }
                      },
                      x: {
                        ticks: {
                          maxRotation: 45,
                          minRotation: 45
                        }
                      }
                    }
                  }}
                />
              ) : (
                <PieChart
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      title: {
                        display: true,
                        text: `Tax Deductible Expenses by Category (${filters.tax_year})`
                      },
                      legend: {
                        position: 'right'
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            return `${context.label}: $${context.raw.toLocaleString()} (${percentage}%)`;
                          }
                        }
                      }
                    }
                  }}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Deductible Items Table */}
      {data && data.deductible_items && data.deductible_items.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Deductible Items Details
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Vendor</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell>Deductibility</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.deductible_items.slice(0, 50).map((item, index) => (
                    <TableRow key={index} hover>
                      <TableCell>
                        {new Date(item.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{item.vendor || 'Unknown'}</TableCell>
                      <TableCell>
                        <Chip 
                          label={item.category || 'Uncategorized'} 
                          size="small"
                          sx={{ 
                            backgroundColor: getDeductibilityColor(item.category),
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'medium' }}>
                          ${parseFloat(item.amount || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {item.description || 'No description'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={item.deductible_percentage ? `${item.deductible_percentage}%` : '100%'}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            
            {data.deductible_items.length > 50 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Showing first 50 items. Export to CSV for complete data.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Category Breakdown Table */}
      {data && data.deductible_categories && data.deductible_categories.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Category Summary
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Total Amount</TableCell>
                    <TableCell align="right">Item Count</TableCell>
                    <TableCell align="right">Average per Item</TableCell>
                    <TableCell align="right">% of Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.deductible_categories.map((category, index) => {
                    // Enhanced division by zero protection for percentage calculation
                    const totalDeductible = parseFloat(data.total_deductible || 0);
                    const categoryAmount = parseFloat(category.total_amount || 0);
                    const percentage = totalDeductible > 0 && !isNaN(totalDeductible) && !isNaN(categoryAmount)
                      ? (categoryAmount / totalDeductible * 100) 
                      : 0;
                    
                    // Enhanced division by zero protection for average per item calculation
                    const itemCount = parseInt(category.item_count || 0, 10);
                    const avgPerItem = itemCount > 0 && !isNaN(itemCount) && !isNaN(categoryAmount)
                      ? categoryAmount / itemCount 
                      : 0;

                    return (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: categoryColors[index] || '#ccc'
                              }}
                            />
                            {category.category || 'Uncategorized'}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" sx={{ color: '#4caf50', fontWeight: 'medium' }}>
                            ${parseFloat(category.total_amount || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={category.item_count || 0} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            ${avgPerItem.toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TaxDeductibleReport;
