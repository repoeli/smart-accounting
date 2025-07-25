/**
 * EnhancedReceiptUpload - Advanced Upload Component
 * Drag and drop upload interface with preview and progress tracking
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Grid,
  IconButton,
  Paper,
  Chip
} from '@mui/material';
import { 
  CloudUpload, 
  Delete, 
  CheckCircle, 
  Error as ErrorIcon,
  Preview
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import receiptService from '../../../services/api/receiptService';

const EnhancedReceiptUpload = ({ 
  onUploadSuccess, 
  onUploadError, 
  maxFiles = 10, 
  showPreview = true 
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [error, setError] = useState('');
  const [uploadResults, setUploadResults] = useState({});

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      status: 'pending'
    }));
    
    setFiles(prev => [...prev, ...newFiles].slice(0, maxFiles));
    setError('');
  }, [maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    maxFiles,
    multiple: true
  });

  const removeFile = (fileId) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke URL to prevent memory leaks
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
    
    // Remove from upload results if exists
    setUploadResults(prev => {
      const updated = { ...prev };
      delete updated[fileId];
      return updated;
    });
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    setUploadProgress({});
    setUploadResults({});

    const promises = files.map(async (fileObj) => {
      try {
        // Update file status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'uploading' } : f
        ));

        const formData = new FormData();
        formData.append('image', fileObj.file);
        
        // Track progress for this file
        setUploadProgress(prev => ({ ...prev, [fileObj.id]: 0 }));

        const response = await receiptService.uploadReceipt(formData, {
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(prev => ({ 
              ...prev, 
              [fileObj.id]: percentCompleted 
            }));
          }
        });

        // Update file status to success
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'success' } : f
        ));
        
        setUploadResults(prev => ({
          ...prev,
          [fileObj.id]: { success: true, data: response.data || response }
        }));

        return { success: true, data: response.data || response, fileId: fileObj.id };
      } catch (err) {
        console.error(`Upload failed for file ${fileObj.id}:`, err);
        
        // Update file status to error
        setFiles(prev => prev.map(f => 
          f.id === fileObj.id ? { ...f, status: 'error' } : f
        ));
        
        setUploadResults(prev => ({
          ...prev,
          [fileObj.id]: { success: false, error: err.message }
        }));

        return { success: false, error: err.message, fileId: fileObj.id };
      }
    });

    try {
      const results = await Promise.allSettled(promises);
      const successfulUploads = results
        .filter(result => result.status === 'fulfilled' && result.value.success)
        .map(result => result.value.data);

      const failedUploads = results
        .filter(result => result.status === 'rejected' || !result.value.success);

      if (successfulUploads.length > 0) {
        onUploadSuccess?.(successfulUploads[successfulUploads.length - 1]); // Return last successful upload
      }

      if (failedUploads.length > 0) {
        setError(`${failedUploads.length} file(s) failed to upload`);
      }

    } catch (err) {
      setError('Upload process failed');
      onUploadError?.(err);
    } finally {
      setUploading(false);
    }
  };

  const clearAll = () => {
    // Revoke all object URLs
    files.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setFiles([]);
    setUploadProgress({});
    setUploadResults({});
    setError('');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'uploading': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success': return <CheckCircle fontSize="small" />;
      case 'error': return <ErrorIcon fontSize="small" />;
      case 'uploading': return null;
      default: return null;
    }
  };

  return (
    <Card sx={{ maxWidth: 800, mx: 'auto' }}>
      <CardContent>
        {/* Drop Zone */}
        <Paper
          {...getRootProps()}
          sx={{
            p: 4,
            textAlign: 'center',
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            backgroundColor: isDragActive ? 'primary.light' : 'grey.50',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            mb: 3,
            '&:hover': {
              borderColor: 'primary.main',
              backgroundColor: 'primary.light'
            }
          }}
        >
          <input {...getInputProps()} />
          <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {isDragActive ? 'Drop the files here...' : 'Drag & drop receipt images here'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            or click to select files ({files.length}/{maxFiles} selected)
          </Typography>
          <Button variant="outlined" sx={{ mt: 2 }}>
            Select Files
          </Button>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* File Preview Grid */}
        {files.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Files Ready for Upload ({files.length})
              </Typography>
              <Button 
                variant="outlined" 
                color="error" 
                size="small"
                onClick={clearAll}
                disabled={uploading}
              >
                Clear All
              </Button>
            </Box>

            <Grid container spacing={2}>
              {files.map((fileObj) => (
                <Grid item xs={12} sm={6} md={4} key={fileObj.id}>
                  <Card variant="outlined">
                    {showPreview && (
                      <Box
                        component="img"
                        src={fileObj.preview}
                        alt={fileObj.file.name}
                        sx={{
                          width: '100%',
                          height: 120,
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" noWrap sx={{ flexGrow: 1, mr: 1 }}>
                          {fileObj.file.name}
                        </Typography>
                        <IconButton 
                          size="small" 
                          onClick={() => removeFile(fileObj.id)}
                          disabled={uploading && fileObj.status === 'uploading'}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Chip 
                          label={fileObj.status}
                          color={getStatusColor(fileObj.status)}
                          size="small"
                          icon={getStatusIcon(fileObj.status)}
                        />
                        <Typography variant="caption" color="text.secondary">
                          {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                        </Typography>
                      </Box>

                      {/* Progress Bar for Uploading */}
                      {fileObj.status === 'uploading' && uploadProgress[fileObj.id] !== undefined && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={uploadProgress[fileObj.id]} 
                            sx={{ mb: 0.5 }}
                          />
                          <Typography variant="caption">
                            {uploadProgress[fileObj.id]}%
                          </Typography>
                        </Box>
                      )}

                      {/* Error Message */}
                      {fileObj.status === 'error' && uploadResults[fileObj.id]?.error && (
                        <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
                          {uploadResults[fileObj.id].error}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <Box sx={{ textAlign: 'center' }}>
            <Button
              variant="contained"
              size="large"
              onClick={uploadFiles}
              disabled={uploading}
              startIcon={<CloudUpload />}
              sx={{ minWidth: 200 }}
            >
              {uploading ? 'Uploading...' : `Upload ${files.length} File(s)`}
            </Button>
          </Box>
        )}

        {/* Overall Progress */}
        {uploading && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              Processing receipts with AI extraction...
            </Typography>
            <LinearProgress />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedReceiptUpload;