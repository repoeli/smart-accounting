/**
 * ReceiptListV2 - Enhanced Receipt List Component
 * Displays receipts in a modern card-based layout
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Grid,
  IconButton,
  Menu,
  MenuItem,
  CircularProgress,
  Alert,
  InputAdornment,
  TextField,
  Pagination
} from '@mui/material';
import {
  MoreVert,
  Visibility,
  Edit,
  Delete,
  Receipt as ReceiptIcon,
  Search,
  Upload as UploadIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import ReceiptStatusChip from './ReceiptStatusChip';

const ReceiptListV2 = ({ receipts = [], onReceiptSelect, onUpload, loading = false, error = '' }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Filter receipts based on search term
  const filteredReceipts = receipts.filter(receipt => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    const vendor = receipt.extracted_data?.vendor?.toLowerCase() || '';
    const date = receipt.created_at || '';
    const amount = receipt.extracted_data?.total_amount?.toString() || '';
    
    return vendor.includes(searchLower) || 
           date.includes(searchLower) || 
           amount.includes(searchLower);
  });

  // Pagination
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(startIndex, startIndex + itemsPerPage);

  const handleMenuOpen = (event, receipt) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
    setSelectedReceipt(receipt);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReceipt(null);
  };

  const handleMenuAction = (action) => {
    if (selectedReceipt && onReceiptSelect) {
      onReceiptSelect(selectedReceipt, action);
    }
    handleMenuClose();
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(parseFloat(amount));
  };

  const getReceiptImage = (receipt) => {
    return receipt.image || receipt.image_url || '/api/placeholder/300/200';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Header and Search */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h5" component="h2">
          Your Receipts ({filteredReceipts.length})
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search receipts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={onUpload}
          >
            Upload Receipt
          </Button>
        </Box>
      </Box>

      {/* Empty State */}
      {filteredReceipts.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <ReceiptIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {searchTerm ? 'No receipts found matching your search' : 'No receipts yet'}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {searchTerm ? 'Try adjusting your search terms' : 'Upload your first receipt to get started'}
          </Typography>
          {!searchTerm && (
            <Button variant="contained" startIcon={<UploadIcon />} onClick={onUpload}>
              Upload Receipt
            </Button>
          )}
        </Box>
      )}

      {/* Receipt Grid */}
      {paginatedReceipts.length > 0 && (
        <>
          <Grid container spacing={3}>
            {paginatedReceipts.map((receipt) => (
              <Grid item xs={12} sm={6} md={4} key={receipt.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => onReceiptSelect && onReceiptSelect(receipt, 'view')}
                >
                  {/* Receipt Image */}
                  <CardMedia
                    component="img"
                    height="200"
                    image={getReceiptImage(receipt)}
                    alt="Receipt"
                    sx={{ 
                      objectFit: 'cover',
                      backgroundColor: 'grey.100'
                    }}
                    loading="lazy"
                  />
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Vendor and Status */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="h6" component="h3" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                        {receipt.extracted_data?.vendor || receipt.original_filename || `Receipt #${receipt.id}`}
                      </Typography>
                      <ReceiptStatusChip status={receipt.ocr_status || receipt.status} />
                    </Box>

                    {/* Amount */}
                    <Typography variant="h5" color="primary" fontWeight="bold" gutterBottom>
                      {formatCurrency(receipt.extracted_data?.total_amount || receipt.extracted_data?.total || receipt.total_amount || 0)}
                    </Typography>

                    {/* Date */}
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {receipt.uploaded_at ? format(new Date(receipt.uploaded_at), 'MMM dd, yyyy') : 
                       receipt.created_at ? format(new Date(receipt.created_at), 'MMM dd, yyyy') : 'No date'}
                    </Typography>

                    {/* Items count */}
                    {receipt.extracted_data?.items && Array.isArray(receipt.extracted_data.items) && (
                      <Chip 
                        label={`${receipt.extracted_data.items.length} items`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Button 
                      size="small" 
                      startIcon={<Visibility />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReceiptSelect && onReceiptSelect(receipt, 'view');
                      }}
                    >
                      View
                    </Button>
                    
                    <IconButton 
                      size="small" 
                      onClick={(e) => handleMenuOpen(e, receipt)}
                    >
                      <MoreVert />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(event, value) => setCurrentPage(value)}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleMenuAction('view')}>
          <Visibility fontSize="small" sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('edit')}>
          <Edit fontSize="small" sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleMenuClose} sx={{ color: 'error.main' }}>
          <Delete fontSize="small" sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ReceiptListV2;