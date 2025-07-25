/**
 * ReceiptStatusChip - Status Chip Component
 * Status display chip for receipts
 */

import React from 'react';
import { Chip } from '@mui/material';

const ReceiptStatusChip = ({ status, size = 'small' }) => {
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'processed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <Chip
      label={status || 'Unknown'}
      color={getStatusColor(status)}
      size={size}
    />
  );
};

export default ReceiptStatusChip;
