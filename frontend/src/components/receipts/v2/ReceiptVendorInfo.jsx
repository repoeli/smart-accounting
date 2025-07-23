/**
 * ReceiptVendorInfo.jsx - v2 New Schema Component
 * 
 * Component for displaying and editing vendor information from the new flat schema.
 * Handles manual corrections and validation.
 */

import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  IconButton,
  Grid,
  Chip,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  Store,
  Edit,
  Save,
  Cancel,
  Business,
  LocationOn,
  Category
} from '@mui/icons-material';

const ReceiptVendorInfo = ({ 
  receipt, 
  onUpdate, 
  editable = true,
  showCategories = true 
}) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Extract vendor data from new schema
  const extractedData = receipt?.extracted_data || {};
  const [formData, setFormData] = useState({
    vendor: extractedData.vendor || '',
    type: extractedData.type || 'expense',
    currency: extractedData.currency || 'USD'
  });

  // Predefined vendor categories for suggestions
  const vendorCategories = [
    'Grocery Store',
    'Restaurant',
    'Gas Station',
    'Office Supplies',
    'Hardware Store',
    'Pharmacy',
    'Department Store',
    'Online Retailer',
    'Service Provider',
    'Other'
  ];

  // Currency options
  const currencies = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
  ];

  // Transaction types
  const transactionTypes = [
    { value: 'expense', label: 'Expense', color: 'error' },
    { value: 'income', label: 'Income', color: 'success' }
  ];

  const handleEdit = () => {
    setEditing(true);
    setError('');
  };

  const handleCancel = () => {
    setFormData({
      vendor: extractedData.vendor || '',
      type: extractedData.type || 'expense',
      currency: extractedData.currency || 'USD'
    });
    setEditing(false);
    setError('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Validate required fields
      if (!formData.vendor.trim()) {
        throw new Error('Vendor name is required');
      }

      // Call update function with new data
      await onUpdate(receipt.id, {
        vendor: formData.vendor.trim(),
        type: formData.type,
        currency: formData.currency
      });
      
      setEditing(false);
    } catch (err) {
      setError(err.message || 'Failed to update vendor information');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  // Get currency symbol
  const getCurrencySymbol = (code) => {
    const currency = currencies.find(c => c.code === code);
    return currency?.symbol || code;
  };

  // Get type color
  const getTypeColor = (type) => {
    const typeInfo = transactionTypes.find(t => t.value === type);
    return typeInfo?.color || 'default';
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
          <Store color="primary" />
          <Typography variant="h6" component="h3">
            Vendor Information
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
            {/* Vendor Name */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Vendor Name"
                value={formData.vendor}
                onChange={handleChange('vendor')}
                placeholder="Enter vendor/store name"
                required
                error={!formData.vendor.trim()}
                helperText={!formData.vendor.trim() ? 'Vendor name is required' : ''}
                InputProps={{
                  startAdornment: <Business sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Grid>

            {/* Transaction Type */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={formData.type}
                  label="Transaction Type"
                  onChange={handleChange('type')}
                >
                  {transactionTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={type.label} 
                          size="small" 
                          color={type.color} 
                          variant="outlined"
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Currency */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  label="Currency"
                  onChange={handleChange('currency')}
                >
                  {currencies.map((currency) => (
                    <MenuItem key={currency.code} value={currency.code}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ minWidth: 24 }}>
                          {currency.symbol}
                        </Typography>
                        <Typography variant="body2">
                          {currency.code} - {currency.name}
                        </Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

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
              disabled={loading || !formData.vendor.trim()}
              startIcon={<Save />}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </Box>
        </Box>
      ) : (
        /* Display Mode */
        <Grid container spacing={2}>
          {/* Vendor Name */}
          <Grid item xs={12}>
            <Box sx={{ 
              p: 2, 
              bgcolor: alpha(theme.palette.primary.main, 0.04), 
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
            }}>
              <Typography variant="h5" component="div" sx={{ fontWeight: 'medium', mb: 1 }}>
                {formData.vendor || 'Unknown Vendor'}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip 
                  label={`${formData.type.toUpperCase()}`}
                  color={getTypeColor(formData.type)}
                  size="small"
                />
                <Chip 
                  label={`${getCurrencySymbol(formData.currency)} ${formData.currency}`}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Box>
          </Grid>

          {/* Quick Stats */}
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
                Manual corrections applied: {receipt?.manual_corrections_count || 0}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Confidence: {receipt?.confidence_score ? `${(receipt.confidence_score * 100).toFixed(0)}%` : 'N/A'}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      )}
    </Paper>
  );
};

export default ReceiptVendorInfo;
