import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Button,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography
} from '@mui/material';
import { ExpandMore, FilterList, Clear } from '@mui/icons-material';

// Default filter values constant to avoid duplication
const DEFAULT_FILTERS = {
  start_date: '',
  end_date: '',
  transaction_type: 'expense',
  is_business: null,
  currency: '',
  limit: 20,
  tax_year: new Date().getFullYear(),
  min_transactions: 1,
  status: '',
  include_metadata: false
};

const ReportFilters = ({ 
  onFiltersChange, 
  reportType,
  initialFilters = {},
  compact = false 
}) => {
  const [filters, setFilters] = useState({
    ...DEFAULT_FILTERS,
    ...initialFilters
  });

  const [expanded, setExpanded] = useState(!compact);

  const handleFilterChange = (field, value) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = { ...DEFAULT_FILTERS };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const setQuickDateRange = (range) => {
    const end = new Date();
    const start = new Date();
    
    switch (range) {
      case 'last7days':
        start.setDate(end.getDate() - 7);
        break;
      case 'last30days':
        start.setDate(end.getDate() - 30);
        break;
      case 'last3months':
        start.setMonth(end.getMonth() - 3);
        break;
      case 'last6months':
        start.setMonth(end.getMonth() - 6);
        break;
      case 'thisYear':
        start.setMonth(0, 1);
        break;
      case 'lastYear':
        start.setFullYear(end.getFullYear() - 1, 0, 1);
        end.setFullYear(end.getFullYear() - 1, 11, 31);
        break;
      default:
        return;
    }
    
    // Batch the date updates to avoid multiple onFiltersChange callbacks
    const newFilters = {
      ...filters,
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0]
    };
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    
    // Check each filter against its default value
    if (filters.start_date !== DEFAULT_FILTERS.start_date) count++;
    if (filters.end_date !== DEFAULT_FILTERS.end_date) count++;
    if (filters.transaction_type !== DEFAULT_FILTERS.transaction_type) count++;
    if (filters.is_business !== DEFAULT_FILTERS.is_business) count++;
    if (filters.currency !== DEFAULT_FILTERS.currency) count++;
    if (filters.limit !== DEFAULT_FILTERS.limit) count++;
    if (filters.tax_year !== DEFAULT_FILTERS.tax_year) count++;
    if (filters.min_transactions !== DEFAULT_FILTERS.min_transactions) count++;
    if (filters.status !== DEFAULT_FILTERS.status) count++;
    if (filters.include_metadata !== DEFAULT_FILTERS.include_metadata) count++;
    
    return count;
  };

  const renderCommonFilters = () => (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={6}>
        <TextField
          label="Start Date"
          type="date"
          value={filters.start_date}
          onChange={(e) => handleFilterChange('start_date', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
        />
      </Grid>
      
      <Grid item xs={12} sm={6}>
        <TextField
          label="End Date"
          type="date"
          value={filters.end_date}
          onChange={(e) => handleFilterChange('end_date', e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          size="small"
        />
      </Grid>

      <Grid item xs={12}>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label="Last 7 days" 
            onClick={() => setQuickDateRange('last7days')} 
            size="small" 
            variant="outlined"
          />
          <Chip 
            label="Last 30 days" 
            onClick={() => setQuickDateRange('last30days')} 
            size="small" 
            variant="outlined"
          />
          <Chip 
            label="Last 3 months" 
            onClick={() => setQuickDateRange('last3months')} 
            size="small" 
            variant="outlined"
          />
          <Chip 
            label="This year" 
            onClick={() => setQuickDateRange('thisYear')} 
            size="small" 
            variant="outlined"
          />
        </Box>
      </Grid>
    </Grid>
  );

  const renderSpecificFilters = () => {
    switch (reportType) {
      case 'category-breakdown':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Transaction Type</InputLabel>
                <Select
                  value={filters.transaction_type}
                  onChange={(e) => handleFilterChange('transaction_type', e.target.value)}
                  label="Transaction Type"
                >
                  <MenuItem value="expense">Expenses</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Limit Results"
                type="number"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value) || 20)}
                InputProps={{ inputProps: { min: 1, max: 100 } }}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        );

      case 'tax-deductible':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Tax Year"
                type="number"
                value={filters.tax_year}
                onChange={(e) => handleFilterChange('tax_year', parseInt(e.target.value) || new Date().getFullYear())}
                InputProps={{ inputProps: { min: 2020, max: new Date().getFullYear() + 1 } }}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        );

      case 'vendor-analysis':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Limit Results"
                type="number"
                value={filters.limit}
                onChange={(e) => handleFilterChange('limit', parseInt(e.target.value) || 50)}
                InputProps={{ inputProps: { min: 1, max: 100 } }}
                fullWidth
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                label="Min Transactions"
                type="number"
                value={filters.min_transactions}
                onChange={(e) => handleFilterChange('min_transactions', parseInt(e.target.value) || 1)}
                InputProps={{ inputProps: { min: 1 } }}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        );

      case 'audit-log':
        return (
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={filters.include_metadata}
                    onChange={(e) => handleFilterChange('include_metadata', e.target.checked)}
                  />
                }
                label="Include Metadata"
              />
            </Grid>
          </Grid>
        );

      default:
        return null;
    }
  };

  const renderBusinessFilter = () => (
    <Grid item xs={12} sm={6}>
      <FormControl fullWidth size="small">
        <InputLabel>Transaction Category</InputLabel>
        <Select
          value={filters.is_business === null ? '' : filters.is_business.toString()}
          onChange={(e) => {
            const value = e.target.value === '' ? null : e.target.value === 'true';
            handleFilterChange('is_business', value);
          }}
          label="Transaction Category"
        >
          <MenuItem value="">All Transactions</MenuItem>
          <MenuItem value="true">Business Only</MenuItem>
          <MenuItem value="false">Personal Only</MenuItem>
        </Select>
      </FormControl>
    </Grid>
  );

  if (compact) {
    return (
      <Accordion expanded={expanded} onChange={() => setExpanded(!expanded)}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterList />
            <Typography>Filters</Typography>
            {getActiveFiltersCount() > 0 && (
              <Chip 
                label={`${getActiveFiltersCount()} active`} 
                size="small" 
                color="primary"
              />
            )}
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {renderCommonFilters()}
            {renderSpecificFilters()}
            {(['income-expense', 'category-breakdown'].includes(reportType)) && renderBusinessFilter()}
            
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button 
                startIcon={<Clear />} 
                onClick={clearFilters}
                variant="outlined"
                size="small"
              >
                Clear
              </Button>
            </Box>
          </Box>
        </AccordionDetails>
      </Accordion>
    );
  }

  return (
    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Filters</Typography>
        <Button 
          startIcon={<Clear />} 
          onClick={clearFilters}
          variant="outlined"
          size="small"
        >
          Clear All
        </Button>
      </Box>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {renderCommonFilters()}
        {renderSpecificFilters()}
        {(['income-expense', 'category-breakdown'].includes(reportType)) && renderBusinessFilter()}
      </Box>
    </Box>
  );
};

export default ReportFilters;
