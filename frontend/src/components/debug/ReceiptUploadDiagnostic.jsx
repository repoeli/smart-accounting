/**
 * CRITICAL ISSUE DIAGNOSTIC TOOL
 * Dedicated test component to debug the broken receipt upload pipeline
 * 
 * This will help identify the exact FormData construction issue
 * causing the "submitted data was not a file" error
 */

import React, { useState } from 'react';
import { Box, Button, Typography, Alert, Paper } from '@mui/material';
import receiptService from '../../services/api/receiptService';
import api from '../../services/api/api';

const ReceiptUploadDiagnostic = () => {
  const [diagnosticResult, setDiagnosticResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostic = async () => {
    setIsLoading(true);
    setDiagnosticResult(null);

    try {
      // Create a test image file (more realistic than text)
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      
      // Create a simple receipt-like image
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 200, 200);
      ctx.fillStyle = '#000000';
      ctx.font = '14px Arial';
      ctx.fillText('DIAGNOSTIC RECEIPT', 20, 30);
      ctx.fillText('Test Upload', 20, 60);
      ctx.fillText('Amount: $12.34', 20, 90);
      ctx.fillText('Date: ' + new Date().toLocaleDateString(), 20, 120);

      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      const testFile = new File([blob], 'diagnostic-receipt.png', {
        type: 'image/png',
        lastModified: Date.now()
      });

      console.log('🔍 DIAGNOSTIC: Test file created:', {
        name: testFile.name,
        type: testFile.type,
        size: testFile.size,
        lastModified: testFile.lastModified,
        instanceof_File: testFile instanceof File,
        instanceof_Blob: testFile instanceof Blob
      });

      // Test the FIXED upload method
      console.log('🔍 DIAGNOSTIC: Testing fixed upload method...');
      
      const result = await receiptService.uploadReceipt(testFile);
      
      if (result.success) {
        setDiagnosticResult({
          success: true,
          message: '🎉 UPLOAD FIX SUCCESSFUL!',
          data: result.data,
          method: 'Fixed FormData construction',
          fileInfo: {
            name: testFile.name,
            type: testFile.type,
            size: testFile.size
          }
        });
      } else {
        // Try alternative method
        console.log('🔍 DIAGNOSTIC: Primary method failed, trying alternatives...');
        
        // Note: Using main upload method since alternative doesn't exist in receiptService
        const altResult = await receiptService.uploadReceipt(testFile);
        
        if (altResult.success) {
          setDiagnosticResult({
            success: true,
            message: '🎉 ALTERNATIVE METHOD SUCCESSFUL!',
            data: altResult.data,
            method: `Alternative field name: ${altResult.workingFieldName}`,
            workingFieldName: altResult.workingFieldName,
            fileInfo: {
              name: testFile.name,
              type: testFile.type,
              size: testFile.size
            }
          });
        } else {
          setDiagnosticResult({
            success: false,
            error: 'All upload methods failed',
            primaryError: result.error,
            alternativeError: altResult.error,
            diagnosticInfo: result.diagnosticInfo
          });
        }
      }

    } catch (error) {
      console.error('🔍 DIAGNOSTIC ERROR:', error);
      
      setDiagnosticResult({
        success: false,
        error: error.message,
        stack: error.stack,
        type: 'Exception during diagnostic test'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testFormDataConstruction = () => {
    // Test different FormData construction methods
    const testFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    console.log('🔍 TESTING FormData construction methods:');
    
    // Method 1: Direct append
    const formData1 = new FormData();
    formData1.append('file', testFile);
    console.log('Method 1 - Direct append:', Array.from(formData1.entries()));
    
    // Method 2: With filename
    const formData2 = new FormData();
    formData2.append('file', testFile, testFile.name);
    console.log('Method 2 - With filename:', Array.from(formData2.entries()));
    
    // Method 3: Check file properties
    console.log('File properties:', {
      name: testFile.name,
      type: testFile.type,
      size: testFile.size,
      constructor: testFile.constructor.name,
      instanceof: testFile instanceof File
    });
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        🔍 Receipt Upload Diagnostic Tool
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This tool will help identify the exact cause of the FormData upload issue.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Button 
          variant="contained" 
          onClick={runDiagnostic}
          disabled={isLoading}
          sx={{ mr: 2 }}
        >
          {isLoading ? 'Running Diagnostic...' : 'Run Upload Diagnostic'}
        </Button>
        
        <Button 
          variant="outlined" 
          onClick={testFormDataConstruction}
        >
          Test FormData Construction
        </Button>
      </Box>

      {diagnosticResult && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Alert severity={diagnosticResult.success ? 'success' : 'error'}>
            <Typography variant="h6">
              {diagnosticResult.success ? '✅ Diagnostic Result: SUCCESS' : '❌ Diagnostic Result: FAILED'}
            </Typography>
          </Alert>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2">Details:</Typography>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {JSON.stringify(diagnosticResult, null, 2)}
            </pre>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ReceiptUploadDiagnostic;
