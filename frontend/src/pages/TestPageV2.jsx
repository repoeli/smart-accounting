/**
 * TestPageV2.jsx - Simple test page
 */

import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const TestPageV2 = () => {
  return (
    <Container>
      <Box sx={{ padding: 4 }}>
        <Typography variant="h3" gutterBottom>
          V2 Test Page Working! 🎉
        </Typography>
        <Typography variant="body1">
          This page is working correctly. The v2 components should work too.
        </Typography>
      </Box>
    </Container>
  );
};

export default TestPageV2;
