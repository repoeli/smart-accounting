import React from 'react';
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
import { registrationSchema } from '../../utils/validationSchemas';
import { useAuth } from '../../context/AuthContext';

const RegistrationForm = () => {
  const { register, loading, error } = useAuth();
  const [snackbarOpen, setSnackbarOpen] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState('');
  const [snackbarSeverity, setSnackbarSeverity] = React.useState('success');
  const [emailAlreadyExists, setEmailAlreadyExists] = React.useState(false);

  const formik = useFormik({
    initialValues: {
      email: '',
      password: '',
      confirmPassword: '',
      firstName: '',
      lastName: '',
      address: '',
      city: '',
      postalCode: '',
      country: '',
      phoneNumber: '',
    },
    validationSchema: registrationSchema,
    onSubmit: async (values) => {
      // Prepare data for the API
      const userData = {
        email: values.email,
        password: values.password,
        confirmPassword: values.confirmPassword,
        firstName: values.firstName,
        lastName: values.lastName,
        address: values.address,
        city: values.city,
        postalCode: values.postalCode,
        country: values.country,
        phoneNumber: values.phoneNumber,
      };
      
      // Call the register function from AuthContext
      const result = await register(userData);
      
      if (result.success) {
        setSnackbarMessage('Registration successful! Please check your email to verify your account.');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else {
        // Check if the error is due to email already existing
        if (result.error?.code === 'EMAIL_EXISTS') {
          // Set a special flag for email exists error to show login link
          setEmailAlreadyExists(true);
        }
        
        // Display specific error messages if available
        const errorMsg = 
          result.error?.non_field_errors || 
          result.error?.email || 
          result.error?.password || 
          result.error?.message || 
          'Registration failed. Please check your inputs and try again.';
        
        setSnackbarMessage(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
    },
  });

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
    // Reset the email already exists state
    if (emailAlreadyExists) {
      setEmailAlreadyExists(false);
    }
  };

  return (
    <Container component="main" maxWidth="md">
      <Box sx={{ mt: 8, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Create an Account
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error.message || 'An error occurred during registration.'}
            </Alert>
          )}
          
          {emailAlreadyExists && (
            <Alert severity="info" sx={{ mb: 2 }} action={
              <Button color="inherit" size="small" component={Link} to="/login">
                Login
              </Button>
            }>
              This email is already registered. You can login with your existing account.
            </Alert>
          )}
          
          <form onSubmit={formik.handleSubmit}>
            <Grid container spacing={2}>
              {/* Account Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Account Information
                </Typography>
              </Grid>
              
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
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="password"
                  name="password"
                  label="Password"
                  type="password"
                  value={formik.values.password}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.password && Boolean(formik.errors.password)}
                  helperText={formik.touched.password && formik.errors.password}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="confirmPassword"
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  value={formik.values.confirmPassword}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                  helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                />
              </Grid>
              
              {/* Personal Information */}
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Personal Information
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="firstName"
                  name="firstName"
                  label="First Name"
                  value={formik.values.firstName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                  helperText={formik.touched.firstName && formik.errors.firstName}
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="lastName"
                  name="lastName"
                  label="Last Name"
                  value={formik.values.lastName}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                  helperText={formik.touched.lastName && formik.errors.lastName}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="address"
                  name="address"
                  label="Address"
                  value={formik.values.address}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.address && Boolean(formik.errors.address)}
                  helperText={formik.touched.address && formik.errors.address}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  id="city"
                  name="city"
                  label="City"
                  value={formik.values.city}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.city && Boolean(formik.errors.city)}
                  helperText={formik.touched.city && formik.errors.city}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  id="postalCode"
                  name="postalCode"
                  label="Postal Code"
                  value={formik.values.postalCode}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.postalCode && Boolean(formik.errors.postalCode)}
                  helperText={formik.touched.postalCode && formik.errors.postalCode}
                />
              </Grid>
              
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth
                  id="country"
                  name="country"
                  label="Country"
                  value={formik.values.country}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.country && Boolean(formik.errors.country)}
                  helperText={formik.touched.country && formik.errors.country}
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="phoneNumber"
                  name="phoneNumber"
                  label="Phone Number"
                  value={formik.values.phoneNumber}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.phoneNumber && Boolean(formik.errors.phoneNumber)}
                  helperText={formik.touched.phoneNumber && formik.errors.phoneNumber}
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
                  {loading ? <CircularProgress size={24} /> : 'Register'}
                </Button>
              </Grid>
            </Grid>
          </form>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2">
              Already have an account?{' '}
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

export default RegistrationForm;
