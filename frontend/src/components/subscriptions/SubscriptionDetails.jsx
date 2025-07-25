/**
 * Subscription Details Component
 * Displays current subscription information and management options.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Settings as SettingsIcon,
  Receipt as ReceiptIcon,
  Upgrade as UpgradeIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import subscriptionAPI from '../../services/subscriptions/subscriptionAPI';
import useReportAccess from '../../hooks/reports/useReportAccess';

const SubscriptionDetails = () => {
  const navigate = useNavigate();
  const { 
    subscriptionData, 
    userPlan, 
    loading: accessLoading, 
    error: accessError,
    refreshSubscription 
  } = useReportAccess();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [processingCancel, setProcessingCancel] = useState(false);

  const subscription = subscriptionData?.subscription;
  const features = subscriptionData?.features || {};

  const handleManageSubscription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await subscriptionAPI.getCustomerPortalUrl(
        `${window.location.origin}/subscriptions`
      );
      
      if (response.portal_url) {
        window.location.href = response.portal_url;
      } else {
        throw new Error('Failed to get customer portal URL');
      }
      
    } catch (err) {
      console.error('Error getting customer portal:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/subscriptions/checkout');
  };

  const handleCancelSubscription = async () => {
    try {
      setProcessingCancel(true);
      setError(null);
      
      const response = await subscriptionAPI.cancelSubscription(false); // Cancel at period end
      
      if (response.success) {
        setSuccess('Subscription cancelled successfully. You will continue to have access until the end of your billing period.');
        setCancelDialogOpen(false);
        // Refresh subscription data
        setTimeout(() => {
          refreshSubscription();
        }, 1000);
      } else {
        throw new Error('Failed to cancel subscription');
      }
      
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError(err.message);
    } finally {
      setProcessingCancel(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'success';
      case 'trialing':
        return 'info';
      case 'past_due':
        return 'warning';
      case 'canceled':
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  const renderFeature = (featureKey, featureValue, featureLabel) => {
    const isEnabled = typeof featureValue === 'boolean' ? featureValue : featureValue > 0;
    
    return (
      <ListItem key={featureKey} dense>
        <ListItemIcon sx={{ minWidth: 32 }}>
          {isEnabled ? (
            <CheckIcon color="success" fontSize="small" />
          ) : (
            <CloseIcon color="disabled" fontSize="small" />
          )}
        </ListItemIcon>
        <ListItemText 
          primary={featureLabel}
          primaryTypographyProps={{
            variant: 'body2',
            color: isEnabled ? 'text.primary' : 'text.disabled'
          }}
        />
      </ListItem>
    );
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

  if (accessLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Error Alert */}
      {(error || accessError) && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error || accessError}
        </Alert>
      )}

      {/* Success Alert */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <Grid container spacing={4}>
        {/* Current Subscription */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5" component="h2">
                  Current Subscription
                </Typography>
                {subscription?.status && (
                  <Chip 
                    label={subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                    color={getStatusColor(subscription.status)}
                    variant="outlined"
                  />
                )}
              </Box>

              {subscription || userPlan !== 'basic' ? (
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" gutterBottom>
                      Plan Details
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Plan:</strong> {userPlan?.charAt(0).toUpperCase() + userPlan?.slice(1)}
                    </Typography>
                    <Typography variant="body1" gutterBottom>
                      <strong>Status:</strong> {subscription?.status || 'Active'}
                    </Typography>
                    {subscription?.amount && (
                      <Typography variant="body1" gutterBottom>
                        <strong>Amount:</strong> £{subscription.amount} {subscription.currency}
                      </Typography>
                    )}
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <Typography variant="h6" gutterBottom>
                      Billing Information
                    </Typography>
                    {subscription?.current_period_start && (
                      <Typography variant="body1" gutterBottom>
                        <strong>Current Period:</strong><br />
                        {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                      </Typography>
                    )}
                    {subscription?.cancel_at_period_end && (
                      <Alert severity="warning" sx={{ mt: 2 }}>
                        Your subscription is set to cancel at the end of the current period.
                      </Alert>
                    )}
                  </Grid>
                </Grid>
              ) : (
                <Box textAlign="center" py={4}>
                  <Typography variant="body1" color="text.secondary" gutterBottom>
                    You're currently on the Basic (Free) plan
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upgrade to access more features and increased limits
                  </Typography>
                </Box>
              )}
            </CardContent>

            <CardActions sx={{ p: 2, gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<UpgradeIcon />}
                onClick={handleUpgrade}
              >
                {userPlan === 'basic' ? 'Upgrade Plan' : 'Change Plan'}
              </Button>
              
              {subscription?.stripe_subscription_id && (
                <Button
                  variant="outlined"
                  startIcon={<SettingsIcon />}
                  onClick={handleManageSubscription}
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Manage Billing'}
                </Button>
              )}
              
              {subscription && subscription.status === 'active' && !subscription.cancel_at_period_end && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => setCancelDialogOpen(true)}
                >
                  Cancel Subscription
                </Button>
              )}
            </CardActions>
          </Card>
        </Grid>

        {/* Features */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h3" gutterBottom>
                Your Plan Features
              </Typography>
              
              <List dense>
                {Object.entries(features).map(([key, value]) => {
                  if (key === 'current_plan' || key === 'subscription_active' || key === 'subscription_id') {
                    return null;
                  }
                  return renderFeature(key, value, getFeatureLabel(key, value));
                })}
              </List>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="body2" color="text.secondary" align="center">
                Need more features?
              </Typography>
              <Button
                fullWidth
                variant="outlined"
                size="small"
                onClick={handleUpgrade}
                sx={{ mt: 1 }}
              >
                View All Plans
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancel Subscription</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel your subscription? You will continue to have access 
            to all features until the end of your current billing period ({formatDate(subscription?.current_period_end)}).
            <br /><br />
            After that, your account will be downgraded to the Basic (Free) plan.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCancelDialogOpen(false)}
            disabled={processingCancel}
          >
            Keep Subscription
          </Button>
          <Button 
            onClick={handleCancelSubscription}
            color="error"
            variant="contained"
            disabled={processingCancel}
            startIcon={processingCancel ? <CircularProgress size={16} /> : null}
          >
            {processingCancel ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionDetails;
