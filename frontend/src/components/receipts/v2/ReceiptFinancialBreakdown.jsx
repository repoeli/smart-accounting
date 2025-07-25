/**
 * ReceiptFinancialBreakdown - Financial Information Component
 * Displays and allows editing of financial data
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Grid,
  Divider
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const ReceiptFinancialBreakdown = ({ receipt, onUpdate, editable = false }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    total: receipt?.extracted_data?.total || 0,
    tax: receipt?.extracted_data?.tax || 0,
    currency: receipt?.extracted_data?.currency || 'GBP'
  });

  const handleSave = async () => {
    try {
      await onUpdate(receipt.id, { extracted_data: { ...receipt.extracted_data, ...formData } });
      setEditing(false);
    } catch (error) {
      console.error('Failed to update receipt:', error);
    }
  };

  if (!receipt) {
    return (
      <Card>
        <CardContent>
          <Typography>No financial information available</Typography>
        </CardContent>
      </Card>
    );
  }

  const total = parseFloat(formData.total) || 0;
  const tax = parseFloat(formData.tax) || 0;
  const subtotal = total - tax;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Financial Breakdown
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Subtotal"
              value={editing ? subtotal.toFixed(2) : subtotal.toFixed(2)}
              disabled
              variant="filled"
              InputProps={{
                startAdornment: <Typography>£</Typography>
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Tax"
              value={editing ? formData.tax : receipt.extracted_data?.tax || 0}
              onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              variant={editing ? "outlined" : "filled"}
              type="number"
              inputProps={{ step: 0.01 }}
              InputProps={{
                startAdornment: <Typography>£</Typography>
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="Total"
              value={editing ? formData.total : receipt.extracted_data?.total || 0}
              onChange={(e) => setFormData({ ...formData, total: parseFloat(e.target.value) || 0 })}
              disabled={!editing}
              variant={editing ? "outlined" : "filled"}
              type="number"
              inputProps={{ step: 0.01 }}
              InputProps={{
                startAdornment: <Typography>£</Typography>
              }}
            />
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 2 }} />
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">
            Final Total: £{total.toFixed(2)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {receipt.extracted_data?.currency || 'GBP'}
          </Typography>
        </Box>
        
        {editable && (
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            {editing ? (
              <>
                <Button
                  variant="contained"
                  startIcon={<SaveIcon />}
                  onClick={handleSave}
                >
                  Save
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => setEditing(false)}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                variant="outlined"
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ReceiptFinancialBreakdown;