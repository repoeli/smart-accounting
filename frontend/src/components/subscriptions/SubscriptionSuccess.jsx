/**
 * Subscription Success Component
 * Handles successful Stripe checkout completion and displays confirmation.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Check as CheckIcon,
  Home as HomeIcon,
  Receipt as ReceiptIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';

import subscriptionAPI from '../../services/subscriptions/subscriptionAPI';
import useReportAccess from '../../hooks/reports/useReportAccess';

const SubscriptionSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { refreshSubscription } = useReportAccess();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [features, setFeatures] = useState(null);

  // Try multiple methods to extract session ID
  const getSessionId = () => {
    // Method 1: URL search params
    const sessionIdFromParams = searchParams.get('session_id');
    if (sessionIdFromParams) {
      console.log('✅ Session ID found via searchParams:', sessionIdFromParams);
      return sessionIdFromParams;
    }

    // Method 2: Direct URL parsing
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdFromUrl = urlParams.get('session_id');
    if (sessionIdFromUrl) {
      console.log('✅ Session ID found via URLSearchParams:', sessionIdFromUrl);
      return sessionIdFromUrl;
    }

    // Method 3: Hash parameters (in case Stripe redirects differently)
    const hash = window.location.hash;
    if (hash.includes('session_id=')) {
      const hashSessionId = hash.split('session_id=')[1]?.split('&')[0];
      if (hashSessionId) {
        console.log('✅ Session ID found in hash:', hashSessionId);
        return hashSessionId;
      }
    }

    console.error('❌ Session ID not found in URL');
    return null;
  };

  const sessionId = getSessionId();

  useEffect(() => {
    console.log('🔍 SubscriptionSuccess: URL search params:', window.location.search);
    console.log('🔍 SubscriptionSuccess: Session ID from params:', sessionId);
    
    if (!sessionId) {
      console.error('❌ SubscriptionSuccess: No session ID provided');
      setError('No session ID provided. Please try again.');
      setLoading(false);
      return;
    }

    console.log('✅ SubscriptionSuccess: Processing checkout with session ID:', sessionId);
    processSuccessfulCheckout();
  }, [sessionId]);

  const processSuccessfulCheckout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 SubscriptionSuccess: Processing checkout success for session:', sessionId);
      
      // Process the successful checkout
      const response = await subscriptionAPI.processCheckoutSuccess(sessionId);
      
      console.log('📦 SubscriptionSuccess: API response:', response);
      
      if (response && response.success) {
        console.log('✅ SubscriptionSuccess: Processing successful');
        setSubscriptionData(response.subscription);
        setFeatures(response.features);
        
        // Refresh the subscription data in the context
        setTimeout(() => {
          console.log('🔄 SubscriptionSuccess: Refreshing subscription context');
          refreshSubscription();
        }, 1000);
      } else {
        const errorMessage = response?.error || 'Failed to process checkout';
        console.error('❌ SubscriptionSuccess: Processing failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
    } catch (err) {
      console.error('❌ SubscriptionSuccess: Error processing checkout success:', err);
      setError(err.message || 'An error occurred while processing your subscription');
    } finally {
      setLoading(false);
    }
  };

  const getFeatureLabel = (key, value) => {
    const labels = {
      max_documents: `${value === 999999 ? 'Unlimited' : value} documents/month`,
      has_api_access: 'API Access',
      has_report_export: 'Report Export (CSV/PDF)',
      has_bulk_upload: 'Bulk Upload',
      has_white_label: 'White Label',
    };
    
    return labels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="60vh">
        <CircularProgress size={60} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Processing your subscription...
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Please wait while we confirm your payment
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box maxWidth="md" mx="auto" px={2} py={4}>
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
            <Typography variant="h5" gutterBottom>
              Something went wrong
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              We encountered an issue processing your subscription. Please try again or contact support if the problem persists.
            </Typography>
            <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button
                variant="contained"
                onClick={() => navigate('/subscriptions/checkout')}
              >
                Try Again
              </Button>
              <Button
                variant="outlined"
                onClick={() => navigate('/dashboard')}
              >
                Go to Dashboard
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  }

  return (
    <Box maxWidth="md" mx="auto" px={2} py={4}>
      {/* Success Header */}
      <Card sx={{ mb: 4 }}>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <CheckCircleIcon 
            sx={{ 
              fontSize: 80, 
              color: 'success.main', 
              mb: 2 
            }} 
          />
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome to {subscriptionData?.plan?.charAt(0).toUpperCase() + subscriptionData?.plan?.slice(1)}!
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Your subscription has been activated successfully
          </Typography>
          
          {subscriptionData && (
            <Box sx={{ mt: 3 }}>
              <Chip
                label={`${subscriptionData.plan?.charAt(0).toUpperCase() + subscriptionData.plan?.slice(1)} Plan`}
                color="success"
                variant="outlined"
                sx={{ mr: 2 }}
              />
              {subscriptionData.amount && (
                <Chip
                  label={`£${subscriptionData.amount} ${subscriptionData.currency?.toUpperCase()}/month`}
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Subscription Details */}
      {subscriptionData && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Subscription Details
            </Typography>
            
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Plan
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {subscriptionData.plan?.charAt(0).toUpperCase() + subscriptionData.plan?.slice(1)}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary">
                  Status
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {subscriptionData.status?.charAt(0).toUpperCase() + subscriptionData.status?.slice(1)}
                </Typography>
                
                {subscriptionData.amount && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">
                      Amount
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      £{subscriptionData.amount} {subscriptionData.currency?.toUpperCase()}/month
                    </Typography>
                  </>
                )}
              </Box>
              
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  Next Billing Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {formatDate(subscriptionData.current_period_end)}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary">
                  Subscription ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace" gutterBottom>
                  {subscriptionData.stripe_subscription_id}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Features */}
      {features && (
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Your Plan Features
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              You now have access to all these features:
            </Typography>
            
            <List>
              {Object.entries(features).map(([key, value]) => {
                if (key === 'current_plan' || key === 'subscription_active' || key === 'subscription_id') {
                  return null;
                }
                
                const isEnabled = typeof value === 'boolean' ? value : value > 0;
                if (!isEnabled) return null;
                
                return (
                  <ListItem key={key} dense>
                    <ListItemIcon sx={{ minWidth: 32 }}>
                      <CheckIcon color="success" fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={getFeatureLabel(key, value)}
                      primaryTypographyProps={{
                        variant: 'body2'
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            What's Next?
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<HomeIcon />}
              onClick={() => navigate('/dashboard')}
              fullWidth
            >
              Go to Dashboard
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<ReceiptIcon />}
              onClick={() => navigate('/subscriptions/history')}
              fullWidth
            >
              View Payment History
            </Button>
            
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => navigate('/subscriptions')}
              fullWidth
            >
              Manage Subscription
            </Button>
          </Box>
          
          <Divider sx={{ my: 3 }} />
          
          <Typography variant="body2" color="text.secondary" align="center">
            Need help? Check out our documentation or contact support.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default SubscriptionSuccess;
