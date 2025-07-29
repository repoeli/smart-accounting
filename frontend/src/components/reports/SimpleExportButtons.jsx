import React from 'react';
import { Button, Box } from '@mui/material';
import { GetApp, PictureAsPdf } from '@mui/icons-material';
import useReportAccess from '../../hooks/reports/useReportAccess';

const SimpleExportButtons = ({ data, reportType, title = 'Report' }) => {
  const { canExportReports, getUpgradeMessage } = useReportAccess();
  
  const handleCSVExport = () => {
    console.log('CSV Export clicked. Data:', data);
    
    if (!canExportReports()) {
      alert(getUpgradeMessage('premium'));
      return;
    }
    
    if (!data) {
      alert('No data available');
      return;
    }

    let csvData = [];
    
    // Handle different report types with simple data extraction
    if (reportType === 'income-expense' && data.data) {
      csvData = data.data.map(item => ({
        Period: item.period || 'N/A',
        Income: item.income || 0,
        Expenses: item.expenses || 0,
        'Net Balance': item.net_balance || 0
      }));
    } else if (reportType === 'category-breakdown' && data.categories) {
      csvData = data.categories.map(item => ({
        Category: item.category || item.category_display || 'N/A',
        Amount: item.total_amount || item.amount || 0,
        Count: item.transaction_count || item.count || 0
      }));
    } else if (data.monthly_data) {
      // Fallback for monthly data
      csvData = data.monthly_data.map(item => ({
        Period: item.period || 'N/A',
        Amount: item.total_amount || item.amount || 0
      }));
    } else {
      // Last resort - try to extract any array from data
      const dataArray = Object.values(data).find(val => Array.isArray(val));
      if (dataArray && dataArray.length > 0) {
        csvData = dataArray.map((item, index) => ({
          Index: index + 1,
          ...item
        }));
      }
    }

    if (csvData.length === 0) {
      alert('No exportable data found');
      console.log('Data structure:', data);
      return;
    }

    // Convert to CSV
    const headers = Object.keys(csvData[0]);
    const csvString = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePDFExport = () => {
    console.log('PDF Export clicked. Data:', data);
    
    if (!canExportReports()) {
      alert(getUpgradeMessage('premium'));
      return;
    }
    
    alert('PDF export feature coming soon!');
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        variant="outlined"
        size="small"
        startIcon={<GetApp />}
        onClick={handleCSVExport}
        disabled={!data || !canExportReports()}
      >
        CSV
      </Button>
      <Button
        variant="outlined"
        size="small"
        startIcon={<PictureAsPdf />}
        onClick={handlePDFExport}
        disabled={!data || !canExportReports()}
      >
        PDF
      </Button>
    </Box>
  );
};

export default SimpleExportButtons;
