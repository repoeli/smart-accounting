/**
 * ReceiptListV2.jsx - v2 New Schema Component
 * 
 * Main list component for displaying receipts using the new flat schema.
 * Provides filtering, sorting, and bulk operations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Alert,
  CircularProgress,
  Pagination,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  alpha
} from '@mui/material';
import {
  Search,
  FilterList,
  ViewList,
  ViewModule,
  Add,
  Refresh,
  Sort,
  DateRange
} from '@mui/icons-material';

import ReceiptSummaryCard from './ReceiptSummaryCard';
import receiptService from '../../../services/api/receiptService';

const ReceiptListV2 = ({ onReceiptSelect, onUpload, receipts: propReceipts, loading: propLoading, error: propError }) => {
  const theme = useTheme();
  
  // Use props if provided, otherwise manage local state
  const [localReceipts, setLocalReceipts] = useState([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState(null);
  
  const receipts = propReceipts !== undefined ? propReceipts : localReceipts;
  const loading = propLoading !== undefined ? propLoading : localLoading;
  const error = propError !== undefined ? propError : localError;

  // Debug logging
  useEffect(() => {
    console.log('🔍 ReceiptListV2: Component state update', {
      receiptsCount: Array.isArray(receipts) ? receipts.length : 'not array',
      receiptsType: typeof receipts,
      loading,
      error,
      propReceipts: propReceipts ? 'provided' : 'not provided'
    });
  }, [receipts, loading, error, propReceipts]);
  
  // UI State
  const [viewMode, setViewMode] = useState('card'); // 'card' or 'compact'
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [itemsPerPage] = useState(50); // Increased from 10 to 50 for better UX

  // Fetch receipts on component mount (only if not provided via props)
  useEffect(() => {
    const loadReceipts = async () => {
      if (propReceipts === undefined) {
        try {
          setLocalLoading(true);
          const response = await receiptService.getReceipts();
          const data = response.data || response;
          // Ensure we always set an array
          const receiptsArray = data.results ? data.results : (Array.isArray(data) ? data : []);
          setLocalReceipts(receiptsArray);
        } catch (err) {
          setLocalError('Failed to load receipts');
          console.error('Failed to fetch receipts:', err);
          setLocalReceipts([]); // Set to empty array on error
        } finally {
          setLocalLoading(false);
        }
      }
    };
    
    loadReceipts();
  }, [propReceipts]);

  // Filter and sort receipts
  const filteredReceipts = useCallback(() => {
    // Ensure receipts is an array
    const receiptsArray = Array.isArray(receipts) ? receipts : [];
    console.log('🔍 ReceiptListV2: filteredReceipts called with', receiptsArray.length, 'receipts');
    let filtered = [...receiptsArray];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(receipt => {
        const extractedData = receipt.extracted_data || {};
        const vendor = extractedData.vendor || '';
        const searchLower = searchTerm.toLowerCase();
        
        return vendor.toLowerCase().includes(searchLower) ||
               receipt.id.toString().includes(searchLower) ||
               (receipt.description || '').toLowerCase().includes(searchLower);
      });
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(receipt => receipt.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(receipt => {
        const extractedData = receipt.extracted_data || {};
        return extractedData.type === typeFilter;
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'date':
          aValue = new Date(a.extracted_data?.date || a.created_at);
          bValue = new Date(b.extracted_data?.date || b.created_at);
          break;
        case 'vendor':
          aValue = (a.extracted_data?.vendor || '').toLowerCase();
          bValue = (b.extracted_data?.vendor || '').toLowerCase();
          break;
        case 'total':
          aValue = parseFloat(a.extracted_data?.total || 0);
          bValue = parseFloat(b.extracted_data?.total || 0);
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.created_at;
          bValue = b.created_at;
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    return filtered;
  }, [receipts, searchTerm, statusFilter, typeFilter, sortBy, sortOrder]);

  // Pagination
  const paginatedReceipts = useCallback(() => {
    const filtered = filteredReceipts();
    const startIndex = (page - 1) * itemsPerPage;
    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
    console.log('🔍 ReceiptListV2: paginatedReceipts', {
      filtered: filtered.length,
      page,
      itemsPerPage,
      startIndex,
      paginated: paginated.length
    });
    return paginated;
  }, [filteredReceipts, page, itemsPerPage]);

  const totalPages = Math.ceil(filteredReceipts().length / itemsPerPage);

  // Event handlers
  const handleSearch = (event) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page
  };

  const handleStatusFilter = (event) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  const handleTypeFilter = (event) => {
    setTypeFilter(event.target.value);
    setPage(1);
  };

  const handleSort = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const handleViewModeChange = (event, newViewMode) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const handleEdit = (receipt) => {
    // Navigate to edit mode
    onReceiptSelect(receipt, 'edit');
  };

  const handleView = (receipt) => {
    // Navigate to view mode
    onReceiptSelect(receipt, 'view');
  };

  const handleReprocess = async (receiptId) => {
    try {
      await receiptService.reprocessReceipt(receiptId);
      // Refresh the list if using local state
      if (propReceipts === undefined) {
        try {
          setLocalLoading(true);
          const response = await receiptService.getReceipts();
          const data = response.data || response;
          // Ensure we always set an array
          const receiptsArray = data.results ? data.results : (Array.isArray(data) ? data : []);
          setLocalReceipts(receiptsArray);
        } catch (err) {
          setLocalError('Failed to load receipts');
          console.error('Failed to fetch receipts:', err);
          setLocalReceipts([]); // Set to empty array on error
        } finally {
          setLocalLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to reprocess receipt:', err);
    }
  };

  const handleRefresh = async () => {
    if (propReceipts === undefined) {
      try {
        setLocalLoading(true);
        const response = await receiptService.getReceipts();
        const data = response.data || response;
        // Ensure we always set an array
        const receiptsArray = data.results ? data.results : (Array.isArray(data) ? data : []);
        setLocalReceipts(receiptsArray);
      } catch (err) {
        setLocalError('Failed to load receipts');
        console.error('Failed to fetch receipts:', err);
        setLocalReceipts([]); // Set to empty array on error
      } finally {
        setLocalLoading(false);
      }
    }
  };

  // Get summary stats
  const getSummaryStats = () => {
    const filtered = filteredReceipts();
    const totalAmount = filtered.reduce((sum, receipt) => {
      return sum + (parseFloat(receipt.extracted_data?.total) || 0);
    }, 0);
    
    const expenseCount = filtered.filter(r => r.extracted_data?.type === 'expense').length;
    const incomeCount = filtered.filter(r => r.extracted_data?.type === 'income').length;

    return {
      total: filtered.length,
      totalAmount,
      expenseCount,
      incomeCount
    };
  };

  const stats = getSummaryStats();

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Failed to load receipts: {error.message}
        <Button onClick={handleRefresh} sx={{ ml: 2 }}>
          Retry
        </Button>
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* Header */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3,
        flexWrap: 'wrap',
        gap: 2
      }}>
        <Typography variant="h4" component="h1" sx={{ 
          fontSize: { xs: '1.5rem', sm: '2rem' },
          fontWeight: 600
        }}>
          Receipts ({stats.total})
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onUpload}
            size="small"
            sx={{ minWidth: 'auto' }}
          >
            Upload Receipt
          </Button>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleRefresh}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Summary Stats */}
      <Paper sx={{ 
        p: 3, 
        mb: 3, 
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`
      }}>
        <Grid container spacing={3}>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                {stats.total}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Receipts
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="success.main" sx={{ fontWeight: 600 }}>
                ${stats.totalAmount.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Amount
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="error.main" sx={{ fontWeight: 600 }}>
                {stats.expenseCount}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Expenses
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h5" color="info.main" sx={{ fontWeight: 600 }}>
                {stats.incomeCount}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Income
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Filters and Controls */}
      <Paper sx={{ 
        p: 3, 
        mb: 3,
        border: `1px solid ${theme.palette.divider}`
      }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search */}
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              placeholder="Search receipts..."
              value={searchTerm}
              onChange={handleSearch}
              size="small"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          {/* Status Filter */}
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={handleStatusFilter}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="processed">Processed</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Type Filter */}
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={handleTypeFilter}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="expense">Expense</MenuItem>
                <MenuItem value="income">Income</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Sort */}
          <Grid item xs={6} sm={6} md={2}>
            <Button
              startIcon={<Sort />}
              onClick={() => handleSort('date')}
              color={sortBy === 'date' ? 'primary' : 'inherit'}
              size="small"
              fullWidth
            >
              Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
            </Button>
          </Grid>

          {/* View Mode */}
          <Grid item xs={6} sm={6} md={2}>
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
              fullWidth
            >
              <ToggleButton value="card">
                <ViewModule />
              </ToggleButton>
              <ToggleButton value="compact">
                <ViewList />
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {/* Receipts List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading receipts...</Typography>
        </Box>
      ) : paginatedReceipts().length === 0 ? (
        <Paper sx={{ 
          p: 6, 
          textAlign: 'center',
          border: `2px dashed ${theme.palette.grey[300]}`,
          bgcolor: alpha(theme.palette.grey[50], 0.5)
        }}>
          <Typography variant="h5" color="textSecondary" gutterBottom sx={{ fontWeight: 500 }}>
            No receipts found
          </Typography>
          <Typography variant="body1" color="textSecondary" sx={{ mb: 3 }}>
            {searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
              ? 'Try adjusting your filters or search terms.'
              : 'Upload your first receipt to get started.'
            }
          </Typography>
          
          {/* Action button */}
          {(!searchTerm && statusFilter === 'all' && typeFilter === 'all') && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onUpload}
              size="large"
              sx={{ mb: 3 }}
            >
              Upload Your First Receipt
            </Button>
          )}
          
          {/* Debug info */}
          <Box sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: alpha(theme.palette.info.main, 0.1),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`
          }}>
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
              Debug: Total receipts: {Array.isArray(receipts) ? receipts.length : 'not array'} | 
              Filtered: {filteredReceipts().length} | 
              Page: {page} | 
              Filters: Search="{searchTerm}", Status={statusFilter}, Type={typeFilter}
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Box>
          {/* Results header */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 2,
            p: 2,
            bgcolor: alpha(theme.palette.success.main, 0.08),
            borderRadius: 1,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`
          }}>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Showing {paginatedReceipts().length} of {filteredReceipts().length} receipts
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'success.dark' }}>
              Page {page} of {totalPages}
            </Typography>
          </Box>
          
          {/* Receipt cards */}
          <Box sx={{ 
            display: 'grid',
            gap: 2,
            gridTemplateColumns: viewMode === 'compact' ? '1fr' : 'repeat(auto-fill, minmax(400px, 1fr))'
          }}>
            {paginatedReceipts().map((receipt) => (
              <ReceiptSummaryCard
                key={receipt.id}
                receipt={receipt}
                compact={viewMode === 'compact'}
                onEdit={handleEdit}
                onView={handleView}
                onReprocess={handleReprocess}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={(event, newPage) => setPage(newPage)}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};

export default ReceiptListV2;
