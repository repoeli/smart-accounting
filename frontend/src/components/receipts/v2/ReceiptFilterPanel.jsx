/**
 * ReceiptFilterPanel - Filter Component
 * Basic filter panel for receipts
 */

import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  MenuItem,
  Grid,
  Button
} from '@mui/material';
import { FilterList as FilterIcon } from '@mui/icons-material';

const ReceiptFilterPanel = ({ filters, onFilterChange, onReset }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          <FilterIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Filter Receipts
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Status"
              value={filters?.status || ''}
              onChange={(e) => onFilterChange?.({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="failed">Failed</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Type"
              value={filters?.type || ''}
              onChange={(e) => onFilterChange?.({ ...filters, type: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="income">Income</MenuItem>
            </TextField>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              label="Vendor"
              value={filters?.vendor || ''}
              onChange={(e) => onFilterChange?.({ ...filters, vendor: e.target.value })}
              placeholder="Search vendor..."
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onReset}
              sx={{ height: '56px' }}
            >
              Reset Filters
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default ReceiptFilterPanel;