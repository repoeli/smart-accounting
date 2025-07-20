import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../context/AuthContext';

const EmailVerification = () => {
  const { token } = useParams();
  const { verifyEmail, loading } = useAuth();
  const [verificationStatus, setVerificationStatus] = useState('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyUserEmail = async () => {
      if (!token) {
        setVerificationStatus('failed');
        setErrorMessage('Verification token is missing.');
        return;
      }

      try {
        const result = await verifyEmail(token);
        if (result.success) {
          setVerificationStatus('success');
        } else {
          setVerificationStatus('failed');
          setErrorMessage(result.error?.message || 'Failed to verify email. The token may be invalid or expired.');
        }
      } catch (error) {
        setVerificationStatus('failed');
        setErrorMessage('An unexpected error occurred during email verification.');
      }
    };

    verifyUserEmail();
  }, [token, verifyEmail]);

  if (loading) {
    return (
      <Container component="main" maxWidth="sm">
        <Box sx={{ mt: 8, mb: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            Verifying your email address...
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Email Verification
          </Typography>
          
          {verificationStatus === 'success' ? (
            <>
              <Alert severity="success" sx={{ mb: 3 }}>
                Your email has been successfully verified!
              </Alert>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  Thank you for verifying your email address. You can now log in to your account.
                </Typography>
                <Button
                  component={Link}
                  to="/login"
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  Log In
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Alert severity="error" sx={{ mb: 3 }}>
                {errorMessage}
              </Alert>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="body1" sx={{ mb: 3 }}>
                  We couldn't verify your email address. The verification link might be invalid or expired.
                </Typography>
                <Button
                  component={Link}
                  to="/login"
                  variant="contained"
                  color="primary"
                  size="large"
                  sx={{ mr: 2 }}
                >
                  Back to Login
                </Button>
              </Box>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default EmailVerification;
