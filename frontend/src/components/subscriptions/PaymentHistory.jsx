/**
 * Payment History Component
 * Displays user's payment history with download receipt functionality.
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
  Pagination,
  InputAdornment,
  TextField
} from '@mui/material';
import {
  Receipt as ReceiptIcon,
  Download as DownloadIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';

import subscriptionAPI from '../../services/subscriptions/subscriptionAPI';

const PaymentHistory = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchPaymentHistory();
  }, [page]);

  const fetchPaymentHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await subscriptionAPI.getPaymentHistory();
      
      if (response.payments) {
        // Filter payments by search term
        let filteredPayments = response.payments;
        if (searchTerm) {
          filteredPayments = response.payments.filter(payment =>
            payment.invoice_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            payment.status?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        // Calculate pagination
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        const paginatedPayments = filteredPayments.slice(startIndex, endIndex);
        
        setPayments(paginatedPayments);
        setTotalPages(Math.ceil(filteredPayments.length / ITEMS_PER_PAGE));
      } else {
        setPayments([]);
      }
      
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setError(err.message);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchPaymentHistory();
  };

  const handleRefresh = () => {
    setPage(1);
    setSearchTerm('');
    fetchPaymentHistory();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount, currency = 'GBP') => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase()
    }).format(amount / 100); // Convert from pence to pounds
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
      case 'succeeded':
        return 'success';
      case 'pending':
        return 'warning';
      case 'failed':
      case 'cancelled':
        return 'error';
      case 'refunded':
        return 'info';
      default:
        return 'default';
    }
  };

  const handleDownloadReceipt = async (paymentId, invoiceId) => {
    try {
      // This would typically open the Stripe invoice URL
      // For now, we'll show a placeholder action
      window.open(`https://invoice.stripe.com/i/${invoiceId}`, '_blank');
    } catch (err) {
      console.error('Error downloading receipt:', err);
    }
  };

  if (loading && payments.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Payment History
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
            <TextField
              label="Search payments"
              placeholder="Search by invoice ID, description, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              sx={{ flexGrow: 1 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                )
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading}
            >
              Search
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Payment History Table */}
      <Card>
        <CardContent>
          {payments.length === 0 ? (
            <Box textAlign="center" py={6}>
              <ReceiptIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No payment history found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm ? 'Try adjusting your search criteria' : 'Your payment history will appear here once you make your first payment'}
              </Typography>
            </Box>
          ) : (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Invoice ID</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id} hover>
                        <TableCell>
                          {formatDate(payment.created_at)}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontFamily="monospace">
                            {payment.invoice_id || payment.stripe_payment_intent_id || 'N/A'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {payment.description || 'Subscription payment'}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">
                            {formatAmount(payment.amount, payment.currency)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                            color={getStatusColor(payment.status)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Download Receipt">
                            <IconButton
                              size="small"
                              onClick={() => handleDownloadReceipt(payment.id, payment.invoice_id)}
                              disabled={!payment.invoice_id || payment.status !== 'paid'}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              {totalPages > 1 && (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                  <Pagination
                    count={totalPages}
                    page={page}
                    onChange={(event, newPage) => setPage(newPage)}
                    color="primary"
                    disabled={loading}
                  />
                </Box>
              )}

              {/* Summary */}
              <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Showing {payments.length} of {totalPages * ITEMS_PER_PAGE} payments
                  {searchTerm && ` matching "${searchTerm}"`}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default PaymentHistory;
