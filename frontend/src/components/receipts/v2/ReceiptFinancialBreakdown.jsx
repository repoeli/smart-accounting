/**
 * ReceiptFinancialBreakdown.jsx - v2 New Schema Component
 * 
 * Component for displaying and editing financial information from the new flat schema.
 * Handles amount corrections, tax calculations, and currency conversion.
 */

import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Grid,
  Chip,
  Alert,
  Divider,
  InputAdornment,
  FormControl,
  InputLabel,
  OutlinedInput,
  useTheme,
  alpha
} from '@mui/material';
import {
  AttachMoney,
  Edit,
  Save,
  Cancel,
  Calculate,
  Receipt,
  AccountBalance
} from '@mui/icons-material';

const ReceiptFinancialBreakdown = ({ 
  receipt, 
  onUpdate, 
  editable = true,
  showCalculations = true 
}) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Extract financial data from new schema
  const extractedData = receipt?.extracted_data || {};
  const [formData, setFormData] = useState({
    total: extractedData.total || 0,
    tax: extractedData.tax || 0,
    currency: extractedData.currency || 'USD'
  });

  // Derived calculations
  const [calculations, setCalculations] = useState({
    subtotal: 0,
    taxRate: 0,
    netAmount: 0
  });

  // Update calculations when form data changes
  useEffect(() => {
    const total = parseFloat(formData.total) || 0;
    const tax = parseFloat(formData.tax) || 0;
    const subtotal = total - tax;
    const taxRate = subtotal > 0 ? (tax / subtotal) * 100 : 0;
    const netAmount = total;

    setCalculations({
      subtotal: subtotal,
      taxRate: taxRate,
      netAmount: netAmount
    });
  }, [formData.total, formData.tax]);

  // Get currency symbol
  const getCurrencySymbol = (currency) => {
    const symbols = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$'
    };
    return symbols[currency] || currency;
  };

  const handleEdit = () => {
    setEditing(true);
    setError('');
  };

  const handleCancel = () => {
    setFormData({
      total: extractedData.total || 0,
      tax: extractedData.tax || 0,
      currency: extractedData.currency || 'USD'
    });
    setEditing(false);
    setError('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validate amounts
      const total = parseFloat(formData.total);
      const tax = parseFloat(formData.tax);
      
      if (isNaN(total) || total < 0) {
        throw new Error('Total amount must be a valid positive number');
      }
      
      if (isNaN(tax) || tax < 0) {
        throw new Error('Tax amount must be a valid positive number');
      }
      
      if (tax > total) {
        throw new Error('Tax amount cannot be greater than total amount');
      }

      // Call update function with new data
      await onUpdate(receipt.id, {
        total: total,
        tax: tax,
        currency: formData.currency
      });
      
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update financial information');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    
    // For numeric fields, allow empty string or valid numbers
    if (field === 'total' || field === 'tax') {
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        setFormData(prev => ({
          ...prev,
          [field]: value
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Format currency for display
  const formatCurrency = (amount, currency = formData.currency) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (rate) => {
    return `${rate.toFixed(2)}%`;
  };

  return (
    <Paper 
      elevation={1} 
      sx={{ 
        p: 2, 
        mb: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AttachMoney color="primary" />
          <Typography variant="h6" component="h3">
            Financial Breakdown
          </Typography>
        </Box>
        
        {editable && !editing && (
          <IconButton onClick={handleEdit} size="small">
            <Edit />
          </IconButton>
        )}
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {editing ? (
        /* Edit Mode */
        <Box component="form" noValidate>
          <Grid container spacing={2}>
            {/* Total Amount */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel htmlFor="total-amount">Total Amount</InputLabel>
                <OutlinedInput
                  id="total-amount"
                  label="Total Amount"
                  value={formData.total}
                  onChange={handleChange('total')}
                  startAdornment={
                    <InputAdornment position="start">
                      {getCurrencySymbol(formData.currency)}
                    </InputAdornment>
                  }
                  type="text"
                  inputProps={{
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.]?[0-9]*'
                  }}
                />
              </FormControl>
            </Grid>

            {/* Tax Amount */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel htmlFor="tax-amount">Tax Amount</InputLabel>
                <OutlinedInput
                  id="tax-amount"
                  label="Tax Amount"
                  value={formData.tax}
                  onChange={handleChange('tax')}
                  startAdornment={
                    <InputAdornment position="start">
                      {getCurrencySymbol(formData.currency)}
                    </InputAdornment>
                  }
                  type="text"
                  inputProps={{
                    inputMode: 'decimal',
                    pattern: '[0-9]*[.]?[0-9]*'
                  }}
                />
              </FormControl>
            </Grid>
          </Grid>

          {/* Live Calculations Preview */}
          {showCalculations && (
            <Box sx={{ mt: 2, p: 2, bgcolor: alpha(theme.palette.info.main, 0.04), borderRadius: 1 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Calculate /> Live Calculations
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(calculations.subtotal)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Subtotal
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" fontWeight="medium">
                      {formatPercentage(calculations.taxRate)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Tax Rate
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" fontWeight="medium">
                      {formatCurrency(calculations.netAmount)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Net Amount
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1, mt: 2, justifyContent: 'flex-end' }}>
            <Button
              onClick={handleCancel}
              disabled={loading}
              startIcon={<Cancel />}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={loading}
              startIcon={<Save />}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      ) : (
        /* Display Mode */
        <Grid container spacing={2}>
          {/* Main Financial Display */}
          <Grid item xs={12}>
            <Box sx={{ 
              p: 3, 
              bgcolor: alpha(theme.palette.success.main, 0.04), 
              borderRadius: 2,
              border: `2px solid ${alpha(theme.palette.success.main, 0.12)}`,
              textAlign: 'center',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Typography variant="h3" component="div" sx={{ 
                fontWeight: 'bold', 
                color: theme.palette.success.main,
                mb: 1
              }}>
                {formatCurrency(formData.total)}
              </Typography>
              <Typography variant="h6" color="textSecondary">
                Total Amount
              </Typography>
            </Box>
          </Grid>

          {/* Breakdown Details */}
          <Grid item xs={12}>
            <Divider sx={{ my: 1 }} />
            <Grid container spacing={2}>
              {/* Subtotal */}
              <Grid item xs={12} sm={4}>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 2,
                  height: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Receipt color="action" sx={{ mb: 1 }} />
                  <Typography variant="h6" fontWeight="medium" sx={{ mb: 0.5 }}>
                    {formatCurrency(calculations.subtotal)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Subtotal
                  </Typography>
                </Box>
              </Grid>
              
              {/* Tax */}
              <Grid item xs={12} sm={4}>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 2,
                  height: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <AccountBalance color="action" sx={{ mb: 1 }} />
                  <Typography variant="h6" fontWeight="medium" sx={{ mb: 0.5 }}>
                    {formatCurrency(formData.tax)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Tax ({formatPercentage(calculations.taxRate)})
                  </Typography>
                </Box>
              </Grid>
              
              {/* Currency */}
              <Grid item xs={12} sm={4}>
                <Box sx={{ 
                  textAlign: 'center', 
                  p: 2,
                  height: '100px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6" fontWeight="medium" sx={{ mb: 0.5, fontSize: '1.5rem' }}>
                    {getCurrencySymbol(formData.currency)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Currency ({formData.currency})
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Grid>

          {/* Additional Info */}
          <Grid item xs={12}>
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              p: 1,
              bgcolor: alpha(theme.palette.grey[500], 0.04),
              borderRadius: 1
            }}>
              <Typography variant="caption" color="textSecondary">
                Extraction confidence: {receipt?.confidence_score ? `${(receipt.confidence_score * 100).toFixed(0)}%` : 'N/A'}
              </Typography>
              <Chip 
                label={`${extractedData.type || 'expense'}`.toUpperCase()}
                size="small"
                color={extractedData.type === 'expense' ? 'error' : 'success'}
                variant="outlined"
              />
            </Box>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default ReceiptFinancialBreakdown;
