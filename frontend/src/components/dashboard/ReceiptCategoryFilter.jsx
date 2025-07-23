/**
 * Receipt Category Filter Component
 * Provides filtering and search capabilities for the categorized receipts widget
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  IconButton,
  Collapse,
  Typography,
  Grid,
  useTheme
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Clear as ClearIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  CalendarToday as DateIcon
} from '@mui/icons-material';

const ReceiptCategoryFilter = ({
  filters,
  onFiltersChange,
  onClearFilters,
  summary,
  compact = false,
  showSummary = true
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(!compact);
  const [localFilters, setLocalFilters] = useState(filters);

  // Apply filters
  const handleApplyFilters = () => {
    onFiltersChange(localFilters);
  };

  // Update local filter
  const updateLocalFilter = (key, value) => {
    setLocalFilters(prev => ({ ...prev, [key]: value }));
  };

  // Clear all filters
  const handleClearAll = () => {
    const clearedFilters = {
      search: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      businessType: '',
      receiptType: ''
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
    if (onClearFilters) onClearFilters();
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    return Object.values(filters).filter(value => value && value.toString().trim()).length;
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '£0.00';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  };

  // Predefined categories
  const categories = [
    'Food & Dining',
    'Transportation',
    'Office Supplies',
    'Marketing',
    'Utilities',
    'Professional Services',
    'Equipment',
    'Travel',
    'Entertainment',
    'Other'
  ];

  return (
    <Box sx={{ mb: 2 }}>
      {/* Summary Cards */}
      {showSummary && (
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                p: 1.5,
                backgroundColor: 'success.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'success.200'
              }}
            >
              <Typography variant="caption" color="success.700" sx={{ fontWeight: 600 }}>
                Income
              </Typography>
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                {formatCurrency(summary.incomeTotal)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                p: 1.5,
                backgroundColor: 'error.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'error.200'
              }}
            >
              <Typography variant="caption" color="error.700" sx={{ fontWeight: 600 }}>
                Expenses
              </Typography>
              <Typography variant="h6" color="error.main" sx={{ fontWeight: 700 }}>
                {formatCurrency(summary.expenseTotal)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                p: 1.5,
                backgroundColor: 'primary.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'primary.200'
              }}
            >
              <Typography variant="caption" color="primary.700" sx={{ fontWeight: 600 }}>
                Net Amount
              </Typography>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 700 }}>
                {formatCurrency(summary.incomeTotal - summary.expenseTotal)}
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={6} sm={3}>
            <Box
              sx={{
                p: 1.5,
                backgroundColor: 'grey.50',
                borderRadius: 1,
                border: '1px solid',
                borderColor: 'grey.200'
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                Total Receipts
              </Typography>
              <Typography variant="h6" color="text.primary" sx={{ fontWeight: 700 }}>
                {summary.count}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      )}

      {/* Filter Header */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        mb: 1
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterIcon color="action" fontSize="small" />
          <Typography variant="subtitle2" color="text.secondary">
            Filters
          </Typography>
          {getActiveFilterCount() > 0 && (
            <Chip 
              label={getActiveFilterCount()} 
              size="small" 
              color="primary" 
              sx={{ height: 20, fontSize: '0.7rem' }}
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {getActiveFilterCount() > 0 && (
            <Button
              size="small"
              startIcon={<ClearIcon />}
              onClick={handleClearAll}
              sx={{ fontSize: '0.75rem' }}
            >
              Clear
            </Button>
          )}
          
          {compact && (
            <IconButton
              size="small"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse filters" : "Expand filters"}
            >
              {expanded ? <CollapseIcon /> : <ExpandIcon />}
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Filter Controls */}
      <Collapse in={expanded}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 2,
          p: 2,
          backgroundColor: 'grey.50',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'grey.200'
        }}>
          {/* Search */}
          <TextField
            placeholder="Search receipts..."
            value={localFilters.search || ''}
            onChange={(e) => updateLocalFilter('search', e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
            }}
          />

          {/* Filter Row 1 */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={localFilters.category || ''}
                  onChange={(e) => updateLocalFilter('category', e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Type</InputLabel>
                <Select
                  value={localFilters.receiptType || ''}
                  onChange={(e) => updateLocalFilter('receiptType', e.target.value)}
                  label="Type"
                >
                  <MenuItem value="">All Types</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                  <MenuItem value="expense">Expense</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel>Business Type</InputLabel>
                <Select
                  value={localFilters.businessType || ''}
                  onChange={(e) => updateLocalFilter('businessType', e.target.value)}
                  label="Business Type"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="business">Business</MenuItem>
                  <MenuItem value="personal">Personal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
                fullWidth
                sx={{ height: '40px' }}
              >
                Apply Filters
              </Button>
            </Grid>
          </Grid>

          {/* Date Range */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="From Date"
                type="date"
                value={localFilters.dateFrom || ''}
                onChange={(e) => updateLocalFilter('dateFrom', e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <DateIcon sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="To Date"
                type="date"
                value={localFilters.dateTo || ''}
                onChange={(e) => updateLocalFilter('dateTo', e.target.value)}
                size="small"
                fullWidth
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  startAdornment: <DateIcon sx={{ color: 'action.active', mr: 1 }} />
                }}
              />
            </Grid>
          </Grid>
        </Box>
      </Collapse>
    </Box>
  );
};

export default ReceiptCategoryFilter;
