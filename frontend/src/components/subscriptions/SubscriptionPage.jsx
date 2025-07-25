/**
 * Subscription Management Page
 * Main subscription page integrated with the application
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
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  Payment as PaymentIcon,
  CheckCircle as CheckCircleIcon,
  Info as InfoIcon,
  History as HistoryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';

import subscriptionAPI from '../../services/subscriptions/subscriptionAPI';
import SubscriptionPlanCard from './SubscriptionPlanCard';
import { useAuth } from '../../context/AuthContext';

const SubscriptionPage = () => {
  const { user } = useAuth();
  const [plans, setPlans] = useState({});
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [currentFeatures, setCurrentFeatures] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [plansResponse, detailsResponse] = await Promise.all([
        subscriptionAPI.getSubscriptionPlans(),
        subscriptionAPI.getSubscriptionDetails()
      ]);

      setPlans(plansResponse.plans || {});
      setCurrentSubscription(detailsResponse.subscription);
      setCurrentFeatures(detailsResponse.features || {});
    } catch (err) {
      setError(`Failed to load subscription data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentPlanId = () => {
    if (!currentSubscription) return 'basic';
    return currentSubscription.plan || 'basic';
  };

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
    setUpgradeDialogOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    if (!selectedPlan) return;

    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);
      setUpgradeDialogOpen(false);

      const result = await subscriptionAPI.createCheckoutSession(
        selectedPlan,
        null, // Let backend use default success URL with session_id
        null  // Let backend use default cancel URL
      );

      if (result.success && result.checkout_url) {
        setSuccess(`Stripe checkout session created! Redirecting to payment...`);
        
        // Redirect to Stripe checkout
        window.location.href = result.checkout_url;
      } else {
        throw new Error('Invalid response from checkout session creation');
      }
    } catch (err) {
      const errorMsg = `Failed to create checkout session: ${err.message}`;
      setError(errorMsg);
    } finally {
      setActionLoading(false);
    }
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
      <Typography variant="h3" gutterBottom>
        Subscription Management
      </Typography>
      
      <Typography variant="h6" color="text.secondary" paragraph>
        Manage your Smart Accounting subscription and billing
      </Typography>

      {/* Status Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}

      {/* Current Subscription Status */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5">
              Current Subscription
            </Typography>
            <Chip 
              label={getCurrentPlanId().toUpperCase()} 
              color={getCurrentPlanId() === 'basic' ? 'default' : 'primary'}
              size="large"
            />
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Plan Details</Typography>
              <Typography variant="body1" paragraph>
                <strong>User:</strong> {user?.first_name} {user?.last_name}
              </Typography>
              <Typography variant="body1" paragraph>
                <strong>Email:</strong> {user?.email}
              </Typography>
              <Typography variant="body1">
                <strong>Status:</strong> {currentSubscription ? 'Active' : 'Basic (Free)'}
              </Typography>
              
              {currentSubscription && (
                <>
                  <Typography variant="body1">
                    <strong>Billing:</strong> Monthly
                  </Typography>
                  <Typography variant="body1">
                    <strong>Next Billing:</strong> {new Date().toLocaleDateString()}
                  </Typography>
                </>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>Current Features</Typography>
              <Box>
                {formatFeatures(currentFeatures).map(({ key, label, value, enabled }) => (
                  <Typography 
                    key={key} 
                    variant="body2" 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between',
                      py: 0.5,
                      color: enabled ? 'text.primary' : 'text.secondary'
                    }}
                  >
                    <span>{label}:</span>
                    <span><strong>{value}</strong></span>
                  </Typography>
                ))}
              </Box>
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => window.location.href = '/subscriptions/history'}
            >
              Payment History
            </Button>
            
            {currentSubscription && (
              <Button
                variant="outlined"
                startIcon={<SettingsIcon />}
                onClick={() => window.location.href = '/subscriptions/manage'}
              >
                Manage Subscription
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <Typography variant="h5" gutterBottom>
        Available Plans
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

      {/* Upgrade Confirmation Dialog */}
      <Dialog open={upgradeDialogOpen} onClose={() => setUpgradeDialogOpen(false)}>
        <DialogTitle>
          Confirm Subscription Upgrade
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" paragraph>
            You are about to upgrade to the <strong>{selectedPlan?.toUpperCase()}</strong> plan.
          </Typography>
          
          {selectedPlan && plans[selectedPlan] && (
            <Box>
              <Typography variant="body2" color="text.secondary" paragraph>
                <strong>Price:</strong> £{plans[selectedPlan].price}/month
              </Typography>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                You will be redirected to Stripe's secure checkout page to complete your payment.
              </Typography>
              
              <Typography variant="body2" color="text.secondary">
                Your new features will be activated immediately after successful payment.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpgradeDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmUpgrade}
            variant="contained"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <PaymentIcon />}
          >
            {actionLoading ? 'Creating...' : 'Continue to Payment'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Help Section */}
      <Alert severity="info" sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Need Help?
        </Typography>
        <Typography variant="body2">
          If you have any questions about billing or need to make changes to your subscription, 
          please contact our support team at support@smartaccounting.com or visit our help center.
        </Typography>
      </Alert>
    </Container>
  );
};

export default SubscriptionPage;
