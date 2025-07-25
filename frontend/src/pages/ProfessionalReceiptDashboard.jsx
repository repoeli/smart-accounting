/**
 * Professional Receipt Management Dashboard
 * Inspired by financial trading interface with professional UI/UX
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Avatar,
  Divider,
  Card,
  CardContent,
  Drawer,
  Toolbar,
  AppBar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Badge,
  Pagination,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tab,
  Tabs,
  LinearProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Search,
  FilterList,
  Add,
  Receipt as ReceiptIcon,
  Upload,
  Edit,
  Delete,
  Visibility,
  Category,
  TrendingUp,
  TrendingDown,
  AttachMoney,
  DateRange,
  Business,
  Close,
  Save,
  CloudUpload,
  CameraAlt,
  PhotoCamera,
  Image as ImageIcon,
  FileUpload,
  Analytics,
  PieChart,
  BarChart,
  Timeline
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import { format, parseISO, isValid } from 'date-fns';
import receiptService from '../services/api/receiptService';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 280;
const DETAIL_PANEL_WIDTH = 400;

// Professional color scheme inspired by financial dashboards
const theme = {
  primary: '#1976d2',
  secondary: '#f50057',
  success: '#4caf50',
  warning: '#ff9800',
  error: '#f44336',
  info: '#2196f3',
  background: '#fafafa',
  surface: '#ffffff',
  onSurface: '#212121',
  neutral: '#9e9e9e'
};

const ProfessionalReceiptDashboard = () => {
  const { user } = useAuth();
  
  // State management
  const [receipts, setReceipts] = useState([]);
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [showIncome, setShowIncome] = useState(true);
  const [showExpense, setShowExpense] = useState(true);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [uploadPanelOpen, setUploadPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const itemsPerPage = 12;

  // Categories for expense/income tracking
  const categories = [
    { value: 'food', label: 'Food & Dining', icon: '🍽️', type: 'expense' },
    { value: 'transport', label: 'Transportation', icon: '🚗', type: 'expense' },
    { value: 'shopping', label: 'Shopping', icon: '🛒', type: 'expense' },
    { value: 'utilities', label: 'Utilities', icon: '⚡', type: 'expense' },
    { value: 'healthcare', label: 'Healthcare', icon: '🏥', type: 'expense' },
    { value: 'entertainment', label: 'Entertainment', icon: '🎬', type: 'expense' },
    { value: 'business', label: 'Business', icon: '💼', type: 'expense' },
    { value: 'income', label: 'Income', icon: '💰', type: 'income' },
    { value: 'refund', label: 'Refund', icon: '↩️', type: 'income' }
  ];

  // Load receipts
  const loadReceipts = useCallback(async () => {
    try {
      setLoading(true);
      const response = await receiptService.getReceipts({ page_size: 1000 });
      const data = response.data || response;
      const receiptsArray = data.results || data || [];
      setReceipts(receiptsArray);
      setFilteredReceipts(receiptsArray);
    } catch (error) {
      console.error('Failed to load receipts:', error);
      showSnackbar('Failed to load receipts', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReceipts();
  }, [loadReceipts]);

  // Filter and search functionality
  useEffect(() => {
    let filtered = [...receipts];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(receipt =>
        (receipt.extracted_data?.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receipt.extracted_data?.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (receipt.original_filename || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (filterCategory !== 'all') {
      filtered = filtered.filter(receipt =>
        receipt.extracted_data?.category === filterCategory
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(receipt =>
        receipt.ocr_status === filterStatus
      );
    }

    // Income/Expense filter
    filtered = filtered.filter(receipt => {
      const category = categories.find(cat => cat.value === receipt.extracted_data?.category);
      const isIncome = category?.type === 'income';
      return (isIncome && showIncome) || (!isIncome && showExpense);
    });

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      switch (sortBy) {
        case 'amount':
          aValue = parseFloat(a.extracted_data?.total_amount || 0);
          bValue = parseFloat(b.extracted_data?.total_amount || 0);
          break;
        case 'vendor':
          aValue = a.extracted_data?.vendor || '';
          bValue = b.extracted_data?.vendor || '';
          break;
        default:
          aValue = new Date(a.uploaded_at || a.created_at);
          bValue = new Date(b.uploaded_at || b.created_at);
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredReceipts(filtered);
    setCurrentPage(1);
  }, [receipts, searchTerm, filterCategory, filterStatus, filterDateRange, sortBy, sortOrder, showIncome, showExpense]);

  // Cleanup camera stream when component unmounts
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Pagination
  const totalPages = Math.ceil(filteredReceipts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedReceipts = filteredReceipts.slice(startIndex, startIndex + itemsPerPage);

  // Upload functionality
  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    try {
      for (const file of acceptedFiles) {
        const formData = new FormData();
        formData.append('image', file);
        
        await receiptService.uploadReceipt(formData);
      }
      
      showSnackbar(`Successfully uploaded ${acceptedFiles.length} receipt(s)`, 'success');
      loadReceipts();
      setUploadPanelOpen(false);
    } catch (error) {
      console.error('Upload failed:', error);
      showSnackbar('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }, [loadReceipts]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    multiple: true
  });

  // Camera capture functionality
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Try to use back camera on mobile
      });
      setCameraStream(stream);
      setCameraOpen(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      showSnackbar('Camera access denied or not available', 'error');
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraOpen(false);
    setCapturedImage(null);
  };

  const captureImage = () => {
    const video = document.getElementById('camera-video');
    const canvas = document.getElementById('camera-canvas');
    const context = canvas.getContext('2d');
    
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Convert canvas to blob
      canvas.toBlob(async (blob) => {
        if (blob) {
          setCapturedImage(blob);
          
          // Upload the captured image
          const formData = new FormData();
          formData.append('image', blob, 'camera-capture.jpg');
          
          setUploading(true);
          try {
            await receiptService.uploadReceipt(formData);
            showSnackbar('Receipt captured and uploaded successfully', 'success');
            loadReceipts();
            stopCamera();
            setUploadPanelOpen(false);
          } catch (error) {
            console.error('Upload failed:', error);
            showSnackbar('Upload failed', 'error');
          } finally {
            setUploading(false);
          }
        }
      }, 'image/jpeg', 0.9);
    }
  };

  // Helper functions
  const showSnackbar = (message, severity = 'info') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleReceiptSelect = (receipt) => {
    setSelectedReceipt(receipt);
    setDetailPanelOpen(true);
  };

  const handleReceiptUpdate = async (receiptId, updateData) => {
    try {
      // If updating extracted_data, use the specialized endpoint
      if (updateData.extracted_data) {
        await receiptService.updateExtractedData(receiptId, updateData.extracted_data);
      } else {
        // For other updates, use the general update method
        await receiptService.updateReceipt(receiptId, updateData);
      }
      showSnackbar('Receipt updated successfully', 'success');
      loadReceipts();
    } catch (error) {
      console.error('Update failed:', error);
      showSnackbar(`Update failed: ${error.message}`, 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return theme.success;
      case 'processing': return theme.warning;
      case 'failed': return theme.error;
      default: return theme.neutral;
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return categories.find(cat => cat.value === categoryValue) || 
           { label: 'Uncategorized', icon: '📄', type: 'expense' };
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    if (!amount || isNaN(amount)) return '£0.00';
    
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  // Helper function to get amount from receipt data
  const getReceiptAmount = (receipt) => {
    if (!receipt.extracted_data) return 0;
    
    // Try multiple possible fields for amount
    return receipt.extracted_data.total_amount || 
           receipt.extracted_data.total || 
           receipt.extracted_data.amount || 
           receipt.total_amount || 
           0;
  };

  const calculateSummary = () => {
    const summary = filteredReceipts.reduce((acc, receipt) => {
      const amount = parseFloat(getReceiptAmount(receipt));
      const category = getCategoryInfo(receipt.extracted_data?.category);
      
      if (category.type === 'income') {
        acc.totalIncome += amount;
      } else {
        acc.totalExpense += amount;
      }
      acc.totalReceipts++;
      return acc;
    }, { totalIncome: 0, totalExpense: 0, totalReceipts: 0 });

    summary.netAmount = summary.totalIncome - summary.totalExpense;
    return summary;
  };

  const summary = calculateSummary();

  return (
    <Box sx={{ display: 'flex', height: '100vh', bgcolor: theme.background }}>
      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: `calc(100% - ${DRAWER_WIDTH}px)` }}>
        {/* Header */}
        <Paper elevation={1} sx={{ p: 3, mb: 3, bgcolor: theme.surface }}>
          <Grid container spacing={3} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h4" fontWeight="bold" color={theme.onSurface}>
                Receipt Management
              </Typography>
              <Typography variant="body1" color={theme.neutral}>
                Professional expense & income tracking
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Grid container spacing={2} justifyContent="flex-end">
                <Grid item>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h6" color={theme.success}>
                        {formatCurrency(summary.totalIncome)}
                      </Typography>
                      <Typography variant="caption" color={theme.neutral}>
                        Total Income
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h6" color={theme.error}>
                        {formatCurrency(summary.totalExpense)}
                      </Typography>
                      <Typography variant="caption" color={theme.neutral}>
                        Total Expense
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography 
                        variant="h6" 
                        color={summary.netAmount >= 0 ? theme.success : theme.error}
                      >
                        {formatCurrency(summary.netAmount)}
                      </Typography>
                      <Typography variant="caption" color={theme.neutral}>
                        Net Amount
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </Paper>

        {/* Filters and Actions */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search receipts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="all">All Categories</MenuItem>
                  {categories.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Sort By</InputLabel>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  label="Sort By"
                >
                  <MenuItem value="date">Date</MenuItem>
                  <MenuItem value="amount">Amount</MenuItem>
                  <MenuItem value="vendor">Vendor</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="contained"
                startIcon={<Upload />}
                onClick={() => setUploadPanelOpen(true)}
                sx={{ bgcolor: theme.primary }}
              >
                Upload
              </Button>
            </Grid>
            <Grid item xs={6} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={() => {
                  setUploadPanelOpen(true);
                  // Small delay to ensure panel is open before starting camera
                  setTimeout(() => startCamera(), 100);
                }}
                sx={{ 
                  borderColor: theme.primary,
                  color: theme.primary,
                  '&:hover': {
                    borderColor: theme.primary,
                    bgcolor: `${theme.primary}10`
                  }
                }}
              >
                Capture
              </Button>
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={showIncome}
                  onChange={(e) => setShowIncome(e.target.checked)}
                  color="success"
                />
              }
              label="Show Income"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showExpense}
                  onChange={(e) => setShowExpense(e.target.checked)}
                  color="error"
                />
              }
              label="Show Expenses"
            />
          </Box>
        </Paper>

        {/* Loading */}
        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {/* Receipt Grid */}
        <Grid container spacing={2}>
          {paginatedReceipts.map((receipt) => {
            const categoryInfo = getCategoryInfo(receipt.extracted_data?.category);
            const isIncome = categoryInfo.type === 'income';
            
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={receipt.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                  onClick={() => handleReceiptSelect(receipt)}
                >
                  {(receipt.image_info?.thumbnail_url || receipt.image_info?.display_url || receipt.image_info?.original_url || receipt.image) && (
                    <Box
                      component="img"
                      src={
                        receipt.image_info?.thumbnail_url || 
                        receipt.image_info?.display_url || 
                        receipt.image_info?.original_url || 
                        receipt.image
                      }
                      alt="Receipt"
                      sx={{
                        width: '100%',
                        height: 120,
                        objectFit: 'cover',
                        borderBottom: '1px solid #eee'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  )}
                  
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                        {receipt.extracted_data?.vendor || receipt.original_filename || `Receipt #${receipt.id}`}
                      </Typography>
                      <Chip
                        size="small"
                        label={receipt.ocr_status || 'unknown'}
                        sx={{
                          bgcolor: getStatusColor(receipt.ocr_status),
                          color: 'white',
                          fontSize: '0.7rem'
                        }}
                      />
                    </Box>

                    <Typography
                      variant="h6"
                      fontWeight="bold"
                      color={isIncome ? theme.success : theme.error}
                      sx={{ mb: 1 }}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(getReceiptAmount(receipt), receipt.extracted_data?.currency)}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body2" sx={{ mr: 0.5 }}>
                        {categoryInfo.icon}
                      </Typography>
                      <Typography variant="caption" color={theme.neutral}>
                        {categoryInfo.label}
                      </Typography>
                    </Box>

                    <Typography variant="caption" color={theme.neutral}>
                      {receipt.uploaded_at ? 
                        format(new Date(receipt.uploaded_at), 'MMM dd, yyyy') : 
                        receipt.created_at ? 
                        format(new Date(receipt.created_at), 'MMM dd, yyyy') : 
                        'No date'
                      }
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={(event, value) => setCurrentPage(value)}
              color="primary"
              size="large"
            />
          </Box>
        )}

        {/* Empty State */}
        {filteredReceipts.length === 0 && !loading && (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <ReceiptIcon sx={{ fontSize: 64, color: theme.neutral, mb: 2 }} />
            <Typography variant="h6" color={theme.neutral} gutterBottom>
              No receipts found
            </Typography>
            <Typography variant="body2" color={theme.neutral} paragraph>
              {searchTerm || filterCategory !== 'all' || filterStatus !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first receipt to get started'
              }
            </Typography>
            <Button
              variant="contained"
              startIcon={<Upload />}
              onClick={() => setUploadPanelOpen(true)}
              sx={{ bgcolor: theme.primary }}
            >
              Upload Receipt
            </Button>
          </Paper>
        )}
      </Box>

      {/* Upload Panel */}
      <Drawer
        anchor="right"
        open={uploadPanelOpen}
        onClose={() => setUploadPanelOpen(false)}
      >
        <Box sx={{ width: DETAIL_PANEL_WIDTH, p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" fontWeight="bold">
              Upload Receipts
            </Typography>
            <IconButton onClick={() => setUploadPanelOpen(false)}>
              <Close />
            </IconButton>
          </Box>

          <Paper
            {...getRootProps()}
            sx={{
              p: 6,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: isDragActive ? theme.primary : theme.neutral,
              bgcolor: isDragActive ? `${theme.primary}10` : 'transparent',
              cursor: 'pointer',
              mb: 3
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: theme.primary, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop files here' : 'Drag & drop receipts'}
            </Typography>
            <Typography variant="body2" color={theme.neutral}>
              or click to select files
            </Typography>
          </Paper>

          {uploading && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress />
              <Typography variant="body2" sx={{ mt: 1, textAlign: 'center' }}>
                Processing receipts with AI...
              </Typography>
            </Box>
          )}

          <Alert severity="info" sx={{ mb: 2 }}>
            Supported formats: JPG, PNG, GIF, BMP, WebP
          </Alert>

          {/* Camera Capture Button */}
          <Button
            variant="outlined"
            fullWidth
            startIcon={<PhotoCamera />}
            onClick={startCamera}
            disabled={uploading}
            sx={{ mb: 2 }}
          >
            Capture with Camera
          </Button>

          {/* Camera Interface */}
          {cameraOpen && (
            <Box sx={{ mb: 2 }}>
              <Paper sx={{ p: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Camera Capture
                </Typography>
                <Box sx={{ position: 'relative', mb: 2 }}>
                  <video
                    id="camera-video"
                    ref={(video) => {
                      if (video && cameraStream) {
                        video.srcObject = cameraStream;
                        video.play();
                      }
                    }}
                    style={{
                      width: '100%',
                      maxWidth: '300px',
                      height: 'auto',
                      borderRadius: '8px'
                    }}
                    playsInline
                    muted
                  />
                  <canvas
                    id="camera-canvas"
                    style={{ display: 'none' }}
                  />
                </Box>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    onClick={captureImage}
                    startIcon={<CameraAlt />}
                    disabled={uploading}
                  >
                    Capture
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={stopCamera}
                    startIcon={<Close />}
                  >
                    Cancel
                  </Button>
                </Box>
              </Paper>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Detail Panel */}
      <Drawer
        anchor="right"
        open={detailPanelOpen}
        onClose={() => setDetailPanelOpen(false)}
      >
        <Box sx={{ width: DETAIL_PANEL_WIDTH }}>
          {selectedReceipt && (
            <ReceiptDetailPanel
              receipt={selectedReceipt}
              categories={categories}
              onClose={() => setDetailPanelOpen(false)}
              onUpdate={handleReceiptUpdate}
              theme={theme}
            />
          )}
        </Box>
      </Drawer>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// Separate component for receipt detail panel
const ReceiptDetailPanel = ({ receipt, categories, onClose, onUpdate, theme }) => {
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    vendor: receipt.extracted_data?.vendor || '',
    total_amount: receipt.extracted_data?.total_amount || receipt.extracted_data?.total || receipt.extracted_data?.amount || '',
    category: receipt.extracted_data?.category || '',
    date: receipt.extracted_data?.date || '',
    description: receipt.extracted_data?.description || '',
    currency: receipt.extracted_data?.currency || 'GBP'
  });

  const categoryInfo = categories.find(cat => cat.value === editData.category) || 
                      { label: 'Uncategorized', icon: '📄', type: 'expense' };

  const handleSave = async () => {
    try {
      // Convert frontend field names to backend expected names
      const backendData = {
        vendor: editData.vendor,
        total: editData.total_amount, // Backend expects 'total', not 'total_amount'
        type: editData.category === 'income' || editData.category === 'refund' ? 'income' : 'expense', // Convert category to type
        date: editData.date,
        currency: editData.currency
        // Note: 'category' is not processed by backend, only 'type' 
        // Backend only processes: ['vendor', 'date', 'total', 'tax', 'type', 'currency']
      };
      
      console.log('🔍 Frontend DEBUG: Original editData:', editData);
      console.log('🔍 Frontend DEBUG: Sending to backend:', backendData);
      
      await onUpdate(receipt.id, { extracted_data: backendData });
      setEditMode(false);
      
      console.log('🔍 Frontend DEBUG: Update completed successfully');
    } catch (error) {
      console.error('🔍 Frontend DEBUG: Failed to update receipt:', error);
    }
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    if (!amount || isNaN(amount)) return '£0.00';
    
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency === 'USD' ? 'USD' : 'GBP',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(parseFloat(amount));
  };

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            Receipt Details
          </Typography>
          <Box>
            {editMode ? (
              <>
                <IconButton onClick={() => setEditMode(false)} size="small">
                  <Close />
                </IconButton>
                <IconButton onClick={handleSave} size="small" color="primary">
                  <Save />
                </IconButton>
              </>
            ) : (
              <IconButton onClick={() => setEditMode(true)} size="small">
                <Edit />
              </IconButton>
            )}
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </Paper>

      {/* Content */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 3 }}>
        <Grid container spacing={3}>
          {/* Left Side - Receipt Image */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 2, height: 'fit-content', position: 'sticky', top: 0 }}>
              <Typography variant="subtitle2" gutterBottom fontWeight="bold">
                Receipt Image
              </Typography>
              {receipt.image_info?.display_url || receipt.file ? (
                <Box
                  sx={{
                    position: 'relative',
                    width: '100%',
                    maxHeight: '600px',
                    overflow: 'hidden',
                    borderRadius: 1,
                    border: '1px solid #eee',
                    backgroundColor: '#f5f5f5'
                  }}
                >
                  <Box
                    component="img"
                    src={receipt.image_info?.display_url || `http://localhost:8000${receipt.file}`}
                    alt={receipt.original_filename || 'Receipt'}
                    sx={{
                      width: '100%',
                      height: 'auto',
                      maxHeight: '580px',
                      objectFit: 'contain',
                      display: 'block'
                    }}
                    onLoad={(e) => {
                      console.log('✅ Image loaded successfully:', e.target.src);
                      console.log('📋 Image info:', receipt.image_info);
                    }}
                    onError={(e) => {
                      console.error('❌ Failed to load image:', e.target.src);
                      console.log('📋 Receipt data:', receipt);
                      console.log('🖼️  Receipt.file:', receipt.file);
                      console.log('☁️  Image info:', receipt.image_info);
                      
                      // Try fallback URL if available
                      const fallbackUrl = receipt.image_info?.original_url || (receipt.file ? `http://localhost:8000${receipt.file}` : null);
                      if (fallbackUrl && e.target.src !== fallbackUrl) {
                        console.log('🔄 Trying fallback URL:', fallbackUrl);
                        e.target.src = fallbackUrl;
                        return;
                      }
                      
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                  <Box
                    sx={{
                      display: 'none',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '200px',
                      color: 'text.secondary',
                      flexDirection: 'column',
                      gap: 1
                    }}
                  >
                    <ReceiptIcon fontSize="large" />
                    <Typography variant="body2">
                      Image not available
                    </Typography>
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '200px',
                    bgcolor: '#f5f5f5',
                    borderRadius: 1,
                    border: '1px solid #eee',
                    color: 'text.secondary',
                    flexDirection: 'column',
                    gap: 1
                  }}
                >
                  <ReceiptIcon fontSize="large" />
                  <Typography variant="body2">
                    No image available
                  </Typography>
                </Box>
              )}
              
              {/* File Info */}
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>File:</strong> {receipt.original_filename}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  <strong>Uploaded:</strong> {new Date(receipt.uploaded_at).toLocaleDateString()}
                </Typography>
                {receipt.image_info?.has_cloudinary && (
                  <>
                    <Typography variant="caption" color="primary.main" display="block">
                      <strong>Storage:</strong> Cloudinary (Optimized)
                    </Typography>
                    {receipt.image_info.width && receipt.image_info.height && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>Dimensions:</strong> {receipt.image_info.width} × {receipt.image_info.height}
                      </Typography>
                    )}
                    {receipt.image_info.size_bytes && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        <strong>Size:</strong> {(receipt.image_info.size_bytes / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    )}
                  </>
                )}
                {!receipt.image_info?.has_cloudinary && receipt.image_info?.has_local && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    <strong>Storage:</strong> Local
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* Right Side - Receipt Details */}
          <Grid item xs={12} md={7}>
            {/* Basic Information */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Basic Information
              </Typography>
          
          {editMode ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                label="Vendor"
                value={editData.vendor}
                onChange={(e) => setEditData({ ...editData, vendor: e.target.value })}
                fullWidth
                size="small"
              />
              <TextField
                label="Amount"
                value={editData.total_amount}
                onChange={(e) => setEditData({ ...editData, total_amount: e.target.value })}
                fullWidth
                size="small"
                type="number"
                InputProps={{
                  startAdornment: <InputAdornment position="start">{editData.currency === 'USD' ? '$' : '£'}</InputAdornment>,
                }}
              />
              <FormControl fullWidth size="small">
                <InputLabel>Currency</InputLabel>
                <Select
                  value={editData.currency}
                  onChange={(e) => setEditData({ ...editData, currency: e.target.value })}
                  label="Currency"
                >
                  <MenuItem value="GBP">£ GBP</MenuItem>
                  <MenuItem value="USD">$ USD</MenuItem>
                  <MenuItem value="EUR">€ EUR</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Category</InputLabel>
                <Select
                  value={editData.category}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  label="Category"
                >
                  {categories.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                label="Date"
                value={editData.date}
                onChange={(e) => setEditData({ ...editData, date: e.target.value })}
                fullWidth
                size="small"
                type="date"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Description"
                value={editData.description}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                fullWidth
                size="small"
                multiline
                rows={3}
              />
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color={theme.neutral}>Vendor</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {editData.vendor || 'Not specified'}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color={theme.neutral}>Amount</Typography>
                <Typography 
                  variant="h6" 
                  fontWeight="bold"
                  color={categoryInfo.type === 'income' ? theme.success : theme.error}
                >
                  {categoryInfo.type === 'income' ? '+' : '-'}{formatCurrency(editData.total_amount)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color={theme.neutral}>Category</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body1">{categoryInfo.icon}</Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {categoryInfo.label}
                  </Typography>
                  <Chip
                    size="small"
                    label={categoryInfo.type}
                    color={categoryInfo.type === 'income' ? 'success' : 'error'}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="body2" color={theme.neutral}>Date</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {editData.date ? 
                    (isValid(new Date(editData.date)) ? format(new Date(editData.date), 'PPP') : editData.date) : 
                    'Not specified'
                  }
                </Typography>
              </Box>
              {editData.description && (
                <Box>
                  <Typography variant="body2" color={theme.neutral}>Description</Typography>
                  <Typography variant="body1">{editData.description}</Typography>
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* Status Information */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
            Processing Status
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box>
              <Typography variant="body2" color={theme.neutral}>Status</Typography>
              <Chip
                label={receipt.ocr_status || 'unknown'}
                sx={{
                  bgcolor: receipt.ocr_status === 'completed' ? theme.success : 
                          receipt.ocr_status === 'processing' ? theme.warning : theme.error,
                  color: 'white'
                }}
              />
            </Box>
            <Box>
              <Typography variant="body2" color={theme.neutral}>Uploaded</Typography>
              <Typography variant="body1" fontWeight="medium">
                {receipt.uploaded_at ? 
                  format(new Date(receipt.uploaded_at), 'PPpp') : 
                  receipt.created_at ? 
                  format(new Date(receipt.created_at), 'PPpp') : 
                  'Unknown'
                }
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color={theme.neutral}>File Name</Typography>
              <Typography variant="body1" fontWeight="medium">
                {receipt.original_filename || 'Unknown'}
              </Typography>
            </Box>
          </Box>
        </Paper>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
};

export default ProfessionalReceiptDashboard;
