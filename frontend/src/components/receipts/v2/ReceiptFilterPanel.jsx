/**
 * ReceiptFilterPanel.jsx - New Schema Filter Panel
 * 
 * Filter panel for receipts using the new flat schema.
 * Provides date range, vendor, amount, and type filters.
 */

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Chip,
  Divider,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  DateRange as DateIcon,
  Store as VendorIcon,
  AttachMoney as AmountIcon,
  Category as TypeIcon
} from '@mui/icons-material';

const ReceiptFilterPanel = ({ filters, onFiltersChange, loading = false }) => {
  const theme = useTheme();

  // Handle filter changes
  const handleFilterChange = (field, value) => {
    onFiltersChange({
      ...filters,
      [field]: value
    });
  };

  // Clear all filters
  const clearAllFilters = () => {
    onFiltersChange({
      dateFrom: null,
      dateTo: null,
      vendor: '',
      type: '',
      minAmount: null,
      maxAmount: null
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.dateFrom || filters.dateTo || filters.vendor || 
           filters.type || filters.minAmount || filters.maxAmount;
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.vendor) count++;
    if (filters.type) count++;
    if (filters.minAmount || filters.maxAmount) count++;
    return count;
  };

  return (
    <Card>
      <CardContent>
          {/* Header */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <FilterIcon color="primary" />
              <Typography variant="h6">
                Filters
              </Typography>
              {hasActiveFilters() && (
                <Chip 
                  label={getActiveFilterCount()} 
                  size="small" 
                  color="primary" 
                />
              )}
            </Box>
            
            {hasActiveFilters() && (
              <Tooltip title="Clear all filters">
                <IconButton onClick={clearAllFilters} size="small">
                  <ClearIcon />
                </IconButton>
              </Tooltip>
            )}
          </Box>

          {/* Date Range Filter */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <DateIcon color="action" />
              <Typography variant="subtitle2">Date Range</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="From Date"
                  type="date"
                  value={filters.dateFrom ? filters.dateFrom.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value ? new Date(e.target.value) : null)}
                  size="small"
                  fullWidth
                  disabled={loading}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  label="To Date"
                  type="date"
                  value={filters.dateTo ? filters.dateTo.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value ? new Date(e.target.value) : null)}
                  size="small"
                  fullWidth
                  disabled={loading}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Vendor Filter */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <VendorIcon color="action" />
              <Typography variant="subtitle2">Vendor</Typography>
            </Box>
            
            <TextField
              fullWidth
              size="small"
              placeholder="Search by vendor name..."
              value={filters.vendor}
              onChange={(e) => handleFilterChange('vendor', e.target.value)}
              disabled={loading}
            />
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Transaction Type Filter */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <TypeIcon color="action" />
              <Typography variant="subtitle2">Transaction Type</Typography>
            </Box>
            
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={filters.type}
                label="Type"
                onChange={(e) => handleFilterChange('type', e.target.value)}
                disabled={loading}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="expense">Expense</MenuItem>
                <MenuItem value="income">Income</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {/* Amount Range Filter */}
          <Box mb={3}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <AmountIcon color="action" />
              <Typography variant="subtitle2">Amount Range</Typography>
            </Box>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Min Amount"
                  type="number"
                  value={filters.minAmount || ''}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={loading}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  size="small"
                  label="Max Amount"
                  type="number"
                  value={filters.maxAmount || ''}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value ? parseFloat(e.target.value) : null)}
                  disabled={loading}
                  inputProps={{ min: 0, step: 0.01 }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Active Filters Summary */}
          {hasActiveFilters() && (
            <>
              <Divider sx={{ mb: 2 }} />
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Active Filters:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {(filters.dateFrom || filters.dateTo) && (
                    <Chip
                      size="small"
                      label={`Date: ${filters.dateFrom ? filters.dateFrom.toLocaleDateString() : 'Any'} - ${filters.dateTo ? filters.dateTo.toLocaleDateString() : 'Any'}`}
                      onDelete={() => {
                        handleFilterChange('dateFrom', null);
                        handleFilterChange('dateTo', null);
                      }}
                      variant="outlined"
                    />
                  )}
                  
                  {filters.vendor && (
                    <Chip
                      size="small"
                      label={`Vendor: ${filters.vendor}`}
                      onDelete={() => handleFilterChange('vendor', '')}
                      variant="outlined"
                    />
                  )}
                  
                  {filters.type && (
                    <Chip
                      size="small"
                      label={`Type: ${filters.type}`}
                      onDelete={() => handleFilterChange('type', '')}
                      variant="outlined"
                    />
                  )}
                  
                  {(filters.minAmount || filters.maxAmount) && (
                    <Chip
                      size="small"
                      label={`Amount: ${filters.minAmount || 0} - ${filters.maxAmount || '∞'}`}
                      onDelete={() => {
                        handleFilterChange('minAmount', null);
                        handleFilterChange('maxAmount', null);
                      }}
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </>
          )}

          {/* Quick Filter Buttons */}
          <Box mt={3}>
            <Typography variant="subtitle2" gutterBottom>
              Quick Filters:
            </Typography>
            <Box display="flex" flexDirection="column" gap={1}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleFilterChange('type', 'expense')}
                disabled={loading}
                fullWidth
              >
                Expenses Only
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => handleFilterChange('type', 'income')}
                disabled={loading}
                fullWidth
              >
                Income Only
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const today = new Date();
                  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
                  handleFilterChange('dateFrom', lastMonth);
                  handleFilterChange('dateTo', today);
                }}
                disabled={loading}
                fullWidth
              >
                Last 30 Days
              </Button>
              <Button
                size="small"
                variant="outlined"
                onClick={() => {
                  const today = new Date();
                  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                  handleFilterChange('dateFrom', startOfMonth);
                  handleFilterChange('dateTo', today);
                }}
                disabled={loading}
                fullWidth
              >
                This Month
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  };

export default ReceiptFilterPanel;
