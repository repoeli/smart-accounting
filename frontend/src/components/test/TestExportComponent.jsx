import React, { useState } from 'react';
import { Button, Box, Typography } from '@mui/material';
import { GetApp } from '@mui/icons-material';

const TestExportComponent = () => {
  const [testResult, setTestResult] = useState('');

  const runExportTest = () => {
    console.log('🧪 Starting Export Test...');
    setTestResult('Testing...');
    
    try {
      // Test 1: Basic blob creation
      const testData = 'test,data\n1,2\n3,4';
      const blob = new Blob([testData], { type: 'text/csv' });
      console.log('✅ Blob creation successful:', blob);
      
      // Test 2: URL creation
      const url = URL.createObjectURL(blob);
      console.log('✅ URL creation successful:', url);
      
      // Test 3: Link element creation
      const link = document.createElement('a');
      link.href = url;
      link.download = 'test-export.csv';
      console.log('✅ Link element created:', link);
      
      // Test 4: DOM manipulation
      document.body.appendChild(link);
      console.log('✅ Link added to DOM');
      
      // Test 5: Trigger download
      link.click();
      console.log('✅ Click triggered');
      
      // Test 6: Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('✅ Cleanup completed');
      
      setTestResult('✅ All tests passed! Check your downloads folder.');
      
    } catch (error) {
      console.error('❌ Export test failed:', error);
      setTestResult(`❌ Test failed: ${error.message}`);
    }
  };

  const testWithRealData = () => {
    console.log('🧪 Testing with real report data structure...');
    
    // Simulate the actual data structure
    const mockReportData = {
      data: [
        { period: '2024-01', income: 1000, expenses: 800, net_balance: 200 },
        { period: '2024-02', income: 1200, expenses: 900, net_balance: 300 },
        { period: '2024-03', income: 1100, expenses: 850, net_balance: 250 }
      ],
      summary: {
        total_income: 3300,
        total_expenses: 2550,
        net_total: 750
      }
    };
    
    try {
      // Process data like SimpleExportButtons does
      const csvData = mockReportData.data.map(item => ({
        Period: item.period || 'N/A',
        Income: item.income || 0,
        Expenses: item.expenses || 0,
        'Net Balance': item.net_balance || 0
      }));
      
      console.log('📊 CSV Data:', csvData);
      
      // Convert to CSV
      const headers = Object.keys(csvData[0]);
      const csvString = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
      ].join('\n');
      
      console.log('📄 CSV String:', csvString);
      
      // Create and download
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'real-data-test.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setTestResult('✅ Real data test passed! Check downloads folder.');
      
    } catch (error) {
      console.error('❌ Real data test failed:', error);
      setTestResult(`❌ Real data test failed: ${error.message}`);
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h5" gutterBottom>
        🧪 Export Functionality Test
      </Typography>
      
      <Box sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<GetApp />}
          onClick={runExportTest}
          sx={{ mr: 2, mb: 1 }}
        >
          Test Basic Export
        </Button>
        
        <Button
          variant="outlined"
          startIcon={<GetApp />}
          onClick={testWithRealData}
          sx={{ mb: 1 }}
        >
          Test with Real Data
        </Button>
      </Box>
      
      {testResult && (
        <Box sx={{ 
          p: 2, 
          backgroundColor: testResult.includes('✅') ? '#e8f5e8' : '#ffeaea',
          borderRadius: 1,
          border: testResult.includes('✅') ? '1px solid #4caf50' : '1px solid #f44336'
        }}>
          <Typography>{testResult}</Typography>
        </Box>
      )}
      
      <Box sx={{ mt: 3 }}>
        <Typography variant="body2" color="text.secondary">
          📝 <strong>Instructions:</strong><br/>
          1. Open browser console (F12)<br/>
          2. Click "Test Basic Export" button<br/>
          3. Check console for detailed logs<br/>
          4. Check downloads folder for test file<br/>
          5. If it works here but not in reports, the issue is data/component specific
        </Typography>
      </Box>
    </Box>
  );
};

export default TestExportComponent;
