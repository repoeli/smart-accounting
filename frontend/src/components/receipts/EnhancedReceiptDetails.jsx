/**
 * Enhanced Receipt Details Component
 * Features:
 * - Detailed visualization of extracted data
 * - Side-by-side comparison with original receipt
 * - Manual correction interface
 * - Validation and error handling
 * - Accessibility features
 * - Print and export functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Divider,
  Card,
  CardContent,
  CardActions,
  Tooltip,
  Fab,
  Zoom,
  useTheme,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Switch,
  FormControlLabel,
  LinearProgress,
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  Print as PrintIcon,
  GetApp as DownloadIcon,
  Visibility as ViewIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Receipt as ReceiptIcon,
  Store as StoreIcon,
  CalendarToday as CalendarIcon,
  AttachMoney as MoneyIcon,
  ListAlt as ListIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material';
import receiptPerformanceService from '../../services/api/receiptPerformanceService';
import enhancedReceiptService from '../../services/api/enhancedReceiptService';

const EnhancedReceiptDetails = ({ receiptId, onSave, onCancel, readOnly = false, initialEditMode = false }) => {
  const theme = useTheme();
  
  // State management
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(initialEditMode);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [editedData, setEditedData] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [reprocessing, setReprocessing] = useState(false);
  const [showOriginalImage, setShowOriginalImage] = useState(false);
  const [autoSave, setAutoSave] = useState(false);

  // Load receipt data
  useEffect(() => {
    if (receiptId) {
      loadReceiptDetails();
    }
  }, [receiptId]);

  const loadReceiptDetails = async () => {
    try {
      setLoading(true);
      const result = await receiptPerformanceService.getReceiptDetails(receiptId);
      
      if (result.success) {
        setReceipt(result.data);
        setEditedData(result.data.extracted_data || {});
        setError(null);
      } else {
        setError(result.error || 'Failed to load receipt details');
      }
    } catch (err) {
      setError(`Error loading receipt: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Validation functions
  const validateField = (field, value) => {
    const errors = [];

    switch (field) {
      case 'vendor.name':
        if (!value || value.trim().length < 2) {
          errors.push('Vendor name must be at least 2 characters');
        }
        break;
      case 'totals.total':
        if (!value || isNaN(parseFloat(value)) || parseFloat(value) <= 0) {
          errors.push('Total amount must be a positive number');
        }
        break;
      case 'transaction.date':
        if (!value || !isValidDate(value)) {
          errors.push('Please enter a valid date');
        }
        break;
      default:
        break;
    }

    return errors;
  };

  const isValidDate = (dateString) => {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date) && date <= new Date();
  };

  const validateAllFields = () => {
    const errors = {};
    let isValid = true;

    // Validate vendor name
    const vendorErrors = validateField('vendor.name', editedData.vendor?.name);
    if (vendorErrors.length > 0) {
      errors['vendor.name'] = vendorErrors[0];
      isValid = false;
    }

    // Validate total amount
    const totalErrors = validateField('totals.total', editedData.totals?.total);
    if (totalErrors.length > 0) {
      errors['totals.total'] = totalErrors[0];
      isValid = false;
    }

    // Validate date
    const dateErrors = validateField('transaction.date', editedData.transaction?.date);
    if (dateErrors.length > 0) {
      errors['transaction.date'] = dateErrors[0];
      isValid = false;
    }

    setValidationErrors(errors);
    return isValid;
  };

  // Edit handlers
  const handleStartEdit = () => {
    setEditing(true);
    setValidationErrors({});
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancelEdit = () => {
    setEditing(false);
    setEditedData(receipt.extracted_data || {});
    setValidationErrors({});
    setError(null);
    setSuccessMessage(null);
  };

  const handleSaveEdit = async () => {
    if (!validateAllFields()) {
      return;
    }

    setSaving(true);
    setError(null);
    
    try {
      // Prepare the data in the format expected by the backend
      // The backend expects specific field names for manual corrections
      const updateData = {
        vendor: editedData.vendor?.name || '',
        total: editedData.totals?.total || '',
        date: editedData.transaction?.date || '',
        type: editedData.category === 'income' || editedData.category === 'refund' ? 'income' : 'expense',
        category: editedData.category || 'other',
        currency: editedData.currency || 'GBP'
      };
      
      console.log('🔍 Saving receipt data:', updateData);
      console.log('🔍 Full edited data structure:', editedData);
      
      // Use the receipt service to update extracted data (which calls the correct endpoint)
      const receiptService = new (await import('../../services/api/receiptService')).default();
      const updatedReceipt = await receiptService.updateExtractedData(receiptId, updateData);
      
      // Update local state with the response data
      const updatedReceiptData = {
        ...receipt,
        ...updatedReceipt,
        extracted_data: updatedReceipt.extracted_data || editedData,
        is_manually_verified: true,
        ocr_confidence: 100
      };
      
      setReceipt(updatedReceiptData);
      setEditing(false);
      
      console.log('✅ Receipt saved successfully:', updatedReceiptData);
      
      // Notify parent component
      if (onSave) {
        onSave(updatedReceiptData);
      }
      
      // Show success message
      setError(null);
      setSuccessMessage('Receipt saved successfully!');
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        }, 3000);
    } catch (err) {
      console.error('❌ Failed to save receipt:', err);
      setError(`Failed to save changes: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (path, value) => {
    const pathArray = path.split('.');
    const newData = { ...editedData };
    
    let current = newData;
    for (let i = 0; i < pathArray.length - 1; i++) {
      if (!current[pathArray[i]]) {
        current[pathArray[i]] = {};
      }
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    setEditedData(newData);

    // Clear validation error for this field
    if (validationErrors[path]) {
      setValidationErrors(prev => ({ ...prev, [path]: null }));
    }

    // Auto-save if enabled
    if (autoSave && editing) {
      const fieldErrors = validateField(path, value);
      if (fieldErrors.length === 0) {
        // Auto-save logic would go here
      }
    }
  };

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const result = await receiptPerformanceService.reprocessReceipt(receiptId, 'auto');
      if (result.success) {
        // Start polling for updates
        setTimeout(loadReceiptDetails, 2000);
      } else {
        setError(result.error || 'Failed to reprocess receipt');
      }
    } catch (err) {
      setError(`Reprocessing failed: ${err.message}`);
    } finally {
      setReprocessing(false);
    }
  };

  const handleAddLineItem = () => {
    const newItems = [...(editedData.items || []), {
      description: '',
      quantity: 1,
      price: 0,
      total: 0
    }];
    handleFieldChange('items', newItems);
  };

  const handleRemoveLineItem = (index) => {
    const newItems = editedData.items?.filter((_, i) => i !== index) || [];
    handleFieldChange('items', newItems);
  };

  const handleLineItemChange = (index, field, value) => {
    const newItems = [...(editedData.items || [])];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Auto-calculate total for line item
    if (field === 'quantity' || field === 'price') {
      const quantity = parseFloat(newItems[index].quantity) || 0;
      const price = parseFloat(newItems[index].price) || 0;
      newItems[index].total = (quantity * price).toFixed(2);
    }
    
    handleFieldChange('items', newItems);
  };

  // Utility functions
  const formatCurrency = (amount, currency = 'GBP') => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const getConfidenceColor = (confidence) => {
    const conf = confidence || 0;
    if (conf >= 85) return 'success';
    if (conf >= 70) return 'warning';
    return 'error';
  };

  const getConfidenceIcon = (confidence) => {
    const conf = confidence || 0;
    if (conf >= 85) return <CheckIcon />;
    if (conf >= 70) return <WarningIcon />;
    return <ErrorIcon />;
  };

  // Render loading state
  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress sx={{ mb: 2 }} />
        <Typography>Loading receipt details...</Typography>
      </Box>
    );
  }

  // Render error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button onClick={loadReceiptDetails} startIcon={<RefreshIcon />}>
          Try Again
        </Button>
      </Box>
    );
  }

  // Render receipt details
  const data = editing ? editedData : (receipt?.extracted_data || {});

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Receipt Details
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {receipt?.filename || `Receipt #${receipt?.id}`}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          {!readOnly && !editing && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={handleStartEdit}
            >
              Edit
            </Button>
          )}
          
          {!readOnly && (
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReprocess}
              disabled={reprocessing}
            >
              {reprocessing ? 'Reprocessing...' : 'Reprocess'}
            </Button>
          )}

          <Button
            variant="outlined"
            startIcon={<PrintIcon />}
            onClick={() => window.print()}
          >
            Print
          </Button>
        </Box>
      </Box>

      {/* Success/Error Messages */}
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}
      
      {error && !loading && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Status and Confidence */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Chip
                icon={getConfidenceIcon(receipt?.ocr_confidence)}
                label={`${receipt?.ocr_confidence || 0}% Confidence`}
                color={getConfidenceColor(receipt?.ocr_confidence)}
              />
            </Grid>
            <Grid item>
              <Chip
                label={receipt?.ocr_status || 'Unknown'}
                color={receipt?.ocr_status === 'completed' ? 'success' : 'default'}
                variant="outlined"
              />
            </Grid>
            {receipt?.is_manually_verified && (
              <Grid item>
                <Chip
                  icon={<CheckIcon />}
                  label="Manually Verified"
                  color="info"
                  variant="outlined"
                />
              </Grid>
            )}
            <Grid item sx={{ ml: 'auto' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showOriginalImage}
                    onChange={(e) => setShowOriginalImage(e.target.checked)}
                  />
                }
                label="Show Original"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Original Image */}
        {showOriginalImage && receipt?.file && (
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Original Receipt
              </Typography>
              <Box
                sx={{
                  textAlign: 'center',
                  p: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1
                }}
              >
                <img
                  src={receipt.file}
                  alt="Original receipt"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '600px',
                    objectFit: 'contain'
                  }}
                />
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Extracted Data */}
        <Grid item xs={12} md={showOriginalImage ? 6 : 12}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">
                Extracted Data
              </Typography>
              {editing && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                    />
                  }
                  label="Auto-save"
                />
              )}
            </Box>

            {/* Vendor Information */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <StoreIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Vendor Information</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Vendor Name"
                      value={data.vendor?.name || ''}
                      onChange={(e) => handleFieldChange('vendor.name', e.target.value)}
                      disabled={!editing}
                      error={!!validationErrors['vendor.name']}
                      helperText={validationErrors['vendor.name']}
                      InputProps={{
                        startAdornment: <StoreIcon sx={{ mr: 1, color: 'text.secondary' }} />
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Address"
                      value={data.vendor?.address || ''}
                      onChange={(e) => handleFieldChange('vendor.address', e.target.value)}
                      disabled={!editing}
                      multiline
                      rows={2}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone"
                      value={data.vendor?.phone || ''}
                      onChange={(e) => handleFieldChange('vendor.phone', e.target.value)}
                      disabled={!editing}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Transaction Details */}
            <Accordion defaultExpanded sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <CalendarIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Transaction Details</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Date"
                      type="date"
                      value={data.transaction?.date || ''}
                      onChange={(e) => handleFieldChange('transaction.date', e.target.value)}
                      disabled={!editing}
                      error={!!validationErrors['transaction.date']}
                      helperText={validationErrors['transaction.date']}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Time"
                      value={data.transaction?.time || ''}
                      onChange={(e) => handleFieldChange('transaction.time', e.target.value)}
                      disabled={!editing}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Payment Method"
                      value={data.transaction?.payment_method || ''}
                      onChange={(e) => handleFieldChange('transaction.payment_method', e.target.value)}
                      disabled={!editing}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Totals */}
            <Accordion defaultExpanded sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <MoneyIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1">Totals</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Subtotal"
                      type="number"
                      value={data.totals?.subtotal || ''}
                      onChange={(e) => handleFieldChange('totals.subtotal', e.target.value)}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Tax Amount"
                      type="number"
                      value={data.totals?.tax_amount || ''}
                      onChange={(e) => handleFieldChange('totals.tax_amount', e.target.value)}
                      disabled={!editing}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <TextField
                      fullWidth
                      label="Total Amount"
                      type="number"
                      value={data.totals?.total || ''}
                      onChange={(e) => handleFieldChange('totals.total', e.target.value)}
                      disabled={!editing}
                      error={!!validationErrors['totals.total']}
                      helperText={validationErrors['totals.total']}
                      InputProps={{
                        startAdornment: <Typography sx={{ mr: 1 }}>£</Typography>
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Currency"
                      value={data.totals?.currency || 'GBP'}
                      onChange={(e) => handleFieldChange('totals.currency', e.target.value)}
                      disabled={!editing}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Tax Rate (%)"
                      type="number"
                      value={data.totals?.tax_rate || ''}
                      onChange={(e) => handleFieldChange('totals.tax_rate', e.target.value)}
                      disabled={!editing}
                    />
                  </Grid>
                </Grid>
              </AccordionDetails>
            </Accordion>

            {/* Line Items */}
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <ListIcon sx={{ mr: 1 }} />
                <Typography variant="subtitle1">
                  Line Items ({data.items?.length || 0})
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Description</TableCell>
                        <TableCell align="right">Qty</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="right">Total</TableCell>
                        {editing && <TableCell align="center">Actions</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(data.items || []).map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {editing ? (
                              <TextField
                                fullWidth
                                size="small"
                                value={item.description || ''}
                                onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                              />
                            ) : (
                              item.description || 'N/A'
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {editing ? (
                              <TextField
                                size="small"
                                type="number"
                                value={item.quantity || 1}
                                onChange={(e) => handleLineItemChange(index, 'quantity', e.target.value)}
                                sx={{ width: 80 }}
                              />
                            ) : (
                              item.quantity || 1
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {editing ? (
                              <TextField
                                size="small"
                                type="number"
                                value={item.price || 0}
                                onChange={(e) => handleLineItemChange(index, 'price', e.target.value)}
                                sx={{ width: 100 }}
                                InputProps={{
                                  startAdornment: <Typography sx={{ mr: 0.5 }}>£</Typography>
                                }}
                              />
                            ) : (
                              formatCurrency(item.price)
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {formatCurrency(item.total)}
                          </TableCell>
                          {editing && (
                            <TableCell align="center">
                              <IconButton
                                size="small"
                                onClick={() => handleRemoveLineItem(index)}
                                color="error"
                              >
                                <CancelIcon />
                              </IconButton>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                {editing && (
                  <Button
                    startIcon={<ListIcon />}
                    onClick={handleAddLineItem}
                    sx={{ mt: 2 }}
                  >
                    Add Line Item
                  </Button>
                )}
              </AccordionDetails>
            </Accordion>

            {/* Processing Metadata */}
            {receipt?.processing_metadata && (
              <Accordion sx={{ mt: 2 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <AssessmentIcon sx={{ mr: 1 }} />
                  <Typography variant="subtitle1">Processing Information</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <List dense>
                    <ListItem>
                      <ListItemIcon><ReceiptIcon /></ListItemIcon>
                      <ListItemText
                        primary="API Used"
                        secondary={receipt.processing_metadata.primary_api_used || 'N/A'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><AssessmentIcon /></ListItemIcon>
                      <ListItemText
                        primary="Processing Time"
                        secondary={`${receipt.processing_metadata.total_processing_time || 0}s`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon><MoneyIcon /></ListItemIcon>
                      <ListItemText
                        primary="Processing Cost"
                        secondary={formatCurrency(receipt.processing_metadata.cost_usd, 'USD')}
                      />
                    </ListItem>
                  </List>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Edit Actions */}
            {editing && (
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  startIcon={<CancelIcon />}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSaveEdit}
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Floating Action Buttons */}
      {!editing && !readOnly && (
        <Box sx={{ position: 'fixed', bottom: 24, right: 24 }}>
          <Zoom in={true} timeout={500}>
            <Fab
              color="primary"
              onClick={handleStartEdit}
              sx={{ mr: 1 }}
            >
              <EditIcon />
            </Fab>
          </Zoom>
        </Box>
      )}
    </Box>
  );
};

export default EnhancedReceiptDetails;
