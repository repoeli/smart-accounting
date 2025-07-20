import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import subscriptionAPI from '../../services/subscriptionAPI';

const SubscriptionSuccessPage = () => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Wait a moment for Stripe webhook to process, then check subscription
    const timer = setTimeout(() => {
      checkSubscription();
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const checkSubscription = async () => {
    try {
      const result = await subscriptionAPI.getCurrentSubscription();
      if (result.success && result.data) {
        setSubscription(result.data);
      } else {
        setError('Subscription not found. Please contact support.');
      }
    } catch (err) {
      setError('Failed to verify subscription. Please contact support.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  const handleViewPlans = () => {
    navigate('/pricing');
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CircularProgress size={60} sx={{ mb: 3 }} />
          <Typography variant="h5" gutterBottom>
            Processing your subscription...
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please wait while we confirm your payment and set up your account.
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <ErrorIcon color="error" sx={{ fontSize: 80, mb: 3 }} />
          <Typography variant="h4" gutterBottom color="error">
            Subscription Verification Failed
          </Typography>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              onClick={handleViewPlans}
              color="primary"
            >
              View Plans
            </Button>
            <Button 
              variant="outlined" 
              onClick={handleGoToDashboard}
            >
              Go to Dashboard
            </Button>
          </Box>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <CheckCircleIcon color="success" sx={{ fontSize: 80, mb: 3 }} />
        
        <Typography variant="h3" component="h1" gutterBottom color="success.main">
          Welcome to {subscription?.plan_display || 'Smart Accounting'}!
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Your subscription has been successfully activated.
        </Typography>

        {subscription && (
          <Box sx={{ mb: 4 }}>
            <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
              <Typography variant="h6" gutterBottom>
                Subscription Details
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Plan:</strong> {subscription.plan_display}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Status:</strong> {subscription.status_display}
              </Typography>
              <Typography variant="body1" sx={{ mb: 1 }}>
                <strong>Amount:</strong> £{subscription.amount} {subscription.currency}
              </Typography>
              <Typography variant="body1">
                <strong>Next billing:</strong> {new Date(subscription.current_period_end).toLocaleDateString()}
              </Typography>
            </Paper>
          </Box>
        )}

        <Typography variant="body1" sx={{ mb: 4 }}>
          You now have access to all the features included in your plan. 
          Start uploading your receipts and managing your finances more efficiently!
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
          <Button 
            variant="contained" 
            size="large"
            onClick={handleGoToDashboard}
            sx={{ px: 4, py: 1.5 }}
          >
            Get Started
          </Button>
          <Button 
            variant="outlined" 
            size="large"
            onClick={handleViewPlans}
            sx={{ px: 4, py: 1.5 }}
          >
            View All Plans
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SubscriptionSuccessPage;