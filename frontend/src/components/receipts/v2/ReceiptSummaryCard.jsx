/**
 * ReceiptSummaryCard - Receipt Summary Display Component
 * Shows key receipt information in a card format
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Button,
  Chip,
  Divider
} from '@mui/material';
import { 
  Edit as EditIcon, 
  Refresh as RefreshIcon,
  Visibility as ViewIcon 
} from '@mui/icons-material';

const ReceiptSummaryCard = ({ receipt, onEdit, onReprocess, onView }) => {
  if (!receipt) {
    return (
      <Card>
        <CardContent>
          <Typography>No receipt data available</Typography>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'processing': return 'warning';
      case 'failed': return 'error';
      default: return 'default';
    }
  };

  return (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5" component="h2">
            {receipt.extracted_data?.vendor || receipt.original_filename || `Receipt #${receipt.id}`}
          </Typography>
          <Chip
            label={receipt.ocr_status || 'unknown'}
            color={getStatusColor(receipt.ocr_status)}
            size="small"
          />
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Total Amount:
          </Typography>
          <Typography variant="h6" color="primary">
            £{receipt.extracted_data?.total || '0.00'}
          </Typography>
        </Box>
        
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Date:
          </Typography>
          <Typography variant="body2">
            {receipt.extracted_data?.date || 'Not extracted'}
          </Typography>
        </Box>
        
        <Box display="flex" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="text.secondary">
            Type:
          </Typography>
          <Typography variant="body2">
            {receipt.extracted_data?.type || 'expense'}
          </Typography>
        </Box>
        
        <Box display="flex" justifyContent="space-between">
          <Typography variant="body2" color="text.secondary">
            Uploaded:
          </Typography>
          <Typography variant="body2">
            {new Date(receipt.uploaded_at).toLocaleDateString()}
          </Typography>
        </Box>
      </CardContent>
      
      <CardActions>
        <Button size="small" startIcon={<ViewIcon />} onClick={onView}>
          View
        </Button>
        <Button size="small" startIcon={<EditIcon />} onClick={onEdit}>
          Edit
        </Button>
        <Button size="small" startIcon={<RefreshIcon />} onClick={() => onReprocess(receipt.id)}>
          Reprocess
        </Button>
      </CardActions>
    </Card>
  );
};

export default ReceiptSummaryCard;