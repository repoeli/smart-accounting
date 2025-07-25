/**
 * ReceiptList - Alternative Receipt List Component
 * Simple table-based receipt list
 */

import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Typography,
  Box
} from '@mui/material';
import { Visibility as ViewIcon } from '@mui/icons-material';

const ReceiptList = ({ receipts = [], onReceiptSelect }) => {
  if (!receipts || receipts.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography variant="h6" color="text.secondary">
          No receipts to display
        </Typography>
      </Box>
    );
  }

  return (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Vendor</TableCell>
            <TableCell>Amount</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {receipts.map((receipt) => (
            <TableRow key={receipt.id}>
              <TableCell>
                {receipt.extracted_data?.vendor || receipt.original_filename || `Receipt #${receipt.id}`}
              </TableCell>
              <TableCell>
                £{receipt.extracted_data?.total || '0.00'}
              </TableCell>
              <TableCell>
                {receipt.extracted_data?.date || 'Not extracted'}
              </TableCell>
              <TableCell>
                <Chip
                  label={receipt.ocr_status || 'unknown'}
                  color={receipt.ocr_status === 'completed' ? 'success' : receipt.ocr_status === 'failed' ? 'error' : 'warning'}
                  size="small"
                />
              </TableCell>
              <TableCell>
                <Button
                  size="small"
                  startIcon={<ViewIcon />}
                  onClick={() => onReceiptSelect?.(receipt)}
                >
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ReceiptList;