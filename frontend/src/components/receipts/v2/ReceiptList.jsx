/**
 * ReceiptList.jsx - New Schema Receipt List
 * 
 * List component for displaying receipts using the new flat schema.
 * Supports filtering, sorting, and pagination.
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Button,
  Pagination,
  CircularProgress,
  Alert,
  useTheme,
  alpha
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Sort as SortIcon,
  ViewList as ListIcon,
  ViewModule as GridIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';

import ReceiptSummaryCard from './ReceiptSummaryCard';

const ReceiptList = ({
  receipts = [],
  loading = false,
  onReceiptSelect,
  onReceiptUpdate,
  onReceiptReprocess,
  onReceiptDelete
}) => {
  const theme = useTheme();
  
  // Local state for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('uploaded_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filter receipts based on search and filters
  const filteredReceipts = receipts.filter(receipt => {
    const extractedData = receipt.extracted_data || {};
    const { vendor = '', type = 'expense' } = extractedData;
    
    // Search filter
    const matchesSearch = vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         receipt.id.toString().includes(searchTerm);
    
    // Type filter
    const matchesType = filterType === 'all' || type === filterType;
    
    // Status filter
    const matchesStatus = filterStatus === 'all' || receipt.ocr_status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  // Sort receipts
  const sortedReceipts = [...filteredReceipts].sort((a, b) => {
    let aValue, bValue;
    
    switch (sortBy) {
      case 'vendor':
        aValue = a.extracted_data?.vendor || '';
        bValue = b.extracted_data?.vendor || '';
        break;
      case 'total':
        aValue = a.extracted_data?.total || 0;
        bValue = b.extracted_data?.total || 0;
        break;
      case 'date':
        aValue = new Date(a.extracted_data?.date || 0);
        bValue = new Date(b.extracted_data?.date || 0);
        break;
      case 'uploaded_at':
      default:
        aValue = new Date(a.uploaded_at || 0);
        bValue = new Date(b.uploaded_at || 0);
        break;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  // Paginate receipts
  const totalPages = Math.ceil(sortedReceipts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReceipts = sortedReceipts.slice(startIndex, startIndex + itemsPerPage);

  // Handle filter changes
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  // Get summary stats
  const getStats = () => {
    const totalReceipts = filteredReceipts.length;
    const totalAmount = filteredReceipts.reduce((sum, receipt) => {
      const amount = receipt.extracted_data?.total || 0;
      return sum + amount;
    }, 0);
    
    const expenses = filteredReceipts.filter(r => r.extracted_data?.type === 'expense').length;
    const income = filteredReceipts.filter(r => r.extracted_data?.type === 'income').length;
    
    return { totalReceipts, totalAmount, expenses, income };
  };

  const stats = getStats();

  if (loading && receipts.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="300px">
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading receipts...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header with Stats */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="h5" fontWeight="600">
              Receipts
            </Typography>
            <Box display="flex" gap={1}>
              <IconButton
                onClick={() => setViewMode('grid')}
                color={viewMode === 'grid' ? 'primary' : 'default'}
                size="small"
              >
                <GridIcon />
              </IconButton>
              <IconButton
                onClick={() => setViewMode('list')}
                color={viewMode === 'list' ? 'primary' : 'default'}
                size="small"
              >
                <ListIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Quick Stats */}
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center" p={1}>
                <Typography variant="h6" color="primary">
                  {stats.totalReceipts}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Receipts
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center" p={1}>
                <Typography variant="h6" color="success.main">
                  ${stats.totalAmount.toFixed(2)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total Amount
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center" p={1}>
                <Typography variant="h6" color="error.main">
                  {stats.expenses}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Expenses
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Box textAlign="center" p={1}>
                <Typography variant="h6" color="success.main">
                  {stats.income}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Income
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Filters and Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            {/* Search */}
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by vendor or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>

            {/* Type Filter */}
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={filterType}
                  label="Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="expense">Expenses</MenuItem>
                  <MenuItem value="income">Income</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Status Filter */}
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  label="Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Sort */}
            <Grid item xs={12} md={4}>
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  variant={sortBy === 'uploaded_at' ? 'contained' : 'outlined'}
                  onClick={() => handleSortChange('uploaded_at')}
                  startIcon={<SortIcon />}
                >
                  Date {sortBy === 'uploaded_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                </Button>
                <Button
                  size="small"
                  variant={sortBy === 'vendor' ? 'contained' : 'outlined'}
                  onClick={() => handleSortChange('vendor')}
                >
                  Vendor {sortBy === 'vendor' && (sortOrder === 'asc' ? '↑' : '↓')}
                </Button>
                <Button
                  size="small"
                  variant={sortBy === 'total' ? 'contained' : 'outlined'}
                  onClick={() => handleSortChange('total')}
                >
                  Amount {sortBy === 'total' && (sortOrder === 'asc' ? '↑' : '↓')}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Receipt List */}
      {paginatedReceipts.length === 0 ? (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <ReceiptIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No receipts found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {searchTerm || filterType !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Upload your first receipt to get started'
              }
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={2}>
            {paginatedReceipts.map((receipt) => (
              <Grid 
                item 
                xs={12} 
                sm={viewMode === 'grid' ? 6 : 12} 
                md={viewMode === 'grid' ? 4 : 12} 
                key={receipt.id}
              >
                <ReceiptSummaryCard
                  receipt={receipt}
                  compact={viewMode === 'list'}
                  onView={() => onReceiptSelect && onReceiptSelect(receipt)}
                  onEdit={() => onReceiptSelect && onReceiptSelect(receipt, 'edit')}
                  onUpdate={onReceiptUpdate}
                  onReprocess={onReceiptReprocess}
                  onDelete={onReceiptDelete}
                />
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(e, page) => setCurrentPage(page)}
                color="primary"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </>
      )}

      {/* Loading overlay for updates */}
      {loading && receipts.length > 0 && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: alpha(theme.palette.background.default, 0.8),
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default ReceiptList;
