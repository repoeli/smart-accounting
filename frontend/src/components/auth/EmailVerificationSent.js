import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Box,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import authAPI from '../../services/authAPI';

const EmailVerificationSent = () => {
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  // Extract email from location state if available
  const userEmail = location.state?.email;

  const handleResendEmail = async () => {
    if (!userEmail) {
      setSnackbarMessage('Could not find your email address. Please try registering again.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    const result = await authAPI.resendVerificationEmail(userEmail);
    setLoading(false);

    if (result.success) {
      setSnackbarMessage('A new verification email has been sent.');
      setSnackbarSeverity('success');
    } else {
      setSnackbarMessage(result.error?.details || result.error?.message || 'Failed to resend email.');
      setSnackbarSeverity('error');
    }
    setSnackbarOpen(true);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Verify Your Email
          </Typography>
          
          <Alert severity="info" sx={{ mb: 3 }}>
            Verification email sent!
          </Alert>
          
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body1" paragraph>
              We've sent a verification email to your registered email address.
            </Typography>
            
            <Typography variant="body1" paragraph>
              Please check your inbox (and spam folder) and click on the verification link to complete your registration.
            </Typography>
            
            <Typography variant="body1" paragraph>
              The verification link will expire in 24 hours.
            </Typography>
            
            {userEmail && (
              <Box sx={{ mt: 2 }}>
                <Button
                  onClick={handleResendEmail}
                  variant="outlined"
                  color="secondary"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} /> : null}
                >
                  {loading ? 'Sending...' : 'Resend Verification Email'}
                </Button>
              </Box>
            )}
            
            <Button
              component={Link}
              to="/login"
              variant="contained"
              color="primary"
              size="large"
              sx={{ mt: 2 }}
            >
              Back to Login
            </Button>
          </Box>
        </Paper>
      </Box>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmailVerificationSent;
