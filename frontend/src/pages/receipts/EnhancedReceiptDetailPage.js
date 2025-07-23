/**
 * Enhanced Receipt Detail Page Component
 * Comprehensive receipt viewing and editing page
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Alert,
  Button,
  Paper,
  Typography
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import EnhancedReceiptDetails from '../../components/receipts/EnhancedReceiptDetails';
import enhancedReceiptService from '../../services/api/enhancedReceiptService';

function EnhancedReceiptDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);

  // Check if we're in edit mode based on URL
  const isEditMode = location.pathname.includes('/edit');

  useEffect(() => {
    if (id) {
      loadReceipt();
    }
  }, [id]);

  const loadReceipt = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await enhancedReceiptService.getReceiptDetails(id);
      
      if (result.success) {
        setReceipt(result.data);
      } else {
        setError(result.error?.message || 'Failed to load receipt');
      }
    } catch (err) {
      setError(`Error loading receipt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = (updatedReceipt) => {
    setReceipt(updatedReceipt);
    // Navigate back to view mode after save
    navigate(`/receipts/${id}`);
  };

  const handleCancel = () => {
    // Navigate back to receipts list or view mode
    if (isEditMode) {
      navigate(`/receipts/${id}`);
    } else {
      navigate('/receipts');
    }
  };

  if (loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <CircularProgress size={40} />
        <Typography sx={{ ml: 2 }}>Loading receipt details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/receipts')}
          >
            Back to Receipts
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadReceipt}
          >
            Try Again
          </Button>
        </Box>
      </Box>
    );
  }

  if (!receipt) {
    return (
      <Box sx={{ maxWidth: 600, mx: 'auto', p: 3 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Receipt Not Found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            The receipt you're looking for doesn't exist or has been deleted.
          </Typography>
          <Button
            variant="contained"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/receipts')}
          >
            Back to Receipts
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <EnhancedReceiptDetails
      receiptId={id}
      onSave={handleSave}
      onCancel={handleCancel}
      initialEditMode={isEditMode}
    />
  );
}

export default EnhancedReceiptDetailPage;
