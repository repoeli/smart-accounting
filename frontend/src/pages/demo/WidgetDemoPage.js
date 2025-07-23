/**
 * Widget Demo Page
 * Demonstrates different configurations of the CategorizedReceiptsWidget
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Paper,
  Divider
} from '@mui/material';
import CategorizedReceiptsWidget from '../../components/dashboard/CategorizedReceiptsWidget';

function WidgetDemoPage() {
  const [demoConfig, setDemoConfig] = useState({
    userTier: 'premium',
    autoRefresh: true,
    refreshInterval: 5000,
    compact: false,
    receiptType: null,
    showSummary: true,
    showFilters: true,
    showExport: true
  });

  const handleConfigChange = (key, value) => {
    setDemoConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleReceiptUpdate = (receiptId, updateData) => {
    console.log('Demo: Receipt updated:', receiptId, updateData);
  };

  const handleExport = (receipts, filters) => {
    console.log('Demo: Export requested:', receipts.length, 'receipts');
    console.log('Demo: Applied filters:', filters);
  };

  return (
    <Box sx={{ p: 3, maxWidth: '1400px', mx: 'auto' }}>
      {/* Header */}
      <Typography variant="h4" component="h1" gutterBottom>
        Categorized Receipts Widget Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Interactive demonstration of the CategorizedReceiptsWidget with different configurations.
      </Typography>

      {/* Configuration Panel */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Widget Configuration
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 2 }}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>User Tier</InputLabel>
              <Select
                value={demoConfig.userTier}
                onChange={(e) => handleConfigChange('userTier', e.target.value)}
                label="User Tier"
              >
                <MenuItem value="basic">Basic</MenuItem>
                <MenuItem value="premium">Premium</MenuItem>
                <MenuItem value="enterprise">Enterprise</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Receipt Type</InputLabel>
              <Select
                value={demoConfig.receiptType || ''}
                onChange={(e) => handleConfigChange('receiptType', e.target.value || null)}
                label="Receipt Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="income">Income Only</MenuItem>
                <MenuItem value="expense">Expense Only</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Refresh Interval</InputLabel>
              <Select
                value={demoConfig.refreshInterval}
                onChange={(e) => handleConfigChange('refreshInterval', e.target.value)}
                label="Refresh Interval"
              >
                <MenuItem value={3000}>3 seconds</MenuItem>
                <MenuItem value={5000}>5 seconds</MenuItem>
                <MenuItem value={10000}>10 seconds</MenuItem>
                <MenuItem value={30000}>30 seconds</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={demoConfig.autoRefresh}
                    onChange={(e) => handleConfigChange('autoRefresh', e.target.checked)}
                    size="small"
                  />
                }
                label="Auto Refresh"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={demoConfig.compact}
                    onChange={(e) => handleConfigChange('compact', e.target.checked)}
                    size="small"
                  />
                }
                label="Compact Mode"
              />
            </Box>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid item xs={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={demoConfig.showSummary}
                  onChange={(e) => handleConfigChange('showSummary', e.target.checked)}
                  size="small"
                />
              }
              label="Show Summary"
            />
          </Grid>
          <Grid item xs={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={demoConfig.showFilters}
                  onChange={(e) => handleConfigChange('showFilters', e.target.checked)}
                  size="small"
                />
              }
              label="Show Filters"
            />
          </Grid>
          <Grid item xs={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={demoConfig.showExport}
                  onChange={(e) => handleConfigChange('showExport', e.target.checked)}
                  size="small"
                />
              }
              label="Show Export"
            />
          </Grid>
        </Grid>
      </Paper>

      <Divider sx={{ mb: 4 }} />

      {/* Single Full-Featured Widget */}
      <Typography variant="h5" gutterBottom>
        Full-Featured Widget
      </Typography>
      <Box sx={{ mb: 6 }}>
        <CategorizedReceiptsWidget
          title={`Receipts (${demoConfig.userTier} tier)`}
          receiptType={demoConfig.receiptType}
          autoRefresh={demoConfig.autoRefresh}
          refreshInterval={demoConfig.refreshInterval}
          compact={demoConfig.compact}
          maxHeight={600}
          showSummary={demoConfig.showSummary}
          showFilters={demoConfig.showFilters}
          showExport={demoConfig.showExport}
          showAddButton={true}
          userTier={demoConfig.userTier}
          canEdit={true}
          canFilter={true}
          canExport={true}
          gridCols={{ xs: 1, sm: 2, md: 3, lg: 4 }}
          onReceiptUpdate={handleReceiptUpdate}
          onExport={handleExport}
        />
      </Box>

      <Divider sx={{ mb: 4 }} />

      {/* Side-by-Side Compact Widgets */}
      <Typography variant="h5" gutterBottom>
        Compact Side-by-Side Widgets
      </Typography>
      <Grid container spacing={3} sx={{ mb: 6 }}>
        <Grid item xs={12} lg={6}>
          <CategorizedReceiptsWidget
            title="Recent Income"
            receiptType="income"
            autoRefresh={true}
            refreshInterval={10000}
            compact={true}
            maxHeight={400}
            showSummary={false}
            showFilters={false}
            showExport={false}
            showAddButton={false}
            userTier={demoConfig.userTier}
            gridCols={{ xs: 1, sm: 1, md: 1, lg: 1 }}
            onReceiptUpdate={handleReceiptUpdate}
          />
        </Grid>
        
        <Grid item xs={12} lg={6}>
          <CategorizedReceiptsWidget
            title="Recent Expenses"
            receiptType="expense"
            autoRefresh={true}
            refreshInterval={10000}
            compact={true}
            maxHeight={400}
            showSummary={false}
            showFilters={false}
            showExport={false}
            showAddButton={false}
            userTier={demoConfig.userTier}
            gridCols={{ xs: 1, sm: 1, md: 1, lg: 1 }}
            onReceiptUpdate={handleReceiptUpdate}
          />
        </Grid>
      </Grid>

      <Divider sx={{ mb: 4 }} />

      {/* Subscription Tier Comparison */}
      <Typography variant="h5" gutterBottom>
        Subscription Tier Comparison
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <CategorizedReceiptsWidget
            title="Basic Tier"
            receiptType={null}
            autoRefresh={false}
            compact={true}
            maxHeight={300}
            showSummary={false}
            showFilters={false}
            showExport={false}
            showAddButton={false}
            userTier="basic"
            canEdit={false}
            canFilter={false}
            canExport={false}
            gridCols={{ xs: 1, sm: 1, md: 1, lg: 1 }}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <CategorizedReceiptsWidget
            title="Premium Tier"
            receiptType={null}
            autoRefresh={true}
            refreshInterval={15000}
            compact={true}
            maxHeight={300}
            showSummary={true}
            showFilters={true}
            showExport={false}
            showAddButton={true}
            userTier="premium"
            canEdit={true}
            canFilter={true}
            canExport={false}
            gridCols={{ xs: 1, sm: 1, md: 1, lg: 1 }}
            onReceiptUpdate={handleReceiptUpdate}
          />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <CategorizedReceiptsWidget
            title="Enterprise Tier"
            receiptType={null}
            autoRefresh={true}
            refreshInterval={5000}
            compact={true}
            maxHeight={300}
            showSummary={true}
            showFilters={true}
            showExport={true}
            showAddButton={true}
            userTier="enterprise"
            canEdit={true}
            canFilter={true}
            canExport={true}
            gridCols={{ xs: 1, sm: 1, md: 1, lg: 1 }}
            onReceiptUpdate={handleReceiptUpdate}
            onExport={handleExport}
          />
        </Grid>
      </Grid>

      {/* Footer */}
      <Box sx={{ mt: 6, p: 3, backgroundColor: 'grey.50', borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom>
          Integration Notes
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • Widgets are completely self-contained and update independently
          • Real-time updates use polling mechanism (configurable interval)
          • Subscription tiers control feature availability automatically
          • All widgets respect authentication and user permissions
          • Check browser console for callback events and debugging info
        </Typography>
      </Box>
    </Box>
  );
}

export default WidgetDemoPage;
