/**
 * ReceiptUploadZone.jsx - New Schema Receipt Upload
 * 
 * Upload component optimized for the new flat schema.
 * Handles file selection, preview, and processing.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Grid,
  useTheme,
  alpha,
  IconButton,
  Dialog,
  DialogContent,
  CircularProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import receiptService from '../../../services/api/receiptService';

const ReceiptUploadZone = ({ onUploadSuccess, onUploadError }) => {
  const theme = useTheme();
  
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  // Handle file drop/selection
  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const errorMessages = rejectedFiles.map(file => 
        `${file.file.name}: ${file.errors.map(e => e.message).join(', ')}`
      );
      onUploadError && onUploadError(new Error(`File validation failed: ${errorMessages.join('; ')}`));
      return;
    }

    // Process accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      status: 'pending',
      result: null,
      error: null
    }));

    setFiles(prev => [...prev, ...newFiles]);
    setUploadResults([]);
  }, [onUploadError]);

  // Dropzone configuration
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject
  } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.bmp', '.webp']
    },
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
    multiple: true
  });

  // Remove file from list
  const removeFile = (fileId) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      // Revoke object URL to prevent memory leaks
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return updated;
    });
  };

  // Preview file
  const previewFileHandler = (file) => {
    setPreviewFile(file);
  };

  // Upload all files
  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    const results = [];

    try {
      for (const fileItem of files) {
        try {
          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'uploading' } : f
          ));

          // Create FormData
          const formData = new FormData();
          formData.append('file', fileItem.file);

          // Upload via API
          const result = await receiptService.createReceipt(formData);
          
          // Update file status to success
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'success', result } : f
          ));

          results.push({ success: true, file: fileItem.file.name, result });

        } catch (error) {
          // Update file status to error
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id ? { ...f, status: 'error', error: error.message } : f
          ));

          results.push({ success: false, file: fileItem.file.name, error: error.message });
        }
      }

      setUploadResults(results);

      // Call success callback with successful uploads
      const successfulUploads = results.filter(r => r.success).map(r => r.result);
      if (successfulUploads.length > 0 && onUploadSuccess) {
        onUploadSuccess(successfulUploads);
      }

      // Call error callback if there were failures
      const failedUploads = results.filter(r => !r.success);
      if (failedUploads.length > 0 && onUploadError) {
        const errorMessage = `${failedUploads.length} uploads failed: ${failedUploads.map(f => f.error).join(', ')}`;
        onUploadError(new Error(errorMessage));
      }

    } catch (error) {
      onUploadError && onUploadError(error);
    } finally {
      setUploading(false);
    }
  };

  // Clear all files
  const clearFiles = () => {
    files.forEach(file => URL.revokeObjectURL(file.preview));
    setFiles([]);
    setUploadResults([]);
  };

  // Get dropzone style
  const getDropzoneStyle = () => {
    let borderColor = theme.palette.divider;
    let backgroundColor = alpha(theme.palette.primary.main, 0.04);

    if (isDragAccept) {
      borderColor = theme.palette.success.main;
      backgroundColor = alpha(theme.palette.success.main, 0.08);
    } else if (isDragReject) {
      borderColor = theme.palette.error.main;
      backgroundColor = alpha(theme.palette.error.main, 0.08);
    } else if (isDragActive) {
      borderColor = theme.palette.primary.main;
      backgroundColor = alpha(theme.palette.primary.main, 0.08);
    }

    return {
      border: `2px dashed ${borderColor}`,
      borderRadius: theme.spacing(1),
      backgroundColor,
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      '&:hover': {
        borderColor: theme.palette.primary.main,
        backgroundColor: alpha(theme.palette.primary.main, 0.06)
      }
    };
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <SuccessIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      case 'uploading':
        return <CircularProgress size={20} />;
      default:
        return <ImageIcon color="action" />;
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      case 'uploading':
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      {/* Upload Zone */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              ...getDropzoneStyle(),
              p: 4,
              textAlign: 'center',
              minHeight: 200,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center'
            }}
          >
            <input {...getInputProps()} />
            <UploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            
            {isDragActive ? (
              <Typography variant="h6" color="primary">
                Drop the receipt images here...
              </Typography>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Upload Receipt Images
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Drag & drop receipt images here, or click to select files
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Supports: JPEG, PNG, GIF, BMP, WebP (max 10MB each, up to 10 files)
                </Typography>
              </>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Selected Files ({files.length})
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  onClick={clearFiles}
                  disabled={uploading}
                  sx={{ mr: 1 }}
                >
                  Clear All
                </Button>
                <Button
                  variant="contained"
                  onClick={handleUpload}
                  disabled={uploading || files.length === 0}
                  startIcon={uploading ? <CircularProgress size={16} /> : <UploadIcon />}
                >
                  {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
                </Button>
              </Box>
            </Box>

            <Grid container spacing={2}>
              {files.map((fileItem) => (
                <Grid item xs={12} sm={6} md={4} key={fileItem.id}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        {getStatusIcon(fileItem.status)}
                        <Typography variant="body2" noWrap sx={{ flex: 1 }}>
                          {fileItem.file.name}
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => removeFile(fileItem.id)}
                          disabled={uploading}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      <Box sx={{ mb: 1 }}>
                        <Box
                          component="img"
                          src={fileItem.preview}
                          alt="Preview"
                          sx={{
                            width: '100%',
                            height: 80,
                            objectFit: 'cover',
                            borderRadius: 1,
                            cursor: 'pointer'
                          }}
                          onClick={() => previewFileHandler(fileItem)}
                        />
                      </Box>

                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={fileItem.status}
                          size="small"
                          color={getStatusColor(fileItem.status)}
                          variant="outlined"
                        />
                        <IconButton
                          size="small"
                          onClick={() => previewFileHandler(fileItem)}
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Box>

                      {fileItem.status === 'uploading' && (
                        <LinearProgress sx={{ mt: 1 }} />
                      )}

                      {fileItem.error && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                          <Typography variant="caption">
                            {fileItem.error}
                          </Typography>
                        </Alert>
                      )}

                      {fileItem.result && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            Vendor: {fileItem.result.extracted_data?.vendor || 'Unknown'}
                          </Typography>
                          <br />
                          <Typography variant="caption" color="text.secondary">
                            Amount: {fileItem.result.extracted_data?.currency || 'USD'} {fileItem.result.extracted_data?.total || 0}
                          </Typography>
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Upload Results Summary */}
      {uploadResults.length > 0 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ReceiptIcon />
              Upload Results
            </Typography>

            {uploadResults.map((result, index) => (
              <Alert
                key={index}
                severity={result.success ? 'success' : 'error'}
                sx={{ mb: 1 }}
              >
                <Typography variant="body2">
                  <strong>{result.file}</strong>: {result.success ? 'Uploaded successfully' : result.error}
                </Typography>
                {result.success && result.result && (
                  <Typography variant="caption" color="text.secondary">
                    Extracted: {result.result.extracted_data?.vendor} - {result.result.extracted_data?.currency} {result.result.extracted_data?.total}
                  </Typography>
                )}
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewFile}
        onClose={() => setPreviewFile(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent>
          {previewFile && (
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" gutterBottom>
                {previewFile.file.name}
              </Typography>
              <Box
                component="img"
                src={previewFile.preview}
                alt="Preview"
                sx={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default ReceiptUploadZone;
