/**
 * ReceiptPageV2Simple.jsx - Minimal v2 page for testing
 */

import React from 'react';
import { Container, Typography, Box } from '@mui/material';

const ReceiptPageV2Simple = () => {
  return (
    <Container>
      <Box sx={{ padding: 4 }}>
        <Typography variant="h3" gutterBottom>
          Receipt V2 Page - Minimal Version 🧾
        </Typography>
        <Typography variant="body1">
          This is a minimal version of the Receipt V2 page to test if the routing works.
        </Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>
          If this displays, then the issue is with the complex v2 components.
        </Typography>
      </Box>
    </Container>
  );
};

export default ReceiptPageV2Simple;
