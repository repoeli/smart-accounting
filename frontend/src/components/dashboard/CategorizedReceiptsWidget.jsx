/**
 * Categorized Receipts Widget
 * Simple dashboard component for displaying receipts
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardContent,
  Typography,
  Grid,
  IconButton,
  CircularProgress,
  Alert
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Add as AddIcon
} from '@mui/icons-material';

// Custom hooks
import { useReceiptAPI } from '../../hooks/useReceiptAPI';

const CategorizedReceiptsWidget = ({
  title = "Recent Receipts",
  maxItems = 5
}) => {
  // Use the new receipt API hook
  const { 
    receipts, 
    loading, 
    error, 
    fetchReceipts
  } = useReceiptAPI();

  // Create summary from receipts
  const summary = useMemo(() => {
    if (!receipts || receipts.length === 0) {
      return { total: 0, income: 0, expense: 0, count: 0 };
    }
    
    return receipts.slice(0, maxItems).reduce((acc, receipt) => {
      const amount = parseFloat(receipt.extracted_data?.total || 0);
      const isIncome = receipt.extracted_data?.type === 'income';
      
      return {
        total: acc.total + amount,
        income: acc.income + (isIncome ? amount : 0),
        expense: acc.expense + (!isIncome ? amount : 0),
        count: acc.count + 1
      };
    }, { total: 0, income: 0, expense: 0, count: 0 });
  }, [receipts, maxItems]);

  const refresh = useCallback(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  const displayReceipts = receipts ? receipts.slice(0, maxItems) : [];

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={title}
        action={
          <IconButton size="small" onClick={refresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        }
      />
      
      <CardContent sx={{ flex: 1 }}>
        {/* Summary */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {summary.count}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Receipts
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="success.main">
                £{summary.total.toFixed(2)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Content */}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && !error && displayReceipts.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Typography color="text.secondary">
              No receipts found
            </Typography>
          </Box>
        )}

        {!loading && !error && displayReceipts.length > 0 && (
          <Box>
            {displayReceipts.map((receipt) => (
              <Box 
                key={receipt.id} 
                sx={{ 
                  p: 1, 
                  mb: 1, 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'action.hover' }
                }}
                onClick={() => window.open(`/receipts/${receipt.id}`, '_blank')}
              >
                <Typography variant="subtitle2">
                  {receipt.extracted_data?.vendor || 'Unknown Vendor'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  £{receipt.extracted_data?.total || '0.00'} • {receipt.extracted_data?.date || 'No date'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default CategorizedReceiptsWidget;