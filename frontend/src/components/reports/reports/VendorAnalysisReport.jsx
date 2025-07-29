import React, { useState, useEffect } from 'react';
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
  MenuItem,
  Avatar
} from '@mui/material';
import BarChart from '../charts/BarChart';
import PieChart from '../charts/PieChart';
import ExportButtons from '../ExportButtons';
import ReportFilters from '../ReportFilters';
import { reportsAPI } from '../../../services/reports/reportsAPI';
import { Store, TrendingUp, Receipt, AttachMoney } from '@mui/icons-material';

const VendorAnalysisReport = ({ onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    limit: 50,
    min_transactions: 1
  });
  const [chartType, setChartType] = useState('bar');
  const [sortBy, setSortBy] = useState('total_spent');

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reportsAPI.getVendorAnalysis(filters);
      setData(response);
    } catch (err) {
      setError(err.message || 'Failed to load report data');
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
    if (!data || !data.vendors) return null;

    const sortedVendors = [...data.vendors].sort((a, b) => {
      if (sortBy === 'total_spent') {
        return parseFloat(b.total_spent || 0) - parseFloat(a.total_spent || 0);
      } else if (sortBy === 'transaction_count') {
        return (b.transaction_count || 0) - (a.transaction_count || 0);
      } else if (sortBy === 'avg_transaction') {
        return parseFloat(b.avg_transaction || 0) - parseFloat(a.avg_transaction || 0);
      }
      return 0;
    });

    const topVendors = sortedVendors.slice(0, 15); // Show top 15 vendors
    const labels = topVendors.map(vendor => vendor.vendor_name || 'Unknown');
    const values = topVendors.map(vendor => {
      if (sortBy === 'total_spent') {
        return parseFloat(vendor.total_spent || 0);
      } else if (sortBy === 'transaction_count') {
        return vendor.transaction_count || 0;
      } else if (sortBy === 'avg_transaction') {
        return parseFloat(vendor.avg_transaction || 0);
      }
      return 0;
    });
    const colors = generateColors(topVendors.length);

    return {
      labels,
      datasets: [
        {
          label: sortBy === 'total_spent' ? 'Total Spent' : 
                 sortBy === 'transaction_count' ? 'Transaction Count' : 'Average Transaction',
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

    const totalSpent = data.vendors.reduce((sum, vendor) => sum + parseFloat(vendor.total_spent || 0), 0);
    const totalTransactions = data.vendors.reduce((sum, vendor) => sum + (vendor.transaction_count || 0), 0);
    const avgPerVendor = data.vendors.length > 0 ? totalSpent / data.vendors.length : 0;
    const topVendor = data.vendors.length > 0 ? 
      data.vendors.reduce((max, vendor) => 
        parseFloat(vendor.total_spent || 0) > parseFloat(max.total_spent || 0) ? vendor : max
      ) : null;

    return [
      {
        label: 'Total Spent',
        value: `$${totalSpent.toLocaleString()}`,
        color: '#4caf50',
        icon: <AttachMoney />
      },
      {
        label: 'Unique Vendors',
        value: data.vendors.length.toString(),
        color: '#2196f3',
        icon: <Store />
      },
      {
        label: 'Total Transactions',
        value: totalTransactions.toLocaleString(),
        color: '#ff9800',
        icon: <Receipt />
      },
      {
        label: 'Top Vendor',
        value: topVendor ? topVendor.vendor_name || 'Unknown' : 'N/A',
        color: '#9c27b0',
        icon: <TrendingUp />
      }
    ];
  };

  const getVendorInitials = (vendorName) => {
    if (!vendorName) return 'UK';
    const words = vendorName.split(' ');
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
  };

  const getFrequencyColor = (frequency) => {
    if (frequency >= 20) return '#4caf50'; // High frequency
    if (frequency >= 10) return '#ff9800'; // Medium frequency
    return '#f44336'; // Low frequency
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
          reportType="vendor-analysis"
          reportRef={null}
          title="Vendor Analysis Report"
        />
      </Box>

      {/* Filters */}
      <ReportFilters
        onFiltersChange={handleFiltersChange}
        reportType="vendor-analysis"
        initialFilters={filters}
        compact={true}
      />

      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {summaryData.map((item, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ height: '100%' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                  <Avatar sx={{ bgcolor: item.color, width: 40, height: 40 }}>
                    {item.icon}
                  </Avatar>
                </Box>
                <Typography variant="h5" sx={{ color: item.color, mb: 1 }}>
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
                <MenuItem value="bar">Bar Chart</MenuItem>
                <MenuItem value="pie">Pie Chart</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                label="Sort By"
              >
                <MenuItem value="total_spent">Total Spent</MenuItem>
                <MenuItem value="transaction_count">Transaction Count</MenuItem>
                <MenuItem value="avg_transaction">Average Transaction</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Chart */}
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
                        text: `Top Vendors by ${sortBy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            if (sortBy === 'total_spent' || sortBy === 'avg_transaction') {
                              return '$' + value.toLocaleString();
                            }
                            return value.toLocaleString();
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
                        text: `Top Vendors by ${sortBy.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`
                      },
                      legend: {
                        position: 'right',
                        labels: {
                          boxWidth: 12
                        }
                      },
                      tooltip: {
                        callbacks: {
                          label: function(context) {
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((context.raw / total) * 100).toFixed(1);
                            if (sortBy === 'total_spent' || sortBy === 'avg_transaction') {
                              return `${context.label}: $${context.raw.toLocaleString()} (${percentage}%)`;
                            }
                            return `${context.label}: ${context.raw.toLocaleString()} (${percentage}%)`;
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

      {/* Vendors Table */}
      {data && data.vendors && data.vendors.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Vendor Details
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Vendor</TableCell>
                    <TableCell align="right">Total Spent</TableCell>
                    <TableCell align="right">Transactions</TableCell>
                    <TableCell align="right">Avg per Transaction</TableCell>
                    <TableCell align="right">Frequency</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Last Transaction</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(() => {
                    // Generate colors once before mapping to avoid repeated function calls
                    const vendorColors = generateColors(data.vendors.length);
                    
                    return data.vendors.slice(0, 50).map((vendor, index) => (
                      <TableRow key={index} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar 
                              sx={{ 
                                bgcolor: vendorColors[index % vendorColors.length],
                                width: 32,
                                height: 32
                              }}
                            >
                              {getVendorInitials(vendor.vendor_name)}
                            </Avatar>
                            <Typography variant="body2">
                              {vendor.vendor_name || 'Unknown Vendor'}
                            </Typography>
                          </Box>
                        </TableCell>
                      <TableCell align="right">
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: '#4caf50',
                            fontWeight: 'medium'
                          }}
                        >
                          ${parseFloat(vendor.total_spent || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={vendor.transaction_count || 0} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" color="text.secondary">
                          ${parseFloat(vendor.avg_transaction || 0).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={`${vendor.transaction_count || 0} transactions`}
                          size="small"
                          sx={{ 
                            backgroundColor: getFrequencyColor(vendor.transaction_count || 0),
                            color: 'white'
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {vendor.primary_category || 'Uncategorized'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {vendor.last_transaction_date 
                            ? new Date(vendor.last_transaction_date).toLocaleDateString()
                            : 'N/A'
                          }
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ));
                  })()}
                </TableBody>
              </Table>
            </TableContainer>
            
            {data.vendors.length > 50 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Showing first 50 vendors. Export to CSV for complete data.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default VendorAnalysisReport;
