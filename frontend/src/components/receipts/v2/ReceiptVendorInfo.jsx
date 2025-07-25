/**
 * ReceiptVendorInfo - Vendor Information Component
 * Displays and allows editing of vendor information
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Grid
} from '@mui/material';
import { Save as SaveIcon } from '@mui/icons-material';

const ReceiptVendorInfo = ({ receipt, onUpdate, editable = false, showCategories = false }) => {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    vendor: receipt?.extracted_data?.vendor || '',
    date: receipt?.extracted_data?.date || '',
    type: receipt?.extracted_data?.type || 'expense',
    category: receipt?.extracted_data?.category || 'other',
    currency: receipt?.extracted_data?.currency || 'GBP'
  });

  const handleSave = async () => {
    try {
      // Send the form data directly (not wrapped in extracted_data)
      // The backend expects: vendor, date, type, category, currency
      const updateData = {
        vendor: formData.vendor,
        date: formData.date,
        type: formData.type,
        category: formData.category, // This is the key field that was missing!
        currency: formData.currency
      };
      
      console.log('🔍 ReceiptVendorInfo: Form data:', formData);
      console.log('🔍 ReceiptVendorInfo: Sending update data:', updateData);
      console.log('🔍 ReceiptVendorInfo: Category value specifically:', formData.category);
      await onUpdate(receipt.id, updateData);
      setEditing(false);
    } catch (error) {
      console.error('Failed to update receipt:', error);
    }
  };

  if (!receipt) {
    return (
      <Card>
        <CardContent>
          <Typography>No vendor information available</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Vendor Information
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Vendor"
              value={editing ? formData.vendor : receipt.extracted_data?.vendor || ''}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              disabled={!editing}
              variant={editing ? "outlined" : "filled"}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Date"
              value={editing ? formData.date : receipt.extracted_data?.date || ''}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              disabled={!editing}
              variant={editing ? "outlined" : "filled"}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Type"
              value={editing ? formData.type : receipt.extracted_data?.type || 'expense'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={!editing}
              variant={editing ? "outlined" : "filled"}
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Currency"
              value={editing ? formData.currency : receipt.extracted_data?.currency || 'GBP'}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              disabled={!editing}
              variant={editing ? "outlined" : "filled"}
            />
          </Grid>
          
          {showCategories && (
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="Category"
                value={editing ? formData.category : receipt.extracted_data?.category || 'other'}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                disabled={!editing}
                variant={editing ? "outlined" : "filled"}
                SelectProps={{
                  native: true,
                }}
              >
                <option value="other">Other</option>
                <option value="food">Food & Dining</option>
                <option value="shopping">Shopping</option>
                <option value="transport">Transportation</option>
                <option value="utilities">Utilities</option>
                <option value="healthcare">Healthcare</option>
                <option value="entertainment">Entertainment</option>
                <option value="office">Office Supplies</option>
                <option value="travel">Travel</option>
                <option value="education">Education</option>
                <option value="insurance">Insurance</option>
                <option value="maintenance">Maintenance</option>
              </TextField>
            </Grid>
          )}
        </Grid>
        
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

export default ReceiptVendorInfo;