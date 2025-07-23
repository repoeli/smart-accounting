/**
 * ReceiptUploadV2.jsx - v2 New Schema Component
 * 
 * Upload component for processing receipts using the new flat schema.
 * Handles file upload, real-time processing status, and immediate preview.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  CardActions,
  TextField,
  Divider,
  Chip,
  useTheme,
  alpha
} from '@mui/material';
import {
  CloudUpload,
  Image,
  CheckCircle,
  Error,
  Refresh,
  Preview,
  Description
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

import ReceiptSummaryCard from './ReceiptSummaryCard';
import ReceiptPerformanceMetrics from './ReceiptPerformanceMetrics';
import receiptService from '../../../services/api/receiptService';

const ReceiptUploadV2 = ({ onSuccess, onCancel }) => {
  const theme = useTheme();
  
  // Upload state
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState({});

  // File validation
  const validateFile = (file) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size: 10MB');
    }

    return true;
  };

  // Handle file drop
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    setError('');

    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const error = rejectedFiles[0].errors[0];
      setError(`Upload failed: ${error.message}`);
      return;
    }

    // Validate and process accepted files
    const validFiles = [];
    for (const file of acceptedFiles) {
      try {
        validateFile(file);
        validFiles.push({
          file,
          id: Math.random().toString(36).substr(2, 9),
          status: 'ready',
          preview: URL.createObjectURL(file)
        });
      } catch (err) {
        setError(err.message);
        return;
      }
    }

    setUploadedFiles(prev => [...prev, ...validFiles]);
  }, []);

  // Configure dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxFiles: 5,
    multiple: true
  });

  // Upload single file
  const uploadSingleFile = async (fileItem) => {
    const { file, id } = fileItem;
    
    setProcessingStatus(prev => ({
      ...prev,
      [id]: { status: 'uploading', progress: 0 }
    }));

    try {
      const formData = new FormData();
      formData.append('image', file);
      if (description) {
        formData.append('description', description);
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProcessingStatus(prev => ({
          ...prev,
          [id]: { 
            ...prev[id], 
            progress: Math.min((prev[id]?.progress || 0) + 10, 90) 
          }
        }));
      }, 500);

      const result = await receiptService.createReceipt(formData);

      clearInterval(progressInterval);
      
      setProcessingStatus(prev => ({
        ...prev,
        [id]: { 
          status: 'completed', 
          progress: 100, 
          result: result 
        }
      }));

      // Update file item with result
      setUploadedFiles(prev => prev.map(item => 
        item.id === id 
          ? { ...item, status: 'completed', result }
          : item
      ));

      return result;

    } catch (err) {
      setProcessingStatus(prev => ({
        ...prev,
        [id]: { 
          status: 'failed', 
          progress: 0, 
          error: err.message 
        }
      }));

      setUploadedFiles(prev => prev.map(item => 
        item.id === id 
          ? { ...item, status: 'failed', error: err.message }
          : item
      ));

      throw err;
    }
  };

  // Upload all files
  const handleUploadAll = async () => {
    const readyFiles = uploadedFiles.filter(item => item.status === 'ready');
    
    if (readyFiles.length === 0) {
      setError('No files ready for upload');
      return;
    }

    setError('');

    // Upload files sequentially to avoid API rate limits
    for (const fileItem of readyFiles) {
      try {
        await uploadSingleFile(fileItem);
      } catch (err) {
        console.error(`Failed to upload ${fileItem.file.name}:`, err);
      }
    }

    // Check if all uploads completed successfully
    const completedUploads = uploadedFiles.filter(item => 
      processingStatus[item.id]?.status === 'completed'
    );

    if (completedUploads.length > 0 && onSuccess) {
      onSuccess(completedUploads.map(item => processingStatus[item.id].result));
    }
  };

  // Remove file
  const removeFile = (id) => {
    setUploadedFiles(prev => prev.filter(item => item.id !== id));
    setProcessingStatus(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Clear all files
  const clearAll = () => {
    uploadedFiles.forEach(item => {
      if (item.preview) {
        URL.revokeObjectURL(item.preview);
      }
    });
    setUploadedFiles([]);
    setProcessingStatus({});
    setError('');
  };

  // Get overall status
  const getOverallStatus = () => {
    const statuses = Object.values(processingStatus);
    if (statuses.some(s => s.status === 'uploading')) return 'uploading';
    if (statuses.some(s => s.status === 'failed')) return 'partial';
    if (statuses.every(s => s.status === 'completed')) return 'completed';
    return 'ready';
  };

  const overallStatus = getOverallStatus();

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Upload Receipts
        </Typography>
        <Typography variant="body1" color="textSecondary">
          Upload receipt images for AI-powered data extraction using our new optimized processing engine.
        </Typography>
      </Box>

      {/* Description Input */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          label="Description (Optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description for these receipts..."
          multiline
          rows={2}
          InputProps={{
            startAdornment: <Description sx={{ mr: 1, color: 'action.active' }} />
          }}
        />
      </Paper>

      {/* Upload Dropzone */}
      <Paper
        {...getRootProps()}
        sx={{
          p: 4,
          mb: 3,
          border: `2px dashed ${isDragActive ? theme.palette.primary.main : theme.palette.divider}`,
          bgcolor: isDragActive ? alpha(theme.palette.primary.main, 0.04) : 'background.paper',
          cursor: 'pointer',
          textAlign: 'center',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            bgcolor: alpha(theme.palette.primary.main, 0.04),
            borderColor: theme.palette.primary.main
          }
        }}
      >
        <input {...getInputProps()} />
        <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          {isDragActive ? 'Drop the files here...' : 'Drag & drop receipt images here'}
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          or click to select files
        </Typography>
        <Typography variant="caption" color="textSecondary">
          Supports: JPEG, PNG, WebP | Max size: 10MB | Max files: 5
        </Typography>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Files ({uploadedFiles.length})
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleUploadAll}
                disabled={loading || overallStatus === 'uploading' || overallStatus === 'completed'}
                startIcon={<CloudUpload />}
              >
                Upload All
              </Button>
              <Button
                variant="outlined"
                onClick={clearAll}
                disabled={loading || overallStatus === 'uploading'}
              >
                Clear All
              </Button>
            </Box>
          </Box>

          <Grid container spacing={2}>
            {uploadedFiles.map((fileItem) => {
              const status = processingStatus[fileItem.id] || { status: 'ready', progress: 0 };
              
              return (
                <Grid item xs={12} md={6} key={fileItem.id}>
                  <Card>
                    <CardContent>
                      {/* File Preview */}
                      <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <Box
                          component="img"
                          src={fileItem.preview}
                          alt={fileItem.file.name}
                          sx={{
                            width: 80,
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 1,
                            border: `1px solid ${theme.palette.divider}`
                          }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" noWrap>
                            {fileItem.file.name}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                          </Typography>
                          <Box sx={{ mt: 1 }}>
                            <Chip
                              size="small"
                              label={status.status}
                              color={
                                status.status === 'completed' ? 'success' :
                                status.status === 'failed' ? 'error' :
                                status.status === 'uploading' ? 'warning' : 'default'
                              }
                              icon={
                                status.status === 'completed' ? <CheckCircle /> :
                                status.status === 'failed' ? <Error /> :
                                status.status === 'uploading' ? <CircularProgress size={16} /> : <Image />
                              }
                            />
                          </Box>
                        </Box>
                      </Box>

                      {/* Progress Bar */}
                      {status.status === 'uploading' && (
                        <LinearProgress
                          variant="determinate"
                          value={status.progress}
                          sx={{ mb: 1 }}
                        />
                      )}

                      {/* Error Message */}
                      {status.status === 'failed' && (
                        <Alert severity="error" size="small">
                          {status.error}
                        </Alert>
                      )}

                      {/* Result Preview */}
                      {status.status === 'completed' && status.result && (
                        <Box sx={{ mt: 2 }}>
                          <Divider sx={{ mb: 2 }} />
                          <ReceiptSummaryCard
                            receipt={status.result}
                            compact={true}
                            onEdit={() => {}}
                            onView={() => {}}
                            onReprocess={() => {}}
                          />
                          <ReceiptPerformanceMetrics
                            receipt={status.result}
                            compact={true}
                          />
                        </Box>
                      )}
                    </CardContent>

                    <CardActions>
                      <Button
                        size="small"
                        onClick={() => removeFile(fileItem.id)}
                        disabled={status.status === 'uploading'}
                      >
                        Remove
                      </Button>
                      {status.status === 'failed' && (
                        <Button
                          size="small"
                          onClick={() => uploadSingleFile(fileItem)}
                          startIcon={<Refresh />}
                        >
                          Retry
                        </Button>
                      )}
                      {status.status === 'completed' && (
                        <Button
                          size="small"
                          onClick={() => onSuccess([status.result])}
                          startIcon={<Preview />}
                        >
                          View Details
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={loading || overallStatus === 'uploading'}
        >
          Cancel
        </Button>
        {overallStatus === 'completed' && (
          <Button
            variant="contained"
            onClick={() => onSuccess(
              uploadedFiles
                .filter(item => processingStatus[item.id]?.status === 'completed')
                .map(item => processingStatus[item.id].result)
            )}
          >
            View All Results
          </Button>
        )}
      </Box>
    </Box>
  );
};

export default ReceiptUploadV2;
