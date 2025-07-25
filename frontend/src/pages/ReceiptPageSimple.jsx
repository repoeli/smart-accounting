/**
 * ReceiptPageSimple - Fallback Receipt Page
 * Simple receipt page without complex components as fallback
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Grid,
  CircularProgress,
  Alert
} from '@mui/material';
import { Receipt as ReceiptIcon, Upload as UploadIcon } from '@mui/icons-material';
import receiptService from '../services/api/receiptService';
import { useAuth } from '../context/AuthContext';

const ReceiptPageSimple = () => {
  const { user, isAuthenticated } = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      loadReceipts();
    }
  }, [isAuthenticated]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      console.log('Loading receipts...');
      const response = await receiptService.getReceipts({ page_size: 100 });
      console.log('Receipts response:', response);
      
      const data = response.data || response;
      const receiptsArray = data.results ? data.results : (Array.isArray(data) ? data : []);
      
      setReceipts(receiptsArray);
      console.log('Loaded receipts:', receiptsArray.length);
    } catch (err) {
      console.error('Failed to load receipts:', err);
      setError('Failed to load receipts');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading receipts...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Receipts ({receipts.length})
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        startIcon={<UploadIcon />}
        sx={{ mb: 3 }}
        onClick={() => console.log('Upload clicked')}
      >
        Upload Receipt
      </Button>

      {receipts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <ReceiptIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No receipts found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Upload your first receipt to get started
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {receipts.map((receipt) => (
            <Grid item xs={12} sm={6} md={4} key={receipt.id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {receipt.extracted_data?.vendor || receipt.original_filename || `Receipt #${receipt.id}`}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Amount: ${receipt.extracted_data?.total_amount || receipt.extracted_data?.total || '0.00'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status: {receipt.ocr_status || 'Unknown'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Date: {receipt.uploaded_at ? new Date(receipt.uploaded_at).toLocaleDateString() : 'N/A'}
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    sx={{ mt: 2 }}
                    onClick={() => console.log('View receipt:', receipt.id)}
                  >
                    View Details
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Debug Info */}
      <Card sx={{ mt: 4, bgcolor: 'info.light' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Debug Info
          </Typography>
          <Typography variant="body2">
            User: {user?.email || 'Not loaded'}
          </Typography>
          <Typography variant="body2">
            Authenticated: {isAuthenticated ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            Receipts count: {receipts.length}
          </Typography>
          <Typography variant="body2">
            Loading: {loading ? 'Yes' : 'No'}
          </Typography>
          <Typography variant="body2">
            Error: {error || 'None'}
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ReceiptPageSimple;
