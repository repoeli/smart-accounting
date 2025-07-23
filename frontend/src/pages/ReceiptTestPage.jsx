import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Grid,
  Divider
} from '@mui/material';
import {
  Login as LoginIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { useReceiptAPI } from '../hooks/useReceiptAPI';

/**
 * Production Test Page for Receipt Upload Flow
 * 
 * Tests the complete flow:
 * 1. Login with email/password
 * 2. Upload receipt image
 * 3. Display extracted data in new schema format
 */
const ReceiptTestPage = () => {
  const { uploadReceipt, loading, error } = useReceiptAPI();
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [token, setToken] = useState(localStorage.getItem('smart_accounting_token') || '');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [uploadResult, setUploadResult] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);

  // Manual login for testing
  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');

    try {
      const response = await fetch('http://localhost:8000/api/v1/accounts/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginForm)
      });

      const data = await response.json();

      if (data.success && data.tokens) {
        const accessToken = data.tokens.access;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('smart_accounting_token', accessToken);
        setToken(accessToken);
        setLoginError('');
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError(err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      const result = await uploadReceipt(selectedFile);
      setUploadResult(result);
    } catch (err) {
      console.error('Upload failed:', err);
    }
  };

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount && amount !== 0) return 'N/A';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(Number(amount));
    } catch {
      return `${currency} ${Number(amount).toFixed(2)}`;
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom align="center">
        Receipt Upload Test Page
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" align="center" gutterBottom>
        Production Test for New Schema Integration
      </Typography>

      {/* Login Section */}
      {!token && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <LoginIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Login (Email-based)
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="superuser@test.com"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Password"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                placeholder="admin123"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                onClick={handleLogin}
                disabled={loginLoading || !loginForm.email || !loginForm.password}
                startIcon={loginLoading ? <CircularProgress size={20} /> : <LoginIcon />}
              >
                Login
              </Button>
            </Grid>
          </Grid>

          {loginError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {loginError}
            </Alert>
          )}
        </Paper>
      )}

      {/* Upload Section */}
      {token && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            <UploadIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Upload Receipt (Image Field)
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedFile(e.target.files[0])}
              style={{ marginBottom: '16px' }}
            />
          </Box>

          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={loading || !selectedFile}
            startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            Upload Receipt
          </Button>

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error.message || error}
            </Alert>
          )}
        </Paper>
      )}

      {/* Results Section */}
      {uploadResult && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main">
              ✅ Upload Successful - New Schema Data
            </Typography>

            <Divider sx={{ my: 2 }} />

            {/* Extracted Data */}
            <Typography variant="h6" gutterBottom>
              Extracted Data (New Flat Schema)
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Vendor</Typography>
                <Typography variant="body1" fontWeight="bold">
                  {uploadResult.extracted_data?.vendor || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Date</Typography>
                <Typography variant="body1">
                  {uploadResult.extracted_data?.date || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Total</Typography>
                <Typography variant="h6" color="primary.main">
                  {formatCurrency(uploadResult.extracted_data?.total, uploadResult.extracted_data?.currency)}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Tax</Typography>
                <Typography variant="body1">
                  {uploadResult.extracted_data?.tax 
                    ? formatCurrency(uploadResult.extracted_data.tax, uploadResult.extracted_data?.currency)
                    : 'N/A'
                  }
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Type</Typography>
                <Typography variant="body1">
                  {uploadResult.extracted_data?.type || 'expense'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Currency</Typography>
                <Typography variant="body1">
                  {uploadResult.extracted_data?.currency || 'USD'}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Processing Metadata */}
            <Typography variant="h6" gutterBottom>
              Processing Metadata
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Processing Time</Typography>
                <Typography variant="body1">
                  {uploadResult.processing_metadata?.processing_time || uploadResult.processing_metadata?.time_sec || 'N/A'}s
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Cost</Typography>
                <Typography variant="body1">
                  ${uploadResult.processing_metadata?.cost_usd?.toFixed(4) || 'N/A'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">Segments</Typography>
                <Typography variant="body1">
                  {uploadResult.processing_metadata?.segments_processed || uploadResult.processing_metadata?.segments || 'N/A'}
                </Typography>
              </Grid>
            </Grid>

            {/* Raw JSON */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" gutterBottom>
              Raw Response (JSON)
            </Typography>
            <Box
              component="pre"
              sx={{
                backgroundColor: 'grey.100',
                p: 2,
                borderRadius: 1,
                overflow: 'auto',
                fontSize: '0.8rem',
                maxHeight: '300px'
              }}
            >
              {JSON.stringify(uploadResult, null, 2)}
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Paper sx={{ p: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="h6" gutterBottom>
          Test Instructions
        </Typography>
        <Typography variant="body2" component="div">
          <ol>
            <li>Login with: <code>superuser@test.com</code> / <code>admin123</code></li>
            <li>Select any receipt image from errorlogs folder</li>
            <li>Upload and verify new schema data is displayed correctly</li>
            <li>Check console for any errors</li>
          </ol>
        </Typography>
      </Paper>
    </Container>
  );
};

export default ReceiptTestPage;
