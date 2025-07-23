/**
 * IMMEDIATE DIAGNOSTIC TEST - PRODUCTION CRITICAL
 * 
 * This utility can be run directly in browser console to test
 * the FormData upload fix in real-time
 */

// Test function for immediate execution
window.testReceiptUploadFix = async function() {
  console.log('🚨 STARTING CRITICAL UPLOAD DIAGNOSTIC TEST');
  console.log('🔍 Testing FormData construction patterns...');
  
  // Create test file
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 100, 100);
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px Arial';
  ctx.fillText('TEST', 35, 50);
  
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  const testFile = new File([blob], 'diagnostic-test.png', { 
    type: 'image/png',
    lastModified: Date.now()
  });
  
  console.log('✅ Test file created:', {
    name: testFile.name,
    type: testFile.type,
    size: testFile.size,
    instanceof_File: testFile instanceof File
  });

  // Import the fixed service
  try {
    const { default: receiptService } = await import('/src/services/api/receiptPerformanceService.js');
    
    console.log('🔧 Testing FIXED upload method...');
    const result = await receiptService.uploadReceipt(testFile, {
      preferredApi: 'auto'
    });
    
    if (result.success) {
      console.log('🎉 SUCCESS! Upload working with fixed method');
      console.log('✅ Response:', result.data);
      return { status: 'FIXED', method: 'primary', result };
    } else {
      console.log('❌ Primary method failed, testing alternatives...');
      
      const altResult = await receiptService.uploadReceiptAlternative(testFile, {
        preferredApi: 'auto'
      });
      
      if (altResult.success) {
        console.log('🎉 SUCCESS! Alternative method worked');
        console.log('✅ Working field name:', altResult.workingFieldName);
        return { status: 'FIXED', method: 'alternative', result: altResult };
      } else {
        console.log('❌ All methods failed');
        return { status: 'FAILED', errors: [result, altResult] };
      }
    }
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR in diagnostic test:', error);
    return { status: 'ERROR', error: error.message };
  }
};

// Test raw FormData construction
window.testFormDataConstruction = function() {
  console.log('🧪 TESTING FormData construction methods...');
  
  const testFile = new File(['test content'], 'test.txt', { type: 'text/plain' });
  
  // Method 1: Direct append
  const fd1 = new FormData();
  fd1.append('file', testFile);
  console.log('Method 1 - Direct append:', Array.from(fd1.entries()));
  
  // Method 2: With filename
  const fd2 = new FormData();
  fd2.append('file', testFile, testFile.name);
  console.log('Method 2 - With filename:', Array.from(fd2.entries()));
  
  // Method 3: Different field names
  const fd3 = new FormData();
  fd3.append('receipt_file', testFile);
  console.log('Method 3 - Different field:', Array.from(fd3.entries()));
  
  return { fd1, fd2, fd3 };
};

// Auto-run tests if in development
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🔍 DIAGNOSTIC TOOLS LOADED');
  console.log('📋 Available commands:');
  console.log('  - testReceiptUploadFix() - Test upload fix');
  console.log('  - testFormDataConstruction() - Test FormData patterns');
}
