import React, { useState, useCallback, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  CircularProgress,
  IconButton,
  Chip,
  Divider,
  Grid,
  Paper
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RetryIcon,
  Photo as PhotoIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import ReceiptSummaryCard from './ReceiptSummaryCard';
import ReceiptPerformanceMetrics from './ReceiptPerformanceMetrics';
import receiptService from '../../../services/api/receiptService';

/**
 * EnhancedReceiptUpload - Production Upload Component for New Schema
 * 
 * Features:
 * - Drag & drop with visual feedback
 * - Real-time upload progress
 * - File validation and preview
 * - Error handling with retry
 * - Success state with extracted data preview
 * - Integration with new flat schema
 */
const EnhancedReceiptUpload = ({ 
  onUploadSuccess, 
  onUploadError,
  maxFiles = 10,
  showPreview = true 
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadQueue, setUploadQueue] = useState([]);
  const [completedUploads, setCompletedUploads] = useState([]);
  const fileInputRef = useRef(null);

  // File validation
  const validateFile = (file) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    
    if (file.size > maxSize) {
      return 'File too large (max 10MB)';
    }
    
    if (!allowedTypes.includes(file.type)) {
      return 'Invalid file type. Use JPEG, PNG, or WebP';
    }
    
    return null;
  };

  // Handle file upload
  const handleUpload = useCallback(async (file) => {
    const fileId = `${Date.now()}_${file.name}`;
    
    // Add to upload queue
    const uploadItem = {
      id: fileId,
      file,
      name: file.name,
      size: file.size,
      status: 'uploading',
      progress: 0,
      error: null,
      result: null
    };
    
    setUploadQueue(prev => [...prev, uploadItem]);

    try {
      // Create FormData and call the receipt service
      const formData = new FormData();
      formData.append('image', file);
      const response = await receiptService.createReceipt(formData);
      const result = response.data || response;
      
      // Update queue item with success
      setUploadQueue(prev => prev.map(item => 
        item.id === fileId 
          ? { ...item, status: 'completed', progress: 100, result }
          : item
      ));
      
      // Move to completed uploads
      setCompletedUploads(prev => [...prev, { ...uploadItem, result, status: 'completed' }]);
      
      // Notify parent
      if (onUploadSuccess) {
        onUploadSuccess(result);
      }

    } catch (err) {
      // Update queue item with error
      setUploadQueue(prev => prev.map(item => 
        item.id === fileId 
          ? { ...item, status: 'error', error: err.message }
          : item
      ));
      
      if (onUploadError) {
        onUploadError(err);
      }
    }
  }, [onUploadSuccess, onUploadError]);

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles,
    maxSize: 10 * 1024 * 1024,
    onDrop: useCallback((acceptedFiles, rejectedFiles) => {
      // Handle rejected files
      rejectedFiles.forEach(rejection => {
        console.error('File rejected:', rejection.file.name, rejection.errors);
      });
      
      // Process accepted files
      acceptedFiles.forEach(file => {
        const error = validateFile(file);
        if (error) {
          console.error('File validation failed:', file.name, error);
          return;
        }
        
        handleUpload(file);
      });
    }, [handleUpload])
  });

  // Retry failed upload
  const retryUpload = (fileId) => {
    const item = uploadQueue.find(item => item.id === fileId);
    if (item) {
      // Reset item status
      setUploadQueue(prev => prev.map(upload => 
        upload.id === fileId 
          ? { ...upload, status: 'uploading', error: null, progress: 0 }
          : upload
      ));
      
      // Retry upload
      handleUpload(item.file);
    }
  };

  // Remove from queue
  const removeFromQueue = (fileId) => {
    setUploadQueue(prev => prev.filter(item => item.id !== fileId));
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    if (!amount && amount !== 0) return 'N/A';
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency || 'USD'
      }).format(Number(amount));
    } catch {
      return `${currency} ${Number(amount).toFixed(2)}`;
    }
  };

  return (
    <Box>
      {/* Upload Zone */}
      <Card
        {...getRootProps()}
        sx={{
          mb: 3,
          cursor: 'pointer',
          border: '2px dashed',
          borderColor: isDragActive 
            ? 'primary.main' 
            : isDragReject 
              ? 'error.main' 
              : 'grey.300',
          backgroundColor: isDragActive 
            ? 'primary.light' 
            : isDragReject 
              ? 'error.light' 
              : 'background.paper',
          '&:hover': {
            borderColor: 'primary.main',
            backgroundColor: 'primary.light'
          },
          transition: 'all 0.2s ease'
        }}
      >
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <input {...getInputProps()} ref={fileInputRef} />
          
          <UploadIcon 
            sx={{ 
              fontSize: 48, 
              color: isDragActive ? 'primary.main' : 'grey.400',
              mb: 2 
            }} 
          />
          
          <Typography variant="h6" gutterBottom>
            {isDragActive 
              ? 'Drop files here...' 
              : 'Drag & drop receipt images here'}
          </Typography>
          
          <Typography variant="body2" color="text.secondary" gutterBottom>
            or click to select files
          </Typography>
          
          <Typography variant="caption" color="text.secondary">
            Supports JPEG, PNG, WebP • Max 10MB per file • Up to {maxFiles} files
          </Typography>
          
          <Box mt={2}>
            <Button
              variant="outlined"
              startIcon={<PhotoIcon />}
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
            >
              Choose Files
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      {uploadQueue.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Upload Progress
            </Typography>
            
            {uploadQueue.map((upload) => (
              <Box key={upload.id} sx={{ mb: 2 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PhotoIcon fontSize="small" />
                    <Typography variant="body2" fontWeight="medium">
                      {upload.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({formatFileSize(upload.size)})
                    </Typography>
                  </Box>
                  
                  <Box display="flex" alignItems="center" gap={1}>
                    {upload.status === 'uploading' && (
                      <CircularProgress size={16} />
                    )}
                    {upload.status === 'completed' && (
                      <SuccessIcon color="success" fontSize="small" />
                    )}
                    {upload.status === 'error' && (
                      <IconButton size="small" onClick={() => retryUpload(upload.id)}>
                        <RetryIcon fontSize="small" />
                      </IconButton>
                    )}
                    <IconButton size="small" onClick={() => removeFromQueue(upload.id)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                
                {upload.status === 'uploading' && (
                  <LinearProgress 
                    variant="indeterminate" 
                    sx={{ height: 4, borderRadius: 2 }}
                  />
                )}
                
                {upload.status === 'error' && (
                  <Alert severity="error" size="small">
                    {upload.error}
                  </Alert>
                )}
                
                {upload.status === 'completed' && upload.result && (
                  <Paper variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: 'success.light', alpha: 0.1 }}>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" color="text.secondary">Vendor</Typography>
                        <Typography variant="body2" fontWeight="medium">
                          {upload.result.extracted_data?.vendor || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" color="text.secondary">Date</Typography>
                        <Typography variant="body2">
                          {upload.result.extracted_data?.date || 'Unknown'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" color="text.secondary">Total</Typography>
                        <Typography variant="body2" fontWeight="bold">
                          {formatCurrency(
                            upload.result.extracted_data?.total,
                            upload.result.extracted_data?.currency
                          )}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={3}>
                        <Typography variant="caption" color="text.secondary">Type</Typography>
                        <Chip 
                          label={upload.result.extracted_data?.type || 'expense'}
                          size="small"
                          color={upload.result.extracted_data?.type === 'income' ? 'success' : 'default'}
                        />
                      </Grid>
                    </Grid>
                  </Paper>
                )}
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Global Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.message || 'Upload failed. Please try again.'}
        </Alert>
      )}
    </Box>
  );
};

export default EnhancedReceiptUpload;
