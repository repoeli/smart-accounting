/**
 * Subscription Plan Card Component
 * Displays individual subscription plan with features and pricing.
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  Check as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';

const SubscriptionPlanCard = ({
  plan,
  planId,
  currentPlan = 'basic',
  onSelectPlan,
  loading = false,
  disabled = false,
  showPopular = false
}) => {
  const isCurrentPlan = currentPlan === planId;
  const isPremiumPlan = planId === 'premium';
  const isPlatinumPlan = planId === 'platinum';

  const handleSelectPlan = () => {
    if (!disabled && !loading && !isCurrentPlan) {
      onSelectPlan(planId);
    }
  };

  const formatPrice = (price) => {
    if (price === 0) return 'Free';
    return `£${price.toFixed(2)}`;
  };

  const getButtonText = () => {
    if (isCurrentPlan) return 'Current Plan';
    if (loading) return 'Processing...';
    if (planId === 'basic') return 'Downgrade to Basic';
    return `Upgrade to ${plan.name}`;
  };

  const getButtonVariant = () => {
    if (isCurrentPlan) return 'outlined';
    if (isPlatinumPlan) return 'contained';
    return 'outlined';
  };

  const getButtonColor = () => {
    if (isCurrentPlan) return 'success';
    if (isPlatinumPlan) return 'primary';
    return 'primary';
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

  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        border: isCurrentPlan ? 2 : 1,
        borderColor: isCurrentPlan ? 'success.main' : 'divider',
        transform: showPopular && isPremiumPlan ? 'scale(1.05)' : 'none',
        transition: 'transform 0.2s, box-shadow 0.2s',
        '&:hover': {
          transform: showPopular && isPremiumPlan ? 'scale(1.05)' : 'translateY(-4px)',
          boxShadow: 3
        }
      }}
    >
      {/* Popular badge */}
      {showPopular && isPremiumPlan && (
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1
          }}
        >
          <Chip
            icon={<StarIcon />}
            label="Most Popular"
            color="primary"
            size="small"
            sx={{ fontWeight: 'bold' }}
          />
        </Box>
      )}

      {/* Current plan badge */}
      {isCurrentPlan && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            zIndex: 1
          }}
        >
          <Chip
            icon={<CheckIcon />}
            label="Current"
            color="success"
            size="small"
            variant="outlined"
          />
        </Box>
      )}

      <CardContent sx={{ flexGrow: 1, pt: showPopular && isPremiumPlan ? 3 : 2 }}>
        {/* Plan header */}
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" component="h3" gutterBottom>
            {plan.name}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mb: 1 }}>
            <Typography variant="h3" component="div" color="primary">
              {formatPrice(plan.price)}
            </Typography>
            {plan.price > 0 && (
              <Typography variant="subtitle1" color="text.secondary" sx={{ ml: 1 }}>
                /{plan.interval}
              </Typography>
            )}
          </Box>
          
          {plan.price === 0 && (
            <Typography variant="body2" color="text.secondary">
              Perfect for getting started
            </Typography>
          )}
          {isPremiumPlan && (
            <Typography variant="body2" color="text.secondary">
              Great for growing businesses
            </Typography>
          )}
          {isPlatinumPlan && (
            <Typography variant="body2" color="text.secondary">
              Complete business solution
            </Typography>
          )}
        </Box>

        {/* Features list */}
        <Typography variant="h6" gutterBottom>
          Features
        </Typography>
        <List dense>
          {Object.entries(plan.features).map(([key, value]) => 
            renderFeature(key, value, getFeatureLabel(key, value))
          )}
        </List>

        {/* Additional features for higher tiers */}
        {isPremiumPlan && (
          <List dense>
            {renderFeature('advanced_reports', true, 'Advanced Reports')}
            {renderFeature('priority_support', true, 'Priority Support')}
          </List>
        )}
        
        {isPlatinumPlan && (
          <List dense>
            {renderFeature('custom_integrations', true, 'Custom Integrations')}
            {renderFeature('dedicated_support', true, 'Dedicated Account Manager')}
            {renderFeature('sla_guarantee', true, '99.9% SLA Guarantee')}
          </List>
        )}
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          fullWidth
          variant={getButtonVariant()}
          color={getButtonColor()}
          size="large"
          onClick={handleSelectPlan}
          disabled={disabled || loading || isCurrentPlan}
          startIcon={loading ? <CircularProgress size={16} /> : null}
          sx={{
            py: 1.5,
            fontWeight: 'bold',
            textTransform: 'none'
          }}
        >
          {getButtonText()}
        </Button>
      </CardActions>
    </Card>
  );
};

export default SubscriptionPlanCard;
