/**
 * ReceiptUploadV2 - Alternative Upload Component
 * Alternative upload interface
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

const ReceiptUploadV2 = ({ onUploadSuccess, onUploadError }) => {
  return (
    <Paper sx={{ p: 4, textAlign: 'center' }}>
      <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Alternative Upload Interface
      </Typography>
      <Typography variant="body2" color="text.secondary">
        This is an alternative upload component. Use EnhancedReceiptUpload for full functionality.
      </Typography>
    </Paper>
  );
};

export default ReceiptUploadV2;