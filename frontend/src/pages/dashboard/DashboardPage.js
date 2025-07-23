/**
 * Dashboard Page Component
 * Main dashboard overview for authenticated users
 * Refactored with modular dashboard cards and new API endpoints
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Container, Typography, useTheme } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import receiptService from '../../services/api/receiptService';
import receiptPerformanceService from '../../services/api/receiptPerformanceService';
import tokenStorage from '../../services/storage/tokenStorage';

// Import new modular dashboard cards
import TotalReceiptsCard from '../../components/dashboard/TotalReceiptsCard';
import TotalAmountCard from '../../components/dashboard/TotalAmountCard';
import ThisMonthCard from '../../components/dashboard/ThisMonthCard';
import PendingReceiptsCard from '../../components/dashboard/PendingReceiptsCard';
import RecentIncomeCard from '../../components/dashboard/RecentIncomeCard';
import RecentExpensesCard from '../../components/dashboard/RecentExpensesCard';

import TokenDebug from '../../components/debug/TokenDebug';

function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // Dashboard data state
  const [dashboardData, setDashboardData] = useState({
    totalReceipts: 0,
    totalAmount: 0,
    monthlyReceipts: 0,
    monthlyTotal: 0,
    pendingReceipts: 0,
    incomeReceipts: [],
    expenseReceipts: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data from new endpoint
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch main dashboard metrics
      const response = await receiptService.getDashboardMetrics();
      
      if (response.success) {
        // Map backend response to frontend data structure
        const backendData = response.data;
        setDashboardData({
          totalReceipts: backendData.totalReceipts || 0,
          totalAmount: backendData.totalAmount || 0,
          monthlyReceipts: backendData.monthlyReceipts || 0,
          monthlyTotal: backendData.monthlyTotal || 0,
          pendingReceipts: backendData.pendingReceipts || 0,
          incomeReceipts: backendData.incomeReceipts || [],
          expenseReceipts: backendData.expenseReceipts || []
        });
      } else {
        throw new Error(response.error || 'Failed to fetch dashboard data');
      }

    } catch (error) {
      console.error('❌ DashboardPage: Failed to fetch dashboard data:', error);
      setError(error.message);
      
      // Set default data on error
      setDashboardData({
        totalReceipts: 0,
        totalAmount: 0,
        monthlyReceipts: 0,
        monthlyTotal: 0,
        pendingReceipts: 0,
        incomeReceipts: [],
        expenseReceipts: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only proceed if user is authenticated and not loading
    if (!authLoading && isAuthenticated) {
      const tokens = tokenStorage.getTokens();

      if (tokens.accessToken) {
        // Add a delay to ensure everything is properly initialized
        const timer = setTimeout(() => {
          fetchDashboardData();
        }, 500);

        return () => clearTimeout(timer);
      } else {
        // If no token, wait a bit longer and check again
        const retryTimer = setTimeout(() => {
          const retryTokens = tokenStorage.getTokens();
          if (retryTokens.accessToken) {
            fetchDashboardData();
          }
        }, 1500);
        
        return () => clearTimeout(retryTimer);
      }
    }
  }, [isAuthenticated, authLoading]);

  // Handle navigation to different sections
  const handleNavigateToReceipts = () => navigate('/receipts');
  const handleNavigateToUpload = () => navigate('/receipts/upload');
  const handleNavigateToTest = () => navigate('/receipt-test');

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Debug Component - Remove in production */}
      <TokenDebug />
      
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="600">
          Welcome back, {user?.first_name || user?.email?.split('@')[0] || 'User'}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Here's an overview of your financial data
        </Typography>
      </Box>

      {/* Error State */}
      {error && (
        <Box sx={{ mb: 3, p: 2, bgcolor: 'error.light', borderRadius: 1 }}>
          <Typography color="error.contrastText">
            Failed to load dashboard data: {error}
          </Typography>
        </Box>
      )}

      {/* Quick Actions Banner */}
      <Box
        sx={{
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
          borderRadius: 2,
          p: 3,
          mb: 4,
          color: 'white'
        }}
      >
        <Typography variant="h5" component="h2" gutterBottom fontWeight="600">
          🧾 Smart Receipt System
        </Typography>
        <Typography variant="body1" sx={{ mb: 3, opacity: 0.9 }}>
          AI-powered receipt processing with enhanced analytics. Upload, extract, and manage receipts seamlessly.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          <Box
            component="button"
            onClick={handleNavigateToReceipts}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.9)',
              color: 'primary.main',
              px: 3,
              py: 1.5,
              borderRadius: 1,
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'white',
                transform: 'translateY(-1px)'
              }
            }}
          >
            📊 View All Receipts
          </Box>
          <Box
            component="button"
            onClick={handleNavigateToUpload}
            sx={{
              bgcolor: 'rgba(255, 255, 255, 0.1)',
              color: 'white',
              px: 3,
              py: 1.5,
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.2)',
                transform: 'translateY(-1px)'
              }
            }}
          >
            📤 Upload Receipt
          </Box>
          <Box
            component="button"
            onClick={handleNavigateToTest}
            sx={{
              bgcolor: 'transparent',
              color: 'white',
              px: 3,
              py: 1.5,
              borderRadius: 1,
              border: '1px solid rgba(255, 255, 255, 0.3)',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                transform: 'translateY(-1px)'
              }
            }}
          >
            🔧 Test Page
          </Box>
        </Box>
      </Box>

      {/* Main Metrics Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} lg={3}>
          <TotalReceiptsCard 
            receiptsCount={dashboardData.totalReceipts} 
            loading={loading} 
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <TotalAmountCard 
            totalAmount={dashboardData.totalAmount} 
            currency="GBP"
            loading={loading} 
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <ThisMonthCard 
            monthlyReceipts={dashboardData.monthlyReceipts || 0}
            monthlyTotal={dashboardData.monthlyTotal} 
            currency="GBP"
            loading={loading} 
          />
        </Grid>
        <Grid item xs={12} sm={6} lg={3}>
          <PendingReceiptsCard 
            pendingReceipts={dashboardData.pendingReceipts} 
            loading={loading} 
          />
        </Grid>
      </Grid>

      {/* Recent Activity Grid */}
      <Grid container spacing={3}>
        <Grid item xs={12} lg={6}>
          <RecentIncomeCard 
            incomeReceipts={dashboardData.incomeReceipts} 
            loading={loading} 
          />
        </Grid>
        <Grid item xs={12} lg={6}>
          <RecentExpensesCard 
            expenseReceipts={dashboardData.expenseReceipts} 
            loading={loading} 
          />
        </Grid>
      </Grid>
    </Container>
  );
}

export default DashboardPage;
