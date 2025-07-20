import React, { useState } from 'react';
import { useFormik } from 'formik';
import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  TextField, 
  Button, 
  Grid, 
  Paper, 
  Box,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import { passwordResetRequestSchema } from '../../utils/validationSchemas';
import { useAuth } from '../../context/AuthContext';

const ForgotPasswordForm = () => {
  const { requestPasswordReset, loading, error } = useAuth();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');

  const formik = useFormik({
    initialValues: {
      email: '',
    },
    validationSchema: passwordResetRequestSchema,
    onSubmit: async (values) => {
      const result = await requestPasswordReset(values.email);
      
      if (result.success) {
        setSnackbarMessage('Password reset instructions have been sent to your email.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        setSnackbarMessage(result.error?.message || 'Failed to request password reset. Please try again.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    },
  });

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Forgot Password
          </Typography>
          
          <Typography variant="body1" align="center" sx={{ mb: 3 }}>
            Enter your email address below and we'll send you instructions to reset your password.
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message || 'An error occurred while requesting a password reset.'}
            </Alert>
          )}
          
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="email"
                  name="email"
                  label="Email Address"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                />
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  disabled={loading}
                >
                  {loading ? <CircularProgress size={24} /> : 'Reset Password'}
                </Button>
              </Grid>
            </Grid>
          </form>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Remember your password?{' '}
              <Link to="/login" style={{ textDecoration: 'none' }}>
                Sign in
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Box>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ForgotPasswordForm;
