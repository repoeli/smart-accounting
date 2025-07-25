/**
 * Stripe Subscription Test Page
 * Complete integration test for Stripe subscription functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Chip,
  Paper
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  Launch as LaunchIcon
} from '@mui/icons-material';

import subscriptionAPI from '../../services/subscriptions/subscriptionAPI';
import SubscriptionPlanCard from './SubscriptionPlanCard';

const SubscriptionTestPage = () => {
  const [plans, setPlans] = useState({});
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [currentFeatures, setCurrentFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load plans and subscription details in parallel
      const [plansResponse, detailsResponse] = await Promise.all([
        subscriptionAPI.getSubscriptionPlans(),
        subscriptionAPI.getSubscriptionDetails()
      ]);

      setPlans(plansResponse.plans || {});
      setCurrentSubscription(detailsResponse.subscription);
      setCurrentFeatures(detailsResponse.features || {});

      addTestResult('✅ Successfully loaded subscription data', 'success');
    } catch (err) {
      setError(`Failed to load subscription data: ${err.message}`);
      addTestResult(`❌ Failed to load data: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const addTestResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const handleSelectPlan = async (planId) => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      addTestResult(`🚀 Creating Stripe checkout session for ${planId} plan...`, 'info');

      const result = await subscriptionAPI.createCheckoutSession(
        planId,
        null, // Let backend use default success URL with session_id
        null  // Let backend use default cancel URL
      );

      if (result.success && result.checkout_url) {
        addTestResult(`✅ Checkout session created successfully`, 'success');
        addTestResult(`📋 Session ID: ${result.session_id}`, 'info');
        addTestResult(`🔗 Checkout URL: ${result.checkout_url.substring(0, 50)}...`, 'info');
        
        setSuccess(`Stripe checkout session created! Session ID: ${result.session_id}`);
        
        // Open Stripe checkout in new tab
        window.open(result.checkout_url, '_blank');
      } else {
        throw new Error('Invalid response from checkout session creation');
      }
    } catch (err) {
      const errorMsg = `Failed to create checkout session: ${err.message}`;
      setError(errorMsg);
      addTestResult(`❌ ${errorMsg}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const testHealthCheck = async () => {
    try {
      addTestResult('🔍 Testing subscription health check...', 'info');
      const result = await subscriptionAPI.healthCheck();
      addTestResult(`✅ Health check passed: ${JSON.stringify(result)}`, 'success');
    } catch (err) {
      addTestResult(`❌ Health check failed: ${err.message}`, 'error');
    }
  };

  const getCurrentPlanId = () => {
    if (!currentSubscription) return 'basic';
    return currentSubscription.plan_id || 'basic';
  };

  const formatFeatures = (features) => {
    return Object.entries(features).map(([key, value]) => {
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      let displayValue = value;
      
      if (key === 'max_documents') {
        displayValue = value === 999999 ? 'Unlimited' : value;
      } else if (typeof value === 'boolean') {
        displayValue = value ? 'Yes' : 'No';
      }
      
      return { key, label, value: displayValue, enabled: value };
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom align="center">
        🎯 Stripe Subscription Integration Test
      </Typography>
      
      <Typography variant="h6" align="center" color="text.secondary" paragraph>
        Complete end-to-end testing of Stripe subscription functionality
      </Typography>

      {/* Test Status */}
      <Box sx={{ mb: 4 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', mb: 3 }}>
          <Button
            variant="outlined"
            onClick={loadSubscriptionData}
            disabled={loading}
            startIcon={<InfoIcon />}
          >
            Refresh Data
          </Button>
          
          <Button
            variant="outlined"
            onClick={testHealthCheck}
            startIcon={<CheckCircleIcon />}
          >
            Test Health Check
          </Button>
        </Box>
      </Box>

      {/* Current Subscription Status */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            📊 Current Subscription Status
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Current Plan</Typography>
              <Chip 
                label={getCurrentPlanId().toUpperCase()} 
                color={getCurrentPlanId() === 'basic' ? 'default' : 'primary'}
                size="large"
              />
              
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Subscription:</strong> {currentSubscription ? 'Active' : 'None'}
              </Typography>
              
              {currentSubscription && (
                <>
                  <Typography variant="body2">
                    <strong>Status:</strong> {currentSubscription.status}
                  </Typography>
                  <Typography variant="body2">
                    <strong>Customer ID:</strong> {currentSubscription.stripe_customer_id}
                  </Typography>
                </>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Current Features</Typography>
              <List dense>
                {formatFeatures(currentFeatures).map(({ key, label, value, enabled }) => (
                  <ListItem key={key} sx={{ py: 0 }}>
                    <ListItemText
                      primary={`${label}: ${value}`}
                      primaryTypographyProps={{
                        color: enabled ? 'text.primary' : 'text.secondary'
                      }}
                    />
                  </ListItem>
                ))}
              </List>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Subscription Plans */}
      <Typography variant="h5" gutterBottom>
        💳 Available Subscription Plans
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {Object.entries(plans).map(([planId, plan]) => (
          <Grid item xs={12} md={4} key={planId}>
            <SubscriptionPlanCard
              plan={plan}
              planId={planId}
              currentPlan={getCurrentPlanId()}
              onSelectPlan={handleSelectPlan}
              loading={actionLoading}
              showPopular={planId === 'premium'}
            />
          </Grid>
        ))}
      </Grid>

      {/* Test Results Log */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          📋 Test Results Log
        </Typography>
        
        <Box
          sx={{
            maxHeight: 300,
            overflow: 'auto',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            bgcolor: 'grey.50'
          }}
        >
          {testResults.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No test results yet. Try loading data or creating a checkout session.
            </Typography>
          ) : (
            testResults.map((result, index) => (
              <Box key={index} sx={{ mb: 1 }}>
                <Typography 
                  variant="body2" 
                  component="div"
                  color={
                    result.type === 'success' ? 'success.main' :
                    result.type === 'error' ? 'error.main' : 'text.primary'
                  }
                >
                  <strong>[{result.timestamp}]</strong> {result.message}
                </Typography>
              </Box>
            ))
          )}
        </Box>
        
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            onClick={() => setTestResults([])}
            disabled={testResults.length === 0}
          >
            Clear Log
          </Button>
        </Box>
      </Paper>

      {/* Instructions */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          🧪 Testing Instructions
        </Typography>
        <Typography variant="body2" component="div">
          <strong>1.</strong> Click "Refresh Data" to load current subscription status<br/>
          <strong>2.</strong> Click "Test Health Check" to verify API connectivity<br/>
          <strong>3.</strong> Click "Upgrade to Platinum Plan" to test Stripe checkout creation<br/>
          <strong>4.</strong> A new tab will open with the Stripe checkout page<br/>
          <strong>5.</strong> Use test card: <code>4242 4242 4242 4242</code>, any future expiry, any CVC<br/>
          <strong>6.</strong> Complete the test payment to verify webhook integration<br/>
        </Typography>
      </Alert>
    </Container>
  );
};

export default SubscriptionTestPage;
