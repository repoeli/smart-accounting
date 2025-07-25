import React, { useState, useEffect } from 'react';
import { 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Chip,
  Button
} from '@mui/material';
import { 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  AccountBalance,
  Refresh,
  Assessment,
  PieChart,
  BarChart
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useReportAccess } from '../../hooks/reports/useReportAccess';
import reportsAPI from '../../services/reports/reportsAPI';

const SummaryWidget = ({ autoRefresh = true, refreshInterval = 30000 }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const navigate = useNavigate();
  const { canViewReports, subscription } = useReportAccess();

  const fetchSummaryData = async () => {
    if (!canViewReports) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      const result = await reportsAPI.getSummary();
      setSummaryData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch summary data:', err);
      setError('Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummaryData();

    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchSummaryData, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, refreshInterval]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount || 0);
  };

  const calculateTrend = (current, previous) => {
    if (!previous || previous === 0) return { value: 0, direction: 'neutral' };
    const change = ((current - previous) / previous) * 100;
    return {
      value: Math.abs(change).toFixed(1),
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  const MetricCard = ({ title, value, icon, trend, color = 'primary' }) => {
    const trendIcon = trend?.direction === 'up' ? (
      <TrendingUp sx={{ fontSize: 16, color: 'success.main' }} />
    ) : trend?.direction === 'down' ? (
      <TrendingDown sx={{ fontSize: 16, color: 'error.main' }} />
    ) : null;

    return (
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              {title}
            </Typography>
            <Box sx={{ color: `${color}.main` }}>
              {icon}
            </Box>
          </Box>
          
          <Typography variant="h4" component="div" sx={{ mb: 1, fontWeight: 'bold' }}>
            {value}
          </Typography>
          
          {trend && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trendIcon}
              <Typography 
                variant="caption" 
                color={trend.direction === 'up' ? 'success.main' : trend.direction === 'down' ? 'error.main' : 'text.secondary'}
              >
                {trend.value}% vs last month
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Tooltip title="Retry">
            <IconButton color="inherit" size="small" onClick={fetchSummaryData}>
              <Refresh />
            </IconButton>
          </Tooltip>
        }
      >
        {error}
      </Alert>
    );
  }

  const metrics = summaryData?.quick_metrics || {};
  const expenseTrend = calculateTrend(metrics.current_month_expenses, metrics.last_month_expenses);

  // Show subscription prompt if no access
  if (!canViewReports) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Assessment sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Financial Reports
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upgrade to Professional to access detailed financial reports and analytics
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/subscriptions')}
              startIcon={<TrendingUp />}
            >
              Upgrade Now
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h2">
          Dashboard Overview
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {lastUpdated && (
            <Typography variant="caption" color="text.secondary">
              Updated at {lastUpdated.toLocaleTimeString()}
            </Typography>
          )}
          <Tooltip title="Refresh">
            <IconButton onClick={fetchSummaryData} size="small" disabled={loading}>
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Current Month Expenses"
            value={formatCurrency(metrics.current_month_expenses)}
            icon={<TrendingDown />}
            trend={expenseTrend}
            color="error"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="YTD Income"
            value={formatCurrency(metrics.ytd_income)}
            icon={<TrendingUp />}
            color="success"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Net Balance"
            value={formatCurrency(metrics.ytd_net)}
            icon={<AccountBalance />}
            color={metrics.ytd_net >= 0 ? 'success' : 'error'}
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Total Receipts"
            value={metrics.total_receipts?.toLocaleString() || '0'}
            icon={<Receipt />}
            color="primary"
          />
        </Grid>
      </Grid>

      {summaryData?.top_categories_ytd?.length > 0 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="h6" component="h3" sx={{ mb: 2 }}>
            Top Spending Categories
          </Typography>
          <Grid container spacing={2}>
            {summaryData.top_categories_ytd.slice(0, 3).map((category, index) => (
              <Grid item xs={12} sm={4} key={`category-${index}-${category.category}`}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {formatCurrency(category.total)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {category.category_display}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}

      {/* Quick Actions for Reports */}
      <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Typography variant="subtitle1" sx={{ mb: 2 }}>
          Quick Actions
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<Assessment />}
            label="View All Reports"
            onClick={() => navigate('/reports')}
            clickable
            color="primary"
            variant="outlined"
          />
          <Chip
            icon={<BarChart />}
            label="Income vs Expense"
            onClick={() => navigate('/reports')}
            clickable
            variant="outlined"
          />
          <Chip
            icon={<PieChart />}
            label="Category Breakdown"
            onClick={() => navigate('/reports')}
            clickable
            variant="outlined"
          />
          {subscription?.plan === 'platinum' && (
            <Chip
              label="Tax Reports"
              onClick={() => navigate('/reports')}
              clickable
              variant="outlined"
              color="secondary"
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default SummaryWidget;
