import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosConfig';

const TransactionReviewPage = () => {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchPendingReceipts();
  }, []);

  const fetchPendingReceipts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/receipts/pending_review/');
      setReceipts(response.data);
    } catch (err) {
      setError('Failed to fetch pending receipts');
      console.error('Error fetching receipts:', err);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 85) return 'success';
    if (confidence >= 70) return 'warning';
    return 'error';
  };

  const handleReceiptClick = (receiptId) => {
    navigate(`/transaction-review/${receiptId}`);
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading pending transactions...
        </Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Transaction Review
      </Typography>
      
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Review and verify transactions extracted from receipts
      </Typography>

      {receipts.length === 0 ? (
        <Card sx={{ mt: 3 }}>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="h6" color="text.secondary">
              No transactions pending review
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              All transactions have been automatically approved or manually verified.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pending Transactions ({receipts.length})
            </Typography>
            
            <List>
              {receipts.map((receipt) => (
                <ListItem key={receipt.id} disablePadding>
                  <ListItemButton onClick={() => handleReceiptClick(receipt.id)}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="subtitle1">
                            {receipt.transaction?.vendor_name || 'Unknown Vendor'}
                          </Typography>
                          <Chip
                            label={`£${receipt.transaction?.total_amount || receipt.total_amount || '0.00'}`}
                            color="primary"
                            size="small"
                          />
                          <Chip
                            label={`${receipt.ocr_confidence || 0}% confidence`}
                            color={getConfidenceColor(receipt.ocr_confidence || 0)}
                            size="small"
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Date: {receipt.transaction?.transaction_date || receipt.receipt_date || 'Unknown'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            File: {receipt.original_filename}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Uploaded: {new Date(receipt.uploaded_at).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}
    </Container>
  );
};

export default TransactionReviewPage;