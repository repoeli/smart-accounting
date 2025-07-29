import React, { useState } from 'react';
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
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Paper,
  Divider
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Warning,
  Info,
  Lightbulb,
  Refresh,
  MonetizationOn,
  DateRange,
  Analytics,
  PsychologyAlt,
  Speed,
  Timeline
} from '@mui/icons-material';
import { Line, Bar } from 'react-chartjs-2';
import useSmartAnalytics from '../../../hooks/reports/useSmartAnalytics';
import useReportAccess from '../../../hooks/reports/useReportAccess';

const PredictiveAnalytics = () => {
  const [timeRange, setTimeRange] = useState(90);
  const [predictionMonths, setPredictionMonths] = useState(3);
  
  const {
    cashFlow,
    spendingIntelligence,
    cashFlowSummary,
    spendingSummary,
    loading,
    error,
    refresh,
    updateFilters,
    canAccessAnalytics,
    isDataStale
  } = useSmartAnalytics({
    days: timeRange,
    prediction_months: predictionMonths
  });

  const { userPlan } = useReportAccess();

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const formatPercentage = (value) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const handleTimeRangeChange = (event) => {
    const newRange = event.target.value;
    setTimeRange(newRange);
    updateFilters({ days: newRange });
  };

  const handlePredictionChange = (event) => {
    const newMonths = event.target.value;
    setPredictionMonths(newMonths);
    updateFilters({ prediction_months: newMonths });
  };

  const prepareCashFlowChart = () => {
    if (!cashFlow?.historical_data || !cashFlow?.predictions) return null;

    const historical = cashFlow.historical_data;
    const predictions = cashFlow.predictions;
    const labels = [
      ...historical.map(item => new Date(item.month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })),
      ...predictions.map(item => new Date(item.month).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }))
    ];

    return {
      labels,
      datasets: [
        {
          label: 'Historical Income',
          data: [...historical.map(item => item.income), ...Array(predictions.length).fill(null)],
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Historical Expenses',
          data: [...historical.map(item => -Math.abs(item.expenses)), ...Array(predictions.length).fill(null)],
          borderColor: '#f44336',
          backgroundColor: 'rgba(244, 67, 54, 0.1)',
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Predicted Net Flow',
          data: [...Array(historical.length).fill(null), ...predictions.map(item => item.predicted_net_flow)],
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255, 152, 0, 0.2)',
          borderDash: [5, 5],
          fill: false,
          tension: 0.4,
        },
        {
          label: 'Confidence Range (Upper)',
          data: [...Array(historical.length).fill(null), ...predictions.map(item => 
            item.predicted_net_flow + (item.confidence * item.predicted_net_flow * 0.2)
          )],
          borderColor: 'rgba(255, 152, 0, 0.3)',
          backgroundColor: 'rgba(255, 152, 0, 0.1)',
          borderDash: [2, 2],
          fill: '+1',
          tension: 0.4,
        }
      ]
    };
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'warning': return <Warning color="warning" />;
      case 'opportunity': return <TrendingUp color="success" />;
      case 'risk': return <TrendingDown color="error" />;
      default: return <Info color="info" />;
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'success';
    if (confidence >= 0.6) return 'warning';
    return 'error';
  };

  if (!canAccessAnalytics) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <PsychologyAlt sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Predictive Analytics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Unlock AI-powered financial forecasting and spending intelligence
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
        <Typography variant="body2" sx={{ ml: 2 }}>
          Analyzing your financial data with AI...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={() => refresh()}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  const chartData = prepareCashFlowChart();

  return (
    <Box>
      {/* Header with Controls */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Predictive Analytics
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            AI-powered financial forecasting and intelligence
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Analysis Period</InputLabel>
            <Select value={timeRange} onChange={handleTimeRangeChange}>
              <MenuItem value={30}>30 Days</MenuItem>
              <MenuItem value={90}>90 Days</MenuItem>
              <MenuItem value={180}>6 Months</MenuItem>
              <MenuItem value={365}>1 Year</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Forecast</InputLabel>
            <Select value={predictionMonths} onChange={handlePredictionChange}>
              <MenuItem value={3}>3 Months</MenuItem>
              <MenuItem value={6}>6 Months</MenuItem>
              <MenuItem value={12}>12 Months</MenuItem>
            </Select>
          </FormControl>
          
          <Tooltip title={isDataStale ? "Data is stale - click to refresh" : "Refresh data"}>
            <IconButton onClick={() => refresh()} disabled={loading}>
              <Refresh color={isDataStale ? "warning" : "inherit"} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Key Predictions Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Next Month Prediction
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(cashFlowSummary?.nextMonthPrediction || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    {formatPercentage(cashFlowSummary?.confidence || 0)} confidence
                  </Typography>
                </Box>
                <Timeline sx={{ fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Spending Trend
                  </Typography>
                  <Typography variant="h5">
                    {cashFlowSummary?.trend || 'Stable'}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    vs. historical average
                  </Typography>
                </Box>
                <Speed sx={{ fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    Anomalies Detected
                  </Typography>
                  <Typography variant="h5">
                    {spendingSummary?.anomalies?.length || 0}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    unusual transactions
                  </Typography>
                </Box>
                <Analytics sx={{ fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    AI Insights
                  </Typography>
                  <Typography variant="h5">
                    {(cashFlowSummary?.insights?.length || 0) + (spendingSummary?.recommendations?.length || 0)}
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
                    actionable recommendations
                  </Typography>
                </Box>
                <PsychologyAlt sx={{ fontSize: 32, opacity: 0.8 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cash Flow Prediction Chart */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Cash Flow Predictions & Confidence Intervals
          </Typography>
          {chartData && (
            <Box sx={{ height: 400 }}>
              <Line 
                data={chartData}
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
                  },
                  elements: {
                    point: {
                      radius: 4,
                      hoverRadius: 6
                    }
                  }
                }}
              />
            </Box>
          )}
        </CardContent>
      </Card>

      {/* AI Insights and Recommendations */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Lightbulb color="primary" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  AI Financial Insights
                </Typography>
              </Box>
              <List dense>
                {cashFlowSummary?.insights?.map((insight, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Info color="info" />
                    </ListItemIcon>
                    <ListItemText primary={insight} />
                  </ListItem>
                ))}
                {spendingSummary?.recommendations?.map((rec, index) => (
                  <ListItem key={`rec-${index}`}>
                    <ListItemIcon>
                      <TrendingUp color="success" />
                    </ListItemIcon>
                    <ListItemText primary={rec} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Warning color="warning" />
                <Typography variant="h6" sx={{ ml: 1 }}>
                  Alerts & Anomalies
                </Typography>
              </Box>
              <List dense>
                {cashFlowSummary?.alerts?.map((alert, index) => (
                  <ListItem key={index}>
                    <ListItemIcon>
                      <Warning color="warning" />
                    </ListItemIcon>
                    <ListItemText primary={alert} />
                  </ListItem>
                ))}
                {spendingSummary?.anomalies?.slice(0, 5).map((anomaly, index) => (
                  <ListItem key={`anomaly-${index}`}>
                    <ListItemIcon>
                      <TrendingDown color="error" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={`Unusual spending: ${formatCurrency(anomaly.amount)} at ${anomaly.vendor}`}
                      secondary={new Date(anomaly.date).toLocaleDateString()}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Prediction Confidence */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Prediction Confidence Levels
          </Typography>
          {cashFlow?.predictions?.map((prediction, index) => (
            <Box key={index} sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2">
                  {new Date(prediction.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </Typography>
                <Chip 
                  label={`${formatPercentage(prediction.confidence)} confidence`}
                  color={getConfidenceColor(prediction.confidence)}
                  size="small"
                />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={prediction.confidence * 100}
                color={getConfidenceColor(prediction.confidence)}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PredictiveAnalytics;
