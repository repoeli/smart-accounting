/**
 * Receipt Card Component
 * Displays individual receipt information in a compact, professional card format
 * Supports editing, categorization, and accessibility features
 */

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tooltip,
  Fade,
  useTheme
} from '@mui/material';
import {
  MoreVert as MoreIcon,
  Edit as EditIcon,
  Business as BusinessIcon,
  Person as PersonalIcon,
  Receipt as ReceiptIcon,
  CalendarToday as DateIcon,
  AttachMoney as MoneyIcon,
  Category as CategoryIcon
} from '@mui/icons-material';

const ReceiptCard = ({ 
  receipt, 
  onUpdate, 
  canEdit = true, 
  compact = false,
  showCategory = true,
  showBusinessType = true 
}) => {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({});
  const [updating, setUpdating] = useState(false);

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '£0.00';
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(Math.abs(num));
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  // Get category color
  const getCategoryColor = (category) => {
    if (!category) return 'default';
    
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes('income') || categoryLower.includes('revenue')) return 'success';
    if (categoryLower.includes('expense') || categoryLower.includes('cost')) return 'error';
    if (categoryLower.includes('food') || categoryLower.includes('meal')) return 'warning';
    if (categoryLower.includes('transport') || categoryLower.includes('travel')) return 'info';
    if (categoryLower.includes('office') || categoryLower.includes('supplies')) return 'primary';
    
    return 'secondary';
  };

  // Get receipt type color
  const getReceiptTypeColor = (type) => {
    switch (type?.toLowerCase()) {
      case 'income': return 'success';
      case 'expense': return 'error';
      default: return 'default';
    }
  };

  // Handle menu open
  const handleMenuOpen = (event) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  // Handle menu close
  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Handle edit dialog
  const handleEditOpen = () => {
    setEditData({
      merchant_name: receipt.merchant_name || '',
      total_amount: receipt.total_amount || '',
      category: receipt.category || '',
      receipt_type: receipt.receipt_type || 'expense',
      business_type: receipt.business_type || 'business',
      date_created: receipt.date_created ? receipt.date_created.split('T')[0] : '',
      notes: receipt.notes || ''
    });
    setEditDialogOpen(true);
    handleMenuClose();
  };

  // Handle edit save
  const handleEditSave = async () => {
    if (!onUpdate) return;
    
    setUpdating(true);
    try {
      await onUpdate(receipt.id, editData);
      setEditDialogOpen(false);
    } catch (error) {
      console.error('Error updating receipt:', error);
    } finally {
      setUpdating(false);
    }
  };

  // Handle quick category change
  const handleQuickCategoryChange = async (newCategory) => {
    if (!onUpdate) return;
    
    try {
      await onUpdate(receipt.id, { category: newCategory });
    } catch (error) {
      console.error('Error updating category:', error);
    }
    handleMenuClose();
  };

  // Handle business type toggle
  const handleBusinessTypeToggle = async () => {
    if (!onUpdate) return;
    
    const newBusinessType = receipt.business_type === 'business' ? 'personal' : 'business';
    try {
      await onUpdate(receipt.id, { business_type: newBusinessType });
    } catch (error) {
      console.error('Error updating business type:', error);
    }
    handleMenuClose();
  };

  return (
    <>
      <Fade in timeout={300}>
        <Card
          sx={{
            height: compact ? 'auto' : '100%',
            minHeight: compact ? 120 : 160,
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.2s ease-in-out',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-2px)',
              borderColor: 'primary.main'
            },
            cursor: 'pointer'
          }}
          role="article"
          aria-label={`Receipt from ${receipt.merchant_name || 'Unknown'} for ${formatCurrency(receipt.total_amount)}`}
        >
          <CardContent sx={{ 
            flex: 1, 
            p: compact ? 1.5 : 2,
            '&:last-child': { pb: compact ? 1.5 : 2 }
          }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography 
                  variant={compact ? "body2" : "subtitle1"} 
                  component="h3"
                  sx={{ 
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    mb: 0.5
                  }}
                >
                  {receipt.merchant_name || 'Unknown Merchant'}
                </Typography>
                
                <Typography 
                  variant={compact ? "body2" : "h6"} 
                  color="primary.main"
                  sx={{ fontWeight: 700 }}
                >
                  {formatCurrency(receipt.total_amount)}
                </Typography>
              </Box>
              
              {canEdit && (
                <IconButton
                  size="small"
                  onClick={handleMenuOpen}
                  sx={{ ml: 1, opacity: 0.7, '&:hover': { opacity: 1 } }}
                  aria-label="Receipt options"
                >
                  <MoreIcon fontSize="small" />
                </IconButton>
              )}
            </Box>

            {/* Metadata */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {/* Date */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <DateIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(receipt.date_created || receipt.created_at)}
                </Typography>
              </Box>

              {/* Category */}
              {showCategory && receipt.category && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                  <Chip
                    icon={<CategoryIcon />}
                    label={receipt.category}
                    size="small"
                    color={getCategoryColor(receipt.category)}
                    sx={{ fontSize: '0.7rem', height: 20 }}
                  />
                </Box>
              )}

              {/* Receipt Type & Business Type */}
              <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                {receipt.receipt_type && (
                  <Chip
                    label={receipt.receipt_type}
                    size="small"
                    color={getReceiptTypeColor(receipt.receipt_type)}
                    sx={{ fontSize: '0.65rem', height: 18, textTransform: 'capitalize' }}
                  />
                )}
                
                {showBusinessType && receipt.business_type && (
                  <Chip
                    icon={receipt.business_type === 'business' ? <BusinessIcon /> : <PersonalIcon />}
                    label={receipt.business_type}
                    size="small"
                    variant="outlined"
                    sx={{ fontSize: '0.65rem', height: 18, textTransform: 'capitalize' }}
                  />
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Fade>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleEditOpen}>
          <EditIcon sx={{ mr: 1, fontSize: 16 }} />
          Edit Receipt
        </MenuItem>
        <MenuItem onClick={handleBusinessTypeToggle}>
          {receipt.business_type === 'business' ? <PersonalIcon /> : <BusinessIcon />}
          <span style={{ marginLeft: 8 }}>
            Mark as {receipt.business_type === 'business' ? 'Personal' : 'Business'}
          </span>
        </MenuItem>
        <MenuItem onClick={() => handleQuickCategoryChange('Food & Dining')}>
          <CategoryIcon sx={{ mr: 1, fontSize: 16 }} />
          Food & Dining
        </MenuItem>
        <MenuItem onClick={() => handleQuickCategoryChange('Transportation')}>
          <CategoryIcon sx={{ mr: 1, fontSize: 16 }} />
          Transportation
        </MenuItem>
        <MenuItem onClick={() => handleQuickCategoryChange('Office Supplies')}>
          <CategoryIcon sx={{ mr: 1, fontSize: 16 }} />
          Office Supplies
        </MenuItem>
      </Menu>

      {/* Edit Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        aria-labelledby="edit-receipt-dialog"
      >
        <DialogTitle id="edit-receipt-dialog">
          Edit Receipt
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Merchant Name"
              value={editData.merchant_name || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, merchant_name: e.target.value }))}
              fullWidth
            />
            
            <TextField
              label="Amount"
              type="number"
              value={editData.total_amount || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, total_amount: e.target.value }))}
              fullWidth
              InputProps={{ startAdornment: '£' }}
            />
            
            <TextField
              label="Category"
              value={editData.category || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, category: e.target.value }))}
              fullWidth
            />
            
            <FormControl fullWidth>
              <InputLabel>Receipt Type</InputLabel>
              <Select
                value={editData.receipt_type || 'expense'}
                onChange={(e) => setEditData(prev => ({ ...prev, receipt_type: e.target.value }))}
                label="Receipt Type"
              >
                <MenuItem value="expense">Expense</MenuItem>
                <MenuItem value="income">Income</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Business Type</InputLabel>
              <Select
                value={editData.business_type || 'business'}
                onChange={(e) => setEditData(prev => ({ ...prev, business_type: e.target.value }))}
                label="Business Type"
              >
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="personal">Personal</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Date"
              type="date"
              value={editData.date_created || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, date_created: e.target.value }))}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            
            <TextField
              label="Notes"
              value={editData.notes || ''}
              onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditSave} 
            variant="contained"
            disabled={updating}
          >
            {updating ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ReceiptCard;
