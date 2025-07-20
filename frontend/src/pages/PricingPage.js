import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
  Alert,
  Paper
} from '@mui/material';
import {
  Check as CheckIcon,
  Star as StarIcon,
  Business as BusinessIcon,
  Person as PersonIcon,
  Diamond as DiamondIcon
} from '@mui/icons-material';
import subscriptionAPI from '../../services/subscriptionAPI';

const PlanIcon = ({ planId }) => {
  const iconProps = { sx: { fontSize: 40, mb: 2 } };
  
  switch (planId) {
    case 'basic':
      return <PersonIcon color="primary" {...iconProps} />;
    case 'premium':
      return <BusinessIcon color="secondary" {...iconProps} />;
    case 'platinum':
      return <DiamondIcon color="warning" {...iconProps} />;
    default:
      return <PersonIcon color="primary" {...iconProps} />;
  }
};

const PricingCard = ({ plan, onSelectPlan, loading, currentPlan }) => {
  const isCurrentPlan = currentPlan === plan.plan_id;
  const isPremium = plan.recommended;

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: isPremium ? '2px solid' : '1px solid',
        borderColor: isPremium ? 'secondary.main' : 'divider',
        transform: isPremium ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: isPremium ? 'scale(1.07)' : 'scale(1.02)',
          boxShadow: 4
        }
      }}
    >
      {isPremium && (
        <Chip
          icon={<StarIcon />}
          label="Most Popular"
          color="secondary"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1
          }}
        />
      )}
      
      <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3 }}>
        <PlanIcon planId={plan.plan_id} />
        
        <Typography variant="h4" component="h2" gutterBottom fontWeight="bold">
          {plan.name}
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography variant="h3" component="span" fontWeight="bold">
            £{plan.price}
          </Typography>
          <Typography variant="h6" component="span" color="text.secondary">
            /{plan.interval}
          </Typography>
        </Box>

        <List dense sx={{ mb: 2 }}>
          {plan.features.map((feature, index) => (
            <ListItem key={index} sx={{ py: 0.5 }}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                <CheckIcon color="success" fontSize="small" />
              </ListItemIcon>
              <ListItemText 
                primary={feature} 
                primaryTypographyProps={{ variant: 'body2' }}
              />
            </ListItem>
          ))}
        </List>
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant={isPremium ? "contained" : "outlined"}
          color={isPremium ? "secondary" : "primary"}
          fullWidth
          size="large"
          onClick={() => onSelectPlan(plan)}
          disabled={loading || isCurrentPlan}
          sx={{ py: 1.5 }}
        >
          {loading ? (
            <CircularProgress size={24} />
          ) : isCurrentPlan ? (
            'Current Plan'
          ) : (
            `Choose ${plan.name}`
          )}
        </Button>
      </CardActions>
    </Card>
  );
};

const PricingPage = () => {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [currentSubscription, setCurrentSubscription] = useState(null);

  useEffect(() => {
    loadPlansAndSubscription();
  }, []);

  const loadPlansAndSubscription = async () => {
    setLoading(true);
    setError(null);

    try {
      // Load plans
      const plansResult = await subscriptionAPI.getPlans();
      if (!plansResult.success) {
        throw new Error(plansResult.error.message || 'Failed to load plans');
      }

      // Load current subscription
      const subscriptionResult = await subscriptionAPI.getCurrentSubscription();
      if (subscriptionResult.success) {
        setCurrentSubscription(subscriptionResult.data);
      }

      setPlans(plansResult.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPlan = async (plan) => {
    setCheckoutLoading(true);
    setError(null);

    try {
      const currentUrl = window.location.origin;
      const successUrl = `${currentUrl}/subscription/success`;
      const cancelUrl = `${currentUrl}/pricing`;

      const result = await subscriptionAPI.createCheckoutSession(
        plan.plan_id,
        successUrl,
        cancelUrl
      );

      if (!result.success) {
        throw new Error(result.error.message || 'Failed to create checkout session');
      }

      // Redirect to Stripe checkout
      window.location.href = result.data.checkout_url;
    } catch (err) {
      setError(err.message);
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 8 }}>
      {/* Header */}
      <Box textAlign="center" mb={6}>
        <Typography variant="h2" component="h1" gutterBottom fontWeight="bold">
          Choose Your Plan
        </Typography>
        <Typography variant="h5" color="text.secondary" sx={{ mb: 2 }}>
          Select the perfect plan for your accounting needs
        </Typography>
        {currentSubscription && (
          <Paper sx={{ p: 2, mb: 3, backgroundColor: 'success.light', color: 'success.contrastText' }}>
            <Typography variant="body1">
              Current Plan: <strong>{currentSubscription.plan_display}</strong>
              {currentSubscription.status === 'active' && (
                <> • {currentSubscription.days_remaining} days remaining</>
              )}
            </Typography>
          </Paper>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          {error}
        </Alert>
      )}

      {/* Pricing Cards */}
      <Grid container spacing={4} justifyContent="center">
        {plans.map((plan) => (
          <Grid item xs={12} sm={6} md={4} key={plan.plan_id}>
            <PricingCard
              plan={plan}
              onSelectPlan={handleSelectPlan}
              loading={checkoutLoading}
              currentPlan={currentSubscription?.plan}
            />
          </Grid>
        ))}
      </Grid>

      {/* Features Comparison */}
      <Box mt={8}>
        <Typography variant="h4" component="h2" textAlign="center" gutterBottom>
          Feature Comparison
        </Typography>
        <Paper sx={{ overflow: 'hidden', mt: 4 }}>
          <Box sx={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={{ padding: '16px', textAlign: 'left', borderBottom: '1px solid #ddd' }}>
                    Features
                  </th>
                  {plans.map((plan) => (
                    <th key={plan.plan_id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #ddd' }}>
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ padding: '16px', borderBottom: '1px solid #eee' }}>Monthly Receipts</td>
                  {plans.map((plan) => (
                    <td key={plan.plan_id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                      {plan.max_documents === 9999999 ? 'Unlimited' : plan.max_documents}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: '16px', borderBottom: '1px solid #eee' }}>API Access</td>
                  {plans.map((plan) => (
                    <td key={plan.plan_id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                      {plan.has_api_access ? <CheckIcon color="success" /> : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: '16px', borderBottom: '1px solid #eee' }}>Report Export</td>
                  {plans.map((plan) => (
                    <td key={plan.plan_id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                      {plan.has_report_export ? <CheckIcon color="success" /> : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: '16px', borderBottom: '1px solid #eee' }}>Bulk Upload</td>
                  {plans.map((plan) => (
                    <td key={plan.plan_id} style={{ padding: '16px', textAlign: 'center', borderBottom: '1px solid #eee' }}>
                      {plan.has_bulk_upload ? <CheckIcon color="success" /> : '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{ padding: '16px' }}>White Label</td>
                  {plans.map((plan) => (
                    <td key={plan.plan_id} style={{ padding: '16px', textAlign: 'center' }}>
                      {plan.has_white_label ? <CheckIcon color="success" /> : '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default PricingPage;