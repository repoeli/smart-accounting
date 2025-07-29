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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip
} from '@mui/material';
import PieChart from '../charts/PieChart';
import BarChart from '../charts/BarChart';
import ExportButtons from '../ExportButtons';
import ReportFilters from '../ReportFilters';
import { reportsAPI } from '../../../services/reports/reportsAPI';

const CategoryBreakdownReport = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    transaction_type: 'expense',
    is_business: null,
    limit: 20
  });
  const [chartType, setChartType] = useState('pie');
  const isMountedRef = useRef(true);

  useEffect(() => {
    fetchData();
    
    // Cleanup function to prevent memory leaks
    return () => {
      isMountedRef.current = false;
    };
  }, [filters]);

  const fetchData = async () => {
    try {
      if (!isMountedRef.current) return;
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getCategoryBreakdown(filters);
      
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      setData(response);
    } catch (err) {
      // Check if component is still mounted before updating state
      if (!isMountedRef.current) return;
      setError(err.message || 'Failed to load report data');
    } finally {
      // Check if component is still mounted before updating state
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const generateColors = (count) => {
    const colors = [
      '#4caf50', '#2196f3', '#ff9800', '#f44336', '#9c27b0',
      '#3f51b5', '#009688', '#8bc34a', '#ff5722', '#795548',
      '#607d8b', '#e91e63', '#cddc39', '#00bcd4', '#ffeb3b'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(colors[i % colors.length]);
    }
    return result;
  };

  const prepareChartData = () => {
    if (!data || !data.categories) return null;

    // Validate and filter out invalid category items
    const validCategories = data.categories.filter(item => {
      // Check if item exists and is an object
      if (!item || typeof item !== 'object') return false;
      
      // Check if total_amount exists and is a valid number
      const amount = item.total_amount;
      if (amount === null || amount === undefined) return false;
      
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || !isFinite(parsedAmount)) return false;
      
      // Include items with valid amounts (including 0)
      return true;
    });

    // Return null if no valid categories found
    if (validCategories.length === 0) return null;

    // Safely map validated data
    const labels = validCategories.map(item => {
      // Ensure category is a string, fallback to 'Uncategorized'
      const category = item.category;
      if (typeof category === 'string' && category.trim().length > 0) {
        return category.trim();
      }
      return 'Uncategorized';
    });

    const values = validCategories.map(item => {
      const amount = parseFloat(item.total_amount);
      // Additional safety check (should be valid due to filtering above)
      return isNaN(amount) ? 0 : Math.abs(amount); // Use absolute value for chart display
    });

    const colors = generateColors(validCategories.length);

    return {
      labels,
      datasets: [
        {
          label: filters.transaction_type === 'income' ? 'Income by Category' : 'Expenses by Category',
          data: values,
          backgroundColor: colors,
          borderColor: colors.map(color => color + '80'),
          borderWidth: 1
        }
      ]
    };
  };

  const prepareSummaryData = () => {
    if (!data) return [];

    const totalAmount = data.categories.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
    const avgPerCategory = data.categories.length > 0 ? totalAmount / data.categories.length : 0;
    const topCategory = data.categories.length > 0 ? data.categories[0] : null;

    return [
      {
        label: `Total ${filters.transaction_type === 'income' ? 'Income' : 'Expenses'}`,
        value: `$${totalAmount.toLocaleString()}`,
        color: filters.transaction_type === 'income' ? '#4caf50' : '#f44336'
      },
      {
        label: 'Categories',
        value: data.categories.length.toString(),
        color: '#2196f3'
      },
      {
        label: 'Average per Category',
        value: `$${avgPerCategory.toLocaleString()}`,
        color: '#ff9800'
      },
      {
        label: 'Top Category',
        value: topCategory ? topCategory.category || 'Uncategorized' : 'N/A',
        color: '#9c27b0'
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
    <Box>
      {/* Export Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
        <ExportButtons
          reportData={data}
          reportType="category-breakdown"
          reportRef={null}
          title="Category Breakdown Report"
        />
      </Box>

      {/* Filters */}
      <ReportFilters
        onFiltersChange={handleFiltersChange}
        reportType="category-breakdown"
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
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Chart Controls and Visualization */}
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
                <MenuItem value="pie">Pie Chart</MenuItem>
                <MenuItem value="bar">Bar Chart</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Chart */}
          {chartData && (
            <Box sx={{ height: 400 }}>
              {chartType === 'pie' ? (
                <PieChart
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      title: {
                        display: true,
                        text: `${filters.transaction_type === 'income' ? 'Income' : 'Expense'} Breakdown by Category`
                      },
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 12,
                          padding: 15
                        }
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
              ) : (
                <BarChart
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      title: {
                        display: true,
                        text: `${filters.transaction_type === 'income' ? 'Income' : 'Expense'} Breakdown by Category`
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
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Category Details Table */}
      {data && data.categories && data.categories.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Category Details
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell align="right">Transaction Count</TableCell>
                    <TableCell align="right">Percentage</TableCell>
                    <TableCell align="right">Average per Transaction</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    // Precompute values outside the map to avoid O(n²) complexity
                    const totalAmount = data.categories.reduce((sum, item) => sum + parseFloat(item.total_amount || 0), 0);
                    const categoryColors = generateColors(data.categories.length);
                    
                    return data.categories.map((category, index) => {
                      const percentage = totalAmount > 0 ? (parseFloat(category.total_amount || 0) / totalAmount * 100) : 0;
                      const avgPerTransaction = category.transaction_count > 0 
                        ? parseFloat(category.total_amount || 0) / category.transaction_count 
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
                                  backgroundColor: categoryColors[index]
                                }}
                              />
                              {category.category || 'Uncategorized'}
                            </Box>
                          </TableCell>
                        <TableCell align="right">
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: filters.transaction_type === 'income' ? '#4caf50' : '#f44336',
                              fontWeight: 'medium'
                            }}
                          >
                            ${parseFloat(category.total_amount || 0).toLocaleString()}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={category.transaction_count || 0} 
                            size="small" 
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {percentage.toFixed(1)}%
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" color="text.secondary">
                            ${avgPerTransaction.toLocaleString()}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })();
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

export default CategoryBreakdownReport;
