import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material';
import LineChart from '../charts/LineChart';
import BarChart from '../charts/BarChart';
import ExportButtons from '../ExportButtons';
import ReportFilters from '../ReportFilters';
import { reportsAPI } from '../../../services/reports/reportsAPI';

const IncomeVsExpenseReport = ({ onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    transaction_type: 'expense',
    is_business: null,
    currency: ''
  });
  const [chartType, setChartType] = useState('line');
  const [showComparison, setShowComparison] = useState(true);
  const reportRef = useRef(null);

  // Currency formatting helper function
  const formatCurrency = (value, options = {}) => {
    const numValue = typeof value === 'number' ? value : parseFloat(value || 0);
    
    // Handle invalid numbers
    if (isNaN(numValue) || !isFinite(numValue)) {
      return '$0.00';
    }

    // Use Intl.NumberFormat for proper currency formatting
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
      ...options
    }).format(numValue);
  };

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getIncomeVsExpense(filters);
      setData(response);
    } catch (err) {
      // Enhanced error handling with specific error type detection
      let errorMessage = 'Failed to load report data';
      
      // Network timeout or connection errors
      if (err.name === 'TimeoutError' || err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please check your connection and try again.';
      }
      // Network connection errors
      else if (err.name === 'NetworkError' || err.code === 'NETWORK_ERROR' || !navigator.onLine) {
        errorMessage = 'Network connection error. Please check your internet connection.';
      }
      // Server errors (5xx)
      else if (err.response?.status >= 500) {
        errorMessage = 'Server error occurred. Please try again later or contact support.';
      }
      // Authentication errors (401)
      else if (err.response?.status === 401) {
        errorMessage = 'Authentication failed. Please log in again.';
      }
      // Authorization errors (403)
      else if (err.response?.status === 403) {
        errorMessage = 'Access denied. You may not have permission to view this report.';
      }
      // Not found errors (404)
      else if (err.response?.status === 404) {
        errorMessage = 'Report data not found. Please try different filters.';
      }
      // Bad request errors (400)
      else if (err.response?.status === 400) {
        errorMessage = 'Invalid request parameters. Please check your filters and try again.';
      }
      // API specific error messages
      else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      // Generic error with original message
      else if (err.message) {
        errorMessage = `Error: ${err.message}`;
      }
      
      // Log detailed error for debugging
      console.error('IncomeVsExpenseReport fetchData error:', {
        error: err,
        status: err.response?.status,
        statusText: err.response?.statusText,
        data: err.response?.data,
        filters
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const prepareChartData = () => {
    if (!data || !data.monthly_data || !Array.isArray(data.monthly_data)) return null;

    // Single iteration with validation for efficiency and robustness
    const { labels, incomeData, expenseData } = data.monthly_data.reduce(
      (acc, item, index) => {
        // Validate and handle malformed data
        if (!item || typeof item !== 'object') {
          console.warn(`Invalid monthly data item at index ${index}:`, item);
          return acc; // Skip invalid entries
        }

        // Validate and parse month label
        const month = item.month;
        if (!month || (typeof month !== 'string' && typeof month !== 'number')) {
          console.warn(`Invalid month value at index ${index}:`, month);
          return acc; // Skip entries with invalid month
        }

        // Validate and parse income value
        const incomeValue = item.income;
        let parsedIncome = 0;
        if (incomeValue !== null && incomeValue !== undefined) {
          parsedIncome = parseFloat(incomeValue);
          if (isNaN(parsedIncome) || !isFinite(parsedIncome)) {
            console.warn(`Invalid income value at index ${index}:`, incomeValue);
            parsedIncome = 0; // Default to 0 for invalid income
          } else if (parsedIncome < 0) {
            console.warn(`Negative income value at index ${index}:`, incomeValue);
            parsedIncome = 0; // Default to 0 for negative income
          }
        }

        // Validate and parse expense value
        const expenseValue = item.expense;
        let parsedExpense = 0;
        if (expenseValue !== null && expenseValue !== undefined) {
          parsedExpense = parseFloat(expenseValue);
          if (isNaN(parsedExpense) || !isFinite(parsedExpense)) {
            console.warn(`Invalid expense value at index ${index}:`, expenseValue);
            parsedExpense = 0; // Default to 0 for invalid expense
          } else if (parsedExpense < 0) {
            console.warn(`Negative expense value at index ${index}:`, expenseValue);
            parsedExpense = 0; // Default to 0 for negative expense
          }
        }

        // Add validated data to accumulator
        acc.labels.push(String(month));
        acc.incomeData.push(parsedIncome);
        acc.expenseData.push(parsedExpense);

        return acc;
      },
      { labels: [], incomeData: [], expenseData: [] }
    );

    // Return null if no valid data was found
    if (labels.length === 0) {
      console.warn('No valid monthly data found for chart rendering');
      return null;
    }

    return {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.2)',
          tension: 0.1
        },
        {
          label: 'Expenses',
          data: expenseData,
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.2)',
          tension: 0.1
        }
      ]
    };
  };

  // Common chart options function to avoid duplication
  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: {
        display: true,
        text: 'Income vs Expenses Over Time'
      },
      legend: {
        display: showComparison
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            return formatCurrency(value);
          }
        }
      }
    }
  });

  const prepareSummaryData = () => {
    if (!data) return [];

    return [
      {
        label: 'Total Income',
        value: formatCurrency(data.total_income),
        color: '#4caf50'
      },
      {
        label: 'Total Expenses',
        value: formatCurrency(data.total_expense),
        color: '#f44336'
      },
      {
        label: 'Net Income',
        value: formatCurrency(parseFloat(data.total_income || 0) - parseFloat(data.total_expense || 0)),
        color: parseFloat(data.total_income || 0) - parseFloat(data.total_expense || 0) >= 0 ? '#4caf50' : '#f44336'
      },
      {
        label: 'Average Monthly Income',
        value: formatCurrency(data.avg_monthly_income),
        color: '#2196f3'
      },
      {
        label: 'Average Monthly Expenses',
        value: formatCurrency(data.avg_monthly_expense),
        color: '#ff9800'
      }
    ];
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
          reportType="income-expense"
          reportRef={reportRef}
          title="Income vs Expense Report"
        />
      </Box>

      {/* Filters */}
      <ReportFilters
        onFiltersChange={handleFiltersChange}
        reportType="income-expense"
        initialFilters={filters}
        compact={true}
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryData.map((item, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ color: item.color, mb: 1 }}>
                  {item.value}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.label}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Chart Controls */}
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
                <MenuItem value="line">Line Chart</MenuItem>
                <MenuItem value="bar">Bar Chart</MenuItem>
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={showComparison}
                  onChange={(e) => setShowComparison(e.target.checked)}
                />
              }
              label="Show Comparison"
            />
          </Box>

          {/* Chart */}
          {chartData && (
            <Box sx={{ height: 400 }}>
              {chartType === 'line' ? (
                <LineChart
                  data={chartData}
                  options={getChartOptions()}
                />
              ) : (
                <BarChart
                  data={chartData}
                  options={getChartOptions()}
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Monthly Breakdown Table */}
      {data && data.monthly_data && data.monthly_data.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monthly Breakdown
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Month</TableCell>
                    <TableCell align="right">Income</TableCell>
                    <TableCell align="right">Expenses</TableCell>
                    <TableCell align="right">Net</TableCell>
                    <TableCell align="right">% Change</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.monthly_data.map((item, index) => {
                    const net = parseFloat(item.income || 0) - parseFloat(item.expense || 0);
                    const prevNet = index > 0 
                      ? parseFloat(data.monthly_data[index - 1].income || 0) - parseFloat(data.monthly_data[index - 1].expense || 0)
                      : 0;
                    const percentChange = prevNet !== 0 ? ((net - prevNet) / Math.abs(prevNet) * 100) : 0;

                    return (
                      <TableRow key={item.month} hover>
                        <TableCell>{item.month}</TableCell>
                        <TableCell align="right" sx={{ color: '#4caf50' }}>
                          {formatCurrency(item.income)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: '#f44336' }}>
                          {formatCurrency(item.expense)}
                        </TableCell>
                        <TableCell 
                          align="right" 
                          sx={{ 
                            color: net >= 0 ? '#4caf50' : '#f44336',
                            fontWeight: 'bold'
                          }}
                        >
                          {formatCurrency(net)}
                        </TableCell>
                        <TableCell 
                          align="right"
                          sx={{ 
                            color: percentChange >= 0 ? '#4caf50' : '#f44336'
                          }}
                        >
                          {index > 0 ? `${percentChange.toFixed(1)}%` : '-'}
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

export default IncomeVsExpenseReport;
