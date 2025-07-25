/**
 * Stripe Checkout Component
 * Handles the subscription checkout process with Stripe integration.
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Paper,
  Button,
  Backdrop
} from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import subscriptionAPI from '../../services/subscriptions/subscriptionAPI';
import SubscriptionPlanCard from './SubscriptionPlanCard';
import useReportAccess from '../../hooks/reports/useReportAccess';

const Checkout = () => {
  const navigate = useNavigate();
  const { userPlan, loading: accessLoading, refreshSubscription } = useReportAccess();
  
  const [plans, setPlans] = useState({});
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [error, setError] = useState(null);
  const [redirecting, setRedirecting] = useState(false);

  // Fetch available subscription plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await subscriptionAPI.getSubscriptionPlans();
        setPlans(response.plans);
        
      } catch (err) {
        console.error('Error fetching subscription plans:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSelectPlan = async (planId) => {
    try {
      setProcessingPlan(planId);
      setError(null);
      
      // Create checkout session
      const response = await subscriptionAPI.createCheckoutSession(planId);
      
      if (response.success && response.checkout_url) {
        setRedirecting(true);
        // Redirect to Stripe Checkout
        window.location.href = response.checkout_url;
      } else {
        throw new Error('Failed to create checkout session');
      }
      
    } catch (err) {
      console.error('Error creating checkout session:', err);
      setError(err.message);
      setProcessingPlan(null);
    }
  };

  const handleGoBack = () => {
    navigate('/dashboard');
  };

  if (loading || accessLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleGoBack}
            sx={{ mb: 2 }}
          >
            Back to Dashboard
          </Button>
          
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Choose Your Plan
          </Typography>
          
          <Typography variant="h6" component="p" align="center" color="text.secondary" sx={{ mb: 4 }}>
            Select the perfect plan for your accounting needs
          </Typography>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 4 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Current Plan Info */}
        {userPlan && (
          <Paper sx={{ p: 3, mb: 4, bgcolor: 'background.paper' }}>
            <Typography variant="h6" gutterBottom>
              Current Plan: <strong>{userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You can upgrade or downgrade your plan at any time. Changes will take effect immediately.
            </Typography>
          </Paper>
        )}

        {/* Subscription Plans */}
        <Grid container spacing={4} justifyContent="center">
          {Object.entries(plans).map(([planId, plan]) => (
            <Grid item xs={12} md={4} key={planId}>
              <SubscriptionPlanCard
                plan={plan}
                planId={planId}
                currentPlan={userPlan}
                onSelectPlan={handleSelectPlan}
                loading={processingPlan === planId}
                disabled={processingPlan !== null}
                showPopular={true}
              />
            </Grid>
          ))}
        </Grid>

        {/* Features Comparison */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h4" component="h2" align="center" gutterBottom>
            Why Choose Smart Accounting?
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>
                  🚀 Lightning Fast
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Process receipts and generate reports in seconds with our AI-powered system
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>
                  🔒 Bank-Level Security
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Your financial data is protected with enterprise-grade encryption
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Box textAlign="center">
                <Typography variant="h6" gutterBottom>
                  📊 Powerful Analytics
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Get insights into your business with advanced reporting and analytics
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* FAQ Section */}
        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" component="h2" align="center" gutterBottom>
            Frequently Asked Questions
          </Typography>
          
          <Grid container spacing={3} sx={{ mt: 2 }}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Can I change my plan later?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, 
                and you'll be charged or credited proportionally.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Is there a free trial?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Our Basic plan is completely free forever. You can upgrade to Premium or Platinum 
                when you need more features.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                What payment methods do you accept?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                We accept all major credit cards, debit cards, and bank transfers through Stripe's 
                secure payment processing.
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Can I cancel anytime?
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Yes, you can cancel your subscription at any time. You'll continue to have access 
                to paid features until the end of your billing period.
              </Typography>
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Redirecting Backdrop */}
      <Backdrop
        sx={{ color: '#fff', zIndex: (theme) => theme.zIndex.drawer + 1 }}
        open={redirecting}
      >
        <Box textAlign="center">
          <CircularProgress color="inherit" size={60} sx={{ mb: 2 }} />
          <Typography variant="h6">
            Redirecting to secure checkout...
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please wait while we prepare your subscription
          </Typography>
        </Box>
      </Backdrop>
    </>
  );
};

export default Checkout;
