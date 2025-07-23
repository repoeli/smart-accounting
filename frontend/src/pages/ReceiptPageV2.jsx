/**
 * ReceiptPageV2.jsx - v2 New Schema Main Page
 * 
 * Main page component that orchestrates all receipt functionality using the new flat schema.
 * Handles routing between list, upload, and detail views.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  Slide,
  useTheme,
  Button,
  IconButton,
  Alert,
  Chip,
  Paper
} from '@mui/material';
import {
  Home,
  Receipt as ReceiptIcon,
  ArrowBack,
  Add as AddIcon,
  List as ListIcon,
  Upload as UploadIcon
} from '@mui/icons-material';

// Import v2 components
import {
  ReceiptSummaryCard,
  ReceiptVendorInfo,
  ReceiptFinancialBreakdown,
  ReceiptPerformanceMetrics,
  ReceiptListV2 as ReceiptList,
  ReceiptFilterPanel,
  ReceiptAnalyticsDashboard
} from '../components/receipts/v2';
import EnhancedReceiptUpload from '../components/receipts/v2/EnhancedReceiptUpload';
import receiptService from '../services/api/receiptService';
import { useAuth } from '../context/AuthContext';

const ReceiptPageV2 = () => {
  const theme = useTheme();
  const { user, isAuthenticated } = useAuth();
  
  // Page state management
  const [currentView, setCurrentView] = useState('list'); // 'list', 'upload', 'view', 'edit'
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load receipts on component mount
  useEffect(() => {
    const loadReceipts = async () => {
      console.log('🔄 ReceiptPageV2: useEffect triggered', {
        isAuthenticated,
        currentView,
        shouldLoad: isAuthenticated && currentView === 'list'
      });
      
      if (isAuthenticated && currentView === 'list') {
        try {
          setLoading(true);
          console.log('🔍 ReceiptPageV2: Loading receipts...');
          // Get all receipts (not just first page)
          const response = await receiptService.getReceipts({ page_size: 1000 });
          console.log('📊 ReceiptPageV2: Service response:', response);
          
          // Extract the actual data from the wrapped service response
          const data = response.data || response;
          console.log('📊 ReceiptPageV2: Extracted data:', data);
          
          // Handle different response structures
          let receiptsArray;
          if (data.results && Array.isArray(data.results)) {
            receiptsArray = data.results;
          } else if (Array.isArray(data)) {
            receiptsArray = data;
          } else if (data.data && Array.isArray(data.data)) {
            receiptsArray = data.data;
          } else {
            console.warn('⚠️ ReceiptPageV2: Unexpected API response structure:', data);
            receiptsArray = [];
          }
          
          console.log('📝 ReceiptPageV2: Setting receipts array:', receiptsArray.length, 'items');
          console.log('📝 ReceiptPageV2: First few receipts:', receiptsArray.slice(0, 3));
          setReceipts(receiptsArray);
        } catch (err) {
          setError('Failed to load receipts');
          console.error('❌ ReceiptPageV2: Failed to fetch receipts:', err);
          setReceipts([]); // Set to empty array on error
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadReceipts();
  }, [isAuthenticated, currentView]);

  // Navigation handlers
  const handleNavigateToUpload = () => {
    setCurrentView('upload');
    setSelectedReceipt(null);
  };

  const handleNavigateToList = async () => {
    console.log('🔄 ReceiptPageV2: Navigating to list, refreshing receipts...');
    setCurrentView('list');
    setSelectedReceipt(null);
    
    // Force refresh receipts when navigating to list
    try {
      setLoading(true);
      // Get all receipts (not just first page)
      const response = await receiptService.getReceipts({ page_size: 200 });
      const data = response.data || response;
      const receiptsArray = data.results ? data.results : (Array.isArray(data) ? data : []);
      console.log('📊 ReceiptPageV2: Refreshed receipts on list navigation:', receiptsArray.length, 'items');
      setReceipts(receiptsArray);
    } catch (err) {
      console.error('❌ ReceiptPageV2: Failed to refresh receipts on navigation:', err);
      setError('Failed to refresh receipts');
      setReceipts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptSelect = async (receipt, mode = 'view') => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch fresh receipt data
      const response = await receiptService.getReceiptById(receipt.id);
      const freshReceipt = response.data || response;
      setSelectedReceipt(freshReceipt);
      setCurrentView(mode);
    } catch (err) {
      setError('Failed to load receipt details');
      console.error('Failed to fetch receipt:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = async (uploadedReceipt) => {
    console.log('🎉 ReceiptPageV2: Upload success, refreshing receipts...', uploadedReceipt);
    
    // Force refresh the receipts list from the API
    try {
      setLoading(true);
      // Get all receipts (not just first page)
      const response = await receiptService.getReceipts({ page_size: 200 });
      const data = response.data || response;
      const receiptsArray = data.results ? data.results : (Array.isArray(data) ? data : []);
      console.log('📊 ReceiptPageV2: Refreshed receipts after upload:', receiptsArray.length, 'items');
      setReceipts(receiptsArray);
      
      // Navigate to view the uploaded receipt
      if (uploadedReceipt && uploadedReceipt.id) {
        setSelectedReceipt(uploadedReceipt);
        setCurrentView('view');
      } else {
        // Navigate back to list to show all receipts
        setCurrentView('list');
      }
    } catch (err) {
      console.error('❌ ReceiptPageV2: Failed to refresh receipts after upload:', err);
      setError('Failed to refresh receipts after upload');
      // Still navigate to list view even if refresh fails
      setCurrentView('list');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateReceipt = async (receiptId, updateData) => {
    try {
      const response = await receiptService.updateReceipt(receiptId, updateData);
      const updatedReceipt = response.data || response;
      setSelectedReceipt(updatedReceipt);
      // Update the receipt in the local list
      setReceipts(prev => prev.map(r => r.id === receiptId ? updatedReceipt : r));
      return updatedReceipt;
    } catch (err) {
      console.error('Failed to update receipt:', err);
      throw err;
    }
  };

  // Get breadcrumb trail
  const getBreadcrumbs = () => {
    const crumbs = [
      {
        label: 'Dashboard',
        icon: <Home fontSize="small" />,
        onClick: () => window.location.href = '/dashboard'
      },
      {
        label: 'Receipts',
        icon: <ReceiptIcon fontSize="small" />,
        onClick: handleNavigateToList
      }
    ];

    if (currentView === 'upload') {
      crumbs.push({
        label: 'Upload',
        current: true
      });
    } else if (currentView === 'view' && selectedReceipt) {
      crumbs.push({
        label: selectedReceipt.extracted_data?.vendor || `Receipt #${selectedReceipt.id}`,
        current: true
      });
    } else if (currentView === 'edit' && selectedReceipt) {
      crumbs.push({
        label: 'Edit',
        current: true
      });
    }

    return crumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="receipts-page-container">
      {/* Page Header */}
      <div className="receipts-page-header">
        <Box sx={{ p: 3 }}>
        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 2 }}>
          {breadcrumbs.map((crumb, index) => (
            <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {crumb.icon}
              {crumb.current ? (
                <Typography color="text.primary" fontWeight="medium">
                  {crumb.label}
                </Typography>
              ) : (
                <Link
                  component="button"
                  variant="body2"
                  onClick={crumb.onClick}
                  sx={{ 
                    textDecoration: 'none',
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {crumb.label}
                </Link>
              )}
            </Box>
          ))}
        </Breadcrumbs>

        {/* Page Title & Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {currentView === 'upload' ? 'Upload Receipts' : 
               currentView === 'view' ? 'Receipt Details' :
               currentView === 'edit' ? 'Edit Receipt' :
               'Receipts'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {currentView === 'upload' ? 'Upload and process receipt images with AI extraction' : 
               currentView === 'view' ? 'View and manage receipt details' :
               currentView === 'edit' ? 'Edit extracted receipt data' :
               `Manage your receipts • ${receipts.length} total receipts`}
            </Typography>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {currentView === 'list' && (
              <Button
                variant="contained"
                startIcon={<UploadIcon />}
                onClick={handleNavigateToUpload}
                sx={{ minWidth: 'auto' }}
              >
                Upload Receipt
              </Button>
            )}
            
            {currentView !== 'list' && (
              <IconButton 
                onClick={handleNavigateToList}
                sx={{ 
                  bgcolor: 'grey.100',
                  '&:hover': { bgcolor: 'grey.200' }
                }}
              >
                <ListIcon />
              </IconButton>
            )}

            {(currentView === 'view' || currentView === 'edit') && selectedReceipt && (
              <IconButton 
                onClick={() => handleNavigateToUpload()}
                sx={{ 
                  bgcolor: 'primary.light',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.main' }
                }}
              >
                <AddIcon />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* User Info */}
        {user && (
          <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Logged in as: <strong>{user.email || 'User'}</strong>
              {user.first_name && user.last_name && (
                <> • {user.first_name} {user.last_name}</>
              )}
            </Typography>
          </Box>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Debug Info */}
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          bgcolor: 'info.main', 
          color: 'white', 
          borderRadius: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Typography variant="body2">
            Debug - Current View: <strong>{currentView}</strong> | 
            Receipts: <strong>{receipts.length}</strong> | 
            Loading: <strong>{loading ? 'Yes' : 'No'}</strong> | 
            Authenticated: <strong>{isAuthenticated ? 'Yes' : 'No'}</strong>
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {receipts.length > 0 && (
              <Chip 
                label={`${receipts.length} receipts loaded`} 
                size="small" 
                sx={{ bgcolor: 'white', color: 'info.main' }}
              />
            )}
            <Button 
              size="small" 
              variant="outlined" 
              sx={{ color: 'white', borderColor: 'white' }}
              onClick={async () => {
                console.log('🔄 Manual API Test...');
                try {
                  setLoading(true);
                  // Get all receipts (not just first page)
                  const response = await receiptService.getReceipts({ page_size: 200 });
                  console.log('📊 Manual API Test result:', response);
                  const data = response.data || response;
                  const receiptsArray = data.results ? data.results : (Array.isArray(data) ? data : []);
                  console.log('🔍 Extracted receipts array:', receiptsArray);
                  console.log('🔍 First receipt sample:', receiptsArray[0]);
                  setReceipts(receiptsArray);
                  console.log('✅ Manual API Test: Set', receiptsArray.length, 'receipts');
                } catch (err) {
                  console.error('❌ Manual API Test error:', err);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Test API
            </Button>
          </Box>
        </Box>

        {/* 🚨 EMERGENCY: Raw Data Debug Display */}
        {receipts.length > 0 && (
          <Box className="emergency-debug-section" sx={{ 
            mt: 2, 
            p: 2, 
            bgcolor: 'warning.light', 
            borderRadius: 1
          }}>
            <Typography variant="h6" gutterBottom>🔥 EMERGENCY DEBUG - First Receipt Raw Data:</Typography>
            <pre style={{ fontSize: '10px', whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(receipts[0], null, 2)}
            </pre>
          </Box>
        )}
        </Box>
      </div>

      {/* Main Content Area */}
      <div className="receipts-page-content">
        {/* List View */}
        <Slide direction="right" in={currentView === 'list'} mountOnEnter unmountOnExit timeout={300}>
          <div className="receipts-content-box receipts-list-section">
            <ReceiptList
              onReceiptSelect={handleReceiptSelect}
              onUpload={handleNavigateToUpload}
              receipts={receipts}
              loading={loading}
              error={error}
            />
          </div>
        </Slide>

        {/* Upload View */}
        <Slide direction="left" in={currentView === 'upload'} mountOnEnter unmountOnExit timeout={300}>
          <div className="receipts-content-box">
            <EnhancedReceiptUpload
              onUploadSuccess={handleUploadSuccess}
              onUploadError={(error) => setError(error.message)}
              maxFiles={10}
              showPreview={true}
            />
          </div>
        </Slide>

        {/* Receipt Detail View */}
        <Slide direction="up" in={currentView === 'view' && selectedReceipt} mountOnEnter unmountOnExit timeout={300}>
          <div className="receipts-content-box">
            {selectedReceipt && (
              <Box>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <ArrowBack 
                    sx={{ cursor: 'pointer' }} 
                    onClick={handleNavigateToList}
                  />
                  <Typography variant="h4" component="h1">
                    Receipt Details
                  </Typography>
                </Box>

                {/* Content Grid */}
                <Box sx={{ 
                  display: 'grid', 
                  gap: 3, 
                  gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
                  alignItems: 'start'
                }}>
                  {/* Main Content */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <ReceiptSummaryCard
                      receipt={selectedReceipt}
                      onEdit={() => setCurrentView('edit')}
                      onReprocess={async (id) => {
                        const updatedReceipt = await handleReceiptSelect({ id }, 'view');
                        return updatedReceipt;
                      }}
                      onView={() => {}}
                    />
                    
                    <ReceiptVendorInfo
                      receipt={selectedReceipt}
                      onUpdate={handleUpdateReceipt}
                      editable={true}
                      showCategories={true}
                    />
                    
                    <ReceiptFinancialBreakdown
                      receipt={selectedReceipt}
                      onUpdate={handleUpdateReceipt}
                      editable={true}
                      showCalculations={true}
                    />
                  </Box>

                  {/* Sidebar */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <ReceiptPerformanceMetrics
                      receipt={selectedReceipt}
                      compact={false}
                      showComparison={true}
                    />

                    {/* Receipt Image */}
                    {selectedReceipt.image && (
                      <Paper sx={{ p: 2 }}>
                        <Typography variant="h6" gutterBottom>
                          Original Receipt
                        </Typography>
                        <Box
                          component="img"
                          src={selectedReceipt.image}
                          alt="Receipt"
                          sx={{
                            width: '100%',
                            maxHeight: 400,
                            objectFit: 'contain',
                            border: `1px solid ${theme.palette.divider}`,
                            borderRadius: 1
                          }}
                        />
                      </Paper>
                    )}
                  </Box>
                </Box>
              </Box>
            )}
          </div>
        </Slide>

        {/* Edit View */}
        <Slide direction="up" in={currentView === 'edit' && selectedReceipt} mountOnEnter unmountOnExit timeout={300}>
          <div className="receipts-content-box">
            {selectedReceipt && (
              <Box>
                {/* Header */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  <ArrowBack 
                    sx={{ cursor: 'pointer' }} 
                    onClick={() => setCurrentView('view')}
                  />
                  <Typography variant="h4" component="h1">
                    Edit Receipt
                  </Typography>
                </Box>

                {/* Edit Components */}
                <ReceiptVendorInfo
                  receipt={selectedReceipt}
                  onUpdate={async (id, data) => {
                    await handleUpdateReceipt(id, data);
                    setCurrentView('view');
                  }}
                  editable={true}
                  showCategories={true}
                />
                
                <ReceiptFinancialBreakdown
                  receipt={selectedReceipt}
                  onUpdate={async (id, data) => {
                    await handleUpdateReceipt(id, data);
                    setCurrentView('view');
                  }}
                  editable={true}
                  showCalculations={true}
                />
              </Box>
            )}
          </div>
        </Slide>
      </div>
    </div>
  );
};

export default ReceiptPageV2;
