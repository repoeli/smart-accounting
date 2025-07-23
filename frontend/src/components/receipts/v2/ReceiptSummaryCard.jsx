/**
 * ReceiptSummaryCard.jsx - v2 New Schema Component
 * 
 * Core component for displaying receipt data using the new flat schema:
 * {
 *   "extracted_data": {
 *     "vendor": "Store Name",
 *     "date": "2024-01-15",
 *     "total": 45.67,
 *     "tax": 3.45,
 *     "type": "expense",
 *     "currency": "USD"
 *   },
 *   "processing_metadata": {
 *     "processing_time": 2.5,
 *     "cost_usd": 0.02,
 *     "token_usage": 150,
 *     "segments_processed": 1
 *   }
 * }
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Box,
  Chip,
  IconButton,
  Button,
  Grid,
  Divider,
  Alert,
  Collapse,
  useTheme,
  alpha
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  Edit,
  Refresh,
  CheckCircle,
  Error,
  Receipt as ReceiptIcon,
  Store,
  CalendarToday,
  AttachMoney,
  Assessment
} from '@mui/icons-material';

const ReceiptSummaryCard = ({ 
  receipt, 
  onEdit, 
  onReprocess, 
  onView,
  compact = false 
}) => {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  // Extract data from new schema - PRODUCTION FIX
  const extractedData = receipt?.extracted_data || {};
  const performance = receipt?.processing_metadata || {};
  
  const vendor = extractedData.vendor || 'Unknown Vendor';
  const date = extractedData.date || receipt?.created_at || 'Unknown Date';
  const total = parseFloat(extractedData.total) || 0;
  const tax = parseFloat(extractedData.tax) || 0;
  const type = extractedData.type || 'expense';
  const currency = extractedData.currency || 'USD';
  
  // Processing metadata from processing_metadata field
  const processingTime = performance.time_sec || 0;
  const costUsd = performance.cost_usd || 0;
  const tokenUsage = (performance.input_tokens || 0) + (performance.output_tokens || 0);
  const segmentsProcessed = performance.segments || 1;

  // 🚨 EMERGENCY DEBUG - Log everything
  console.log('� EMERGENCY DEBUG - Receipt ID:', receipt?.id);
  console.log('🔥 EMERGENCY DEBUG - Full Receipt:', JSON.stringify(receipt, null, 2));
  console.log('🔥 EMERGENCY DEBUG - Extracted Data:', extractedData);
  console.log('🔥 EMERGENCY DEBUG - Parsed Values:', {
    vendor, date, total, tax, type, currency,
    rawTotal: extractedData.total,
    rawTax: extractedData.tax,
    totalType: typeof extractedData.total,
    taxType: typeof extractedData.tax
  });

  // Status determination - PRODUCTION FIX
  const getStatusInfo = () => {
    // Check multiple possible status fields
    const status = receipt?.ocr_status || receipt?.status || receipt?.processing_status;
    
    switch (status) {
      case 'completed':
      case 'processed':
      case 'success':
        return {
          color: 'success',
          icon: <CheckCircle />,
          text: 'Completed'
        };
      case 'processing':
      case 'pending':
        return {
          color: 'warning',
          icon: <Assessment />,
          text: 'Processing'
        };
      case 'failed':
      case 'error':
        return {
          color: 'error',
          icon: <Error />,
          text: 'Failed'
        };
      default:
        // If we have extracted data, assume it's completed
        if (extractedData.vendor && extractedData.total) {
          return {
            color: 'success',
            icon: <CheckCircle />,
            text: 'Completed'
          };
        }
        return {
          color: 'default',
          icon: <ReceiptIcon />,
          text: 'Pending'
        };
    }
  };

  const statusInfo = getStatusInfo();

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Format date
  const formatDate = (dateStr) => {
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return dateStr;
    }
  };

  // Handle reprocess
  const handleReprocess = async () => {
    setLoading(true);
    try {
      await onReprocess(receipt.id);
    } finally {
      setLoading(false);
    }
  };

  if (compact) {
    return (
      <Card 
        sx={{ 
          mb: 1, 
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: alpha(theme.palette.primary.main, 0.04)
          }
        }}
        onClick={() => onView(receipt)}
      >
        <CardContent sx={{ py: 1.5 }}>
          <Grid container alignItems="center" spacing={2}>
            <Grid item xs={4}>
              <Typography variant="subtitle2" noWrap>
                {vendor}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {formatDate(date)}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="h6" color="primary">
                {formatCurrency(total)}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Chip 
                label={type}
                size="small"
                color={type === 'expense' ? 'error' : 'success'}
                variant="outlined"
              />
            </Grid>
            <Grid item xs={2}>
              <Chip 
                icon={statusInfo.icon}
                label={statusInfo.text}
                size="small"
                color={statusInfo.color}
                variant="outlined"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        mb: 2,
        border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
        '&:hover': {
          boxShadow: theme.shadows[4]
        }
      }}
    >
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Store color="primary" />
            <Typography variant="h6" component="h2">
              {vendor}
            </Typography>
          </Box>
          <Chip 
            icon={statusInfo.icon}
            label={statusInfo.text}
            color={statusInfo.color}
            size="small"
          />
        </Box>

        {/* Main Financial Info */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 1, bgcolor: alpha(theme.palette.primary.main, 0.04), borderRadius: 1 }}>
              <AttachMoney color="primary" />
              <Typography variant="h5" color="primary" fontWeight="bold">
                {formatCurrency(total)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Total Amount
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <CalendarToday color="action" />
              <Typography variant="body1" fontWeight="medium">
                {formatDate(date)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Date
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="body1" fontWeight="medium">
                {formatCurrency(tax)}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                Tax Amount
              </Typography>
            </Box>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Chip 
                label={type.toUpperCase()}
                color={type === 'expense' ? 'error' : 'success'}
                size="medium"
              />
              <Typography variant="caption" display="block" color="textSecondary">
                Type
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Error Display */}
        {receipt?.ocr_status === 'failed' && receipt?.processing_errors && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Processing failed: {receipt.processing_errors.join(', ')}
          </Alert>
        )}

        {/* Expandable Processing Details */}
        <Box>
          <Button
            onClick={() => setExpanded(!expanded)}
            endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
            size="small"
            color="inherit"
          >
            Processing Details
          </Button>
          
          <Collapse in={expanded}>
            <Divider sx={{ my: 1 }} />
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="textSecondary">
                  Processing Time
                </Typography>
                <Typography variant="body2">
                  {processingTime.toFixed(1)}s
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="textSecondary">
                  API Cost
                </Typography>
                <Typography variant="body2">
                  ${costUsd.toFixed(4)}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="textSecondary">
                  Tokens Used
                </Typography>
                <Typography variant="body2">
                  {tokenUsage.toLocaleString()}
                </Typography>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Typography variant="caption" color="textSecondary">
                  Segments
                </Typography>
                <Typography variant="body2">
                  {segmentsProcessed}
                </Typography>
              </Grid>
            </Grid>
          </Collapse>
        </Box>
      </CardContent>

      <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
        <Box>
          <Button
            startIcon={<Edit />}
            onClick={() => onEdit(receipt)}
            size="small"
            disabled={receipt?.ocr_status === 'processing'}
          >
            Edit
          </Button>
          
          <IconButton
            onClick={handleReprocess}
            disabled={loading || receipt?.ocr_status === 'processing'}
            size="small"
            sx={{ ml: 1 }}
          >
            <Refresh />
          </IconButton>
        </Box>
        
        <Button
          variant="outlined"
          onClick={() => onView(receipt)}
          size="small"
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
};

export default ReceiptSummaryCard;
