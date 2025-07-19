import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Button, 
  Paper, 
  Box,
  Alert
} from '@mui/material';

const EmailVerificationSent = () => {
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
    </Container>
  );
};

export default EmailVerificationSent;
