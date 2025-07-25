/**
 * ReceiptUploadZone - Upload Zone Component
 * Drag and drop upload zone
 */

import React from 'react';
import {
  Box,
  Typography,
  Paper
} from '@mui/material';
import { Upload } from '@mui/icons-material';

const ReceiptUploadZone = ({ onDrop, children }) => {
  return (
    <Paper
      sx={{
        p: 4,
        textAlign: 'center',
        border: '2px dashed',
        borderColor: 'grey.300',
        backgroundColor: 'grey.50'
      }}
    >
      <Upload sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
      <Typography variant="h6" gutterBottom>
        Drop files here
      </Typography>
      <Typography variant="body2" color="text.secondary">
        Or click to select files
      </Typography>
      {children}
    </Paper>
  );
};

export default ReceiptUploadZone;