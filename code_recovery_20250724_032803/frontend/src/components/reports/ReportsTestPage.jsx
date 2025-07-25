import React, { useState } from 'react';
import { Container, Typography, Box, Button, Alert, CircularProgress } from '@mui/material';
import { useNavigate } from 'react-router-dom';

const ReportsTestPage = () => {
  const navigate = useNavigate();
  
  // State for API testing feedback
  const [apiLoading, setApiLoading] = useState(false);
  const [apiMessage, setApiMessage] = useState('');
  const [apiError, setApiError] = useState('');

  const testRoutes = [
    { path: '/reports', label: 'Main Reports Page' },
    { path: '/reports/income-expense', label: 'Income vs Expense Report' },
    { path: '/reports/category-breakdown', label: 'Category Breakdown Report' },
    { path: '/reports/tax-deductible', label: 'Tax Deductible Report' },
    { path: '/reports/vendor-analysis', label: 'Vendor Analysis Report' },
    { path: '/reports/audit-log', label: 'Audit Log Report' }
  ];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Reports System Test Page
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Use this page to test all reporting system routes and components
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {testRoutes.map((route) => (
          <Button
            key={route.path}
            variant="outlined"
            onClick={() => navigate(route.path)}
            sx={{ justifyContent: 'flex-start', p: 2 }}
          >
            {route.label} → {route.path}
          </Button>
        ))}
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Direct API Test
        </Typography>
        <Button
          variant="contained"
          onClick={async () => {
            setApiLoading(true);
            setApiMessage('');
            setApiError('');
            
            try {
              const response = await fetch('/api/v1/reports/summary/');
              
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              
              const data = await response.json();
              console.log('API Response:', data);
              
              setApiMessage(`API call successful! Received ${Object.keys(data).length} data properties.`);
            } catch (error) {
              console.error('API Error:', error);
              
              if (error.name === 'TypeError' && error.message.includes('fetch')) {
                setApiError('Network error: Unable to connect to the API. Please check your connection.');
              } else if (error.message.includes('HTTP 401')) {
                setApiError('Authentication error: Please log in and try again.');
              } else if (error.message.includes('HTTP 403')) {
                setApiError('Permission error: You do not have access to this resource.');
              } else if (error.message.includes('HTTP 404')) {
                setApiError('API endpoint not found. The reports API may not be available.');
              } else if (error.message.includes('HTTP 500')) {
                setApiError('Server error: The API is experiencing issues. Please try again later.');
              } else {
                setApiError(`API call failed: ${error.message}`);
              }
            } finally {
              setApiLoading(false);
            }
          }}
          disabled={apiLoading}
          startIcon={apiLoading ? <CircularProgress size={20} /> : null}
        >
          {apiLoading ? 'Testing API...' : 'Test Reports API'}
        </Button>
        
        {/* API Feedback Messages */}
        {apiMessage && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {apiMessage}
          </Alert>
        )}
        
        {apiError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {apiError}
          </Alert>
        )}
      </Box>
    </Container>
  );
};

export default ReportsTestPage;
