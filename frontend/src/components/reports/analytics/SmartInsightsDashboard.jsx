import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
  Paper,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  Info,
  Lightbulb,
  Refresh,
  MonetizationOn,
  ShoppingCart,
  Business,
  Analytics
} from '@mui/icons-material';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { reportsAPI } from '../../../services/reports/reportsAPI';
import useReportAccess from '../../../hooks/reports/useReportAccess';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement
);

const SmartInsightsDashboard = () => {
  const [cashFlowData, setCashFlowData] = useState(null);
  const [spendingData, setSpendingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('cashflow');
  const { canAccessReport, userPlan } = useReportAccess();

  useEffect(() => {
    if (canAccessReport('vendor-analysis')) { // Premium feature check
      fetchAnalyticsData();
    }
  }, [canAccessReport]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [cashFlowResponse, spendingResponse] = await Promise.all([
        reportsAPI.getPredictiveCashFlow(),
        reportsAPI.getSpendingIntelligence({ days: 90 })
      ]);

      setCashFlowData(cashFlowResponse);
      setSpendingData(spendingResponse);
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
      setError('Failed to load smart insights. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const prepareCashFlowChart = () => {
    if (!cashFlowData) return null;

    const historical = cashFlowData.historical_data || [];
    const predictions = cashFlowData.predictions || [];
    const allData = [...historical, ...predictions];

    return {
      labels: allData.map(item => {
        const date = new Date(item.month || item.month);
        return date.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
      }),
      datasets: [
        {
          label: 'Historical Net Flow',
          data: historical.map(item => item.net_flow),
          borderColor: '#2196f3',
          backgroundColor: 'rgba(33, 150, 243, 0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Predicted Net Flow',
          data: [...Array(historical.length).fill(null), ...predictions.map(item => item.predicted_net_flow)],
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        }
      ]
    };
  };

  const prepareSpendingChart = () => {
    if (!spendingData) return null;

    const categories = spendingData.category_insights?.slice(0, 8) || [];
    
    return {
      labels: categories.map(cat => cat.category_display),
      datasets: [{
        data: categories.map(cat => cat.total_spent),
        backgroundColor: [
          '#ff6384', '#36a2eb', '#cc65fe', '#ffce56',
          '#4bc0c0', '#9966ff', '#ff9f40', '#ff6384'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    };
  };

  const renderInsightCard = (title, items, icon, color = 'primary') => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {icon}
          <Typography variant="h6" sx={{ ml: 1, color: `${color}.main` }}>
            {title}
          </Typography>
        </Box>
        <List dense>
          {items.map((item, index) => (
            <ListItem key={index} sx={{ px: 0 }}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {item.type === 'alert' ? <Warning color="warning" /> : <Info color="info" />}
              </ListItemIcon>
              <ListItemText 
                primary={item.text || item}
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );

  if (!canAccessReport('vendor-analysis')) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Analytics sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Smart Insights Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upgrade to Premium to access AI-powered financial insights and predictive analytics
            </Typography>
            <Chip label="Premium Feature" color="primary" />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <IconButton color="inherit" size="small" onClick={fetchAnalyticsData}>
            <Refresh />
          </IconButton>
        }
      >
        {error}
      </Alert>
    );
  }

  const cashFlowChart = prepareCashFlowChart();
  const spendingChart = prepareSpendingChart();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Smart Insights Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            AI-powered financial analytics and predictions
          </Typography>
        </Box>
        <Tooltip title="Refresh Data">
          <IconButton onClick={fetchAnalyticsData} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Monthly Net
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {formatCurrency(cashFlowData?.summary?.avg_monthly_net || 0)}
                  </Typography>
                </Box>
                <TrendingUp color="primary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Categories
                  </Typography>
                  <Typography variant="h5" color="secondary">
                    {spendingData?.summary?.unique_categories || 0}
                  </Typography>
                </Box>
                <ShoppingCart color="secondary" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Unique Vendors
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {spendingData?.summary?.unique_vendors || 0}
                  </Typography>
                </Box>
                <Business color="success" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Avg Transaction
                  </Typography>
                  <Typography variant="h5" color="warning.main">
                    {formatCurrency(spendingData?.summary?.avg_transaction_size || 0)}
                  </Typography>
                </Box>
                <MonetizationOn color="warning" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Cash Flow Prediction (Next 3 Months)
              </Typography>
              {cashFlowChart && (
                <Box sx={{ height: 300 }}>
                  <Line 
                    data={cashFlowChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          ticks: {
                            callback: function(value) {
                              return formatCurrency(value);
                            }
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Spending by Category
              </Typography>
              {spendingChart && (
                <Box sx={{ height: 300 }}>
                  <Doughnut 
                    data={spendingChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: {
                            boxWidth: 12,
                            padding: 15
                          }
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return `${context.label}: ${formatCurrency(context.raw)}`;
                            }
                          }
                        }
                      }
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Insights Section */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          {renderInsightCard(
            'Key Insights',
            cashFlowData?.insights?.map(insight => ({ text: insight, type: 'info' })) || [],
            <Lightbulb />,
            'primary'
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {renderInsightCard(
            'Alerts & Warnings',
            [
              ...(cashFlowData?.alerts?.map(alert => ({ text: alert, type: 'alert' })) || []),
              ...(spendingData?.anomalies?.slice(0, 3).map(anomaly => ({
                text: `Unusual ${formatCurrency(anomaly.amount)} transaction at ${anomaly.vendor}`,
                type: 'alert'
              })) || [])
            ],
            <Warning />,
            'warning'
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          {renderInsightCard(
            'Recommendations',
            spendingData?.recommendations?.map(rec => ({ text: rec, type: 'info' })) || [],
            <TrendingUp />,
            'success'
          )}
        </Grid>
      </Grid>

      {/* Additional Analysis */}
      {spendingData?.potential_duplicates?.length > 0 && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="warning.main">
              Potential Duplicate Transactions
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              These transactions might be duplicates. Please review for accuracy.
            </Typography>
            <List>
              {spendingData.potential_duplicates.slice(0, 5).map((duplicate, index) => (
                <ListItem key={index} divider>
                  <ListItemText
                    primary={`${duplicate.vendor} - ${formatCurrency(duplicate.amount)}`}
                    secondary={`Date: ${new Date(duplicate.date).toLocaleDateString()} | ${duplicate.duplicate_count} similar transactions`}
                  />
                  <Chip label={`${duplicate.duplicate_count} matches`} size="small" color="warning" />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default SmartInsightsDashboard;
