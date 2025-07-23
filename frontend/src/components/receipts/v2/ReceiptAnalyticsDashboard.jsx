/**
 * ReceiptAnalyticsDashboard.jsx - New Schema Analytics
 * 
 * Analytics dashboard for receipts using the new flat schema.
 * Shows spending patterns, vendor analysis, and performance metrics.
 */

import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  useTheme,
  alpha
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon,
  Store as StoreIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Speed as SpeedIcon,
  Token as TokenIcon
} from '@mui/icons-material';

const ReceiptAnalyticsDashboard = ({ receipts = [] }) => {
  const theme = useTheme();

  // Calculate analytics from receipt data
  const analytics = useMemo(() => {
    if (!receipts || receipts.length === 0) {
      return {
        totalReceipts: 0,
        totalAmount: 0,
        expenseAmount: 0,
        incomeAmount: 0,
        averageAmount: 0,
        topVendors: [],
        avgProcessingTime: 0,
        totalTokens: 0,
        totalCost: 0,
        categoryBreakdown: {},
        monthlyTrend: []
      };
    }

    let totalAmount = 0;
    let expenseAmount = 0;
    let incomeAmount = 0;
    let totalProcessingTime = 0;
    let totalTokens = 0;
    let totalCost = 0;
    const vendorAmounts = {};
    const categoryBreakdown = {};
    const monthlyData = {};

    receipts.forEach(receipt => {
      const extractedData = receipt.extracted_data || {};
      const performance = receipt.performance || {};
      
      const amount = extractedData.total || 0;
      const type = extractedData.type || 'expense';
      const vendor = extractedData.vendor || 'Unknown';
      
      // Amount calculations
      totalAmount += amount;
      if (type === 'expense') {
        expenseAmount += amount;
      } else {
        incomeAmount += amount;
      }

      // Vendor tracking
      if (!vendorAmounts[vendor]) {
        vendorAmounts[vendor] = { total: 0, count: 0 };
      }
      vendorAmounts[vendor].total += amount;
      vendorAmounts[vendor].count += 1;

      // Performance tracking
      totalProcessingTime += performance.processing_time || 0;
      totalTokens += performance.token_usage || 0;
      totalCost += performance.cost_usd || 0;

      // Category breakdown (auto-categorize based on vendor)
      const category = getCategoryFromVendor(vendor);
      if (!categoryBreakdown[category]) {
        categoryBreakdown[category] = { total: 0, count: 0 };
      }
      categoryBreakdown[category].total += amount;
      categoryBreakdown[category].count += 1;

      // Monthly trend
      const date = new Date(extractedData.date || receipt.uploaded_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { total: 0, expenses: 0, income: 0, count: 0 };
      }
      monthlyData[monthKey].total += amount;
      monthlyData[monthKey][type === 'expense' ? 'expenses' : 'income'] += amount;
      monthlyData[monthKey].count += 1;
    });

    // Top vendors (sorted by total amount)
    const topVendors = Object.entries(vendorAmounts)
      .sort(([,a], [,b]) => b.total - a.total)
      .slice(0, 5)
      .map(([vendor, data]) => ({
        name: vendor,
        total: data.total,
        count: data.count,
        average: data.total / data.count
      }));

    // Monthly trend array
    const monthlyTrend = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, data]) => ({
        month,
        ...data
      }));

    return {
      totalReceipts: receipts.length,
      totalAmount,
      expenseAmount,
      incomeAmount,
      averageAmount: totalAmount / receipts.length,
      topVendors,
      avgProcessingTime: totalProcessingTime / receipts.length,
      totalTokens,
      totalCost,
      categoryBreakdown: Object.entries(categoryBreakdown)
        .sort(([,a], [,b]) => b.total - a.total)
        .slice(0, 5)
        .map(([category, data]) => ({
          name: category,
          total: data.total,
          count: data.count,
          percentage: (data.total / totalAmount) * 100
        })),
      monthlyTrend
    };
  }, [receipts]);

  // Auto-categorize based on vendor name
  const getCategoryFromVendor = (vendor) => {
    const name = vendor.toLowerCase();
    
    if (name.includes('starbucks') || name.includes('cafe') || name.includes('restaurant')) {
      return 'Food & Dining';
    }
    if (name.includes('walmart') || name.includes('grocery') || name.includes('market')) {
      return 'Groceries';
    }
    if (name.includes('shell') || name.includes('exxon') || name.includes('gas')) {
      return 'Transportation';
    }
    if (name.includes('target') || name.includes('amazon') || name.includes('store')) {
      return 'Shopping';
    }
    if (name.includes('office') || name.includes('supplies')) {
      return 'Office & Business';
    }
    
    return 'Other';
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value) => {
    return `${value.toFixed(1)}%`;
  };

  if (receipts.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <AnalyticsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No data for analytics
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload some receipts to see your spending analytics
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Main Financial Metrics */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <ReceiptIcon color="primary" sx={{ mb: 1 }} />
              <Typography variant="h5" fontWeight="bold">
                {analytics.totalReceipts}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Receipts
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <MoneyIcon color="success" sx={{ mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(analytics.totalAmount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Amount
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TrendingUpIcon color="error" sx={{ mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" color="error.main">
                {formatCurrency(analytics.expenseAmount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Expenses
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <TrendingDownIcon color="success" sx={{ mb: 1 }} />
              <Typography variant="h5" fontWeight="bold" color="success.main">
                {formatCurrency(analytics.incomeAmount)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total Income
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Top Vendors */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <StoreIcon />
                Top Vendors
              </Typography>
              
              {analytics.topVendors.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No vendor data available
                </Typography>
              ) : (
                analytics.topVendors.map((vendor, index) => (
                  <Box key={vendor.name} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {index + 1}. {vendor.name}
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatCurrency(vendor.total)}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="caption" color="text.secondary">
                        {vendor.count} transaction{vendor.count > 1 ? 's' : ''}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Avg: {formatCurrency(vendor.average)}
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={(vendor.total / analytics.totalAmount) * 100}
                      sx={{ height: 6, borderRadius: 3 }}
                    />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Category Breakdown */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AnalyticsIcon />
                Category Breakdown
              </Typography>
              
              {analytics.categoryBreakdown.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No category data available
                </Typography>
              ) : (
                analytics.categoryBreakdown.map((category, index) => (
                  <Box key={category.name} sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="body2" fontWeight="medium">
                        {category.name}
                      </Typography>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(category.total)}
                        </Typography>
                        <Chip
                          label={formatPercentage(category.percentage)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={category.percentage}
                      sx={{ height: 6, borderRadius: 3 }}
                      color={index === 0 ? 'primary' : 'secondary'}
                    />
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SpeedIcon />
                AI Processing Performance
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h6" color="primary">
                      {analytics.avgProcessingTime.toFixed(1)}s
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Avg Processing Time
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h6" color="warning.main">
                      ${analytics.totalCost.toFixed(4)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total API Cost
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h6" color="info.main">
                      {analytics.totalTokens.toLocaleString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Tokens Used
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Typography variant="h6" color="success.main">
                      ${(analytics.totalCost / analytics.totalReceipts).toFixed(4)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cost per Receipt
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReceiptAnalyticsDashboard;
