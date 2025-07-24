import React, { useState } from 'react';
import { Button, CircularProgress, Box, Tooltip } from '@mui/material';
import { GetApp, PictureAsPdf, TableChart } from '@mui/icons-material';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import useReportAccess from '../../hooks/reports/useReportAccess';

const ExportButtons = ({ 
  reportData, 
  reportType, 
  reportRef,
  title = 'Financial Report',
  disabled = false 
}) => {
  const [exporting, setExporting] = useState(null);
  const { canExport, getUpgradeMessage } = useReportAccess();

  // Computed disabled states for export buttons
  const isExportDisabled = disabled || exporting !== null;
  const isCsvDisabled = isExportDisabled || !canExport('csv');
  const isPdfDisabled = isExportDisabled || !canExport('pdf');

  // Format data for CSV export
  const formatDataForCSV = (data) => {
    if (!data) return [];
    
    // Helper function to safely format percentages
    const formatPercentage = (value) => {
      const num = parseFloat(value);
      return isNaN(num) ? '0%' : `${num}%`;
    };

    // Helper function to safely format numbers
    const formatNumber = (value, defaultValue = 0) => {
      const num = parseFloat(value);
      return isNaN(num) ? defaultValue : num;
    };

    // Helper function to safely format dates with consistent locale
    const formatDate = (dateValue) => {
      if (!dateValue) return 'N/A';
      try {
        const date = new Date(dateValue);
        return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US');
      } catch (error) {
        return 'N/A';
      }
    };

    // Helper function to safely get string value
    const safeString = (value, defaultValue = 'N/A') => {
      return value != null && value !== '' ? String(value) : defaultValue;
    };
    
    switch (reportType) {
      case 'income-expense':
        return (data.data && Array.isArray(data.data) ? data.data : []).map(item => ({
          Period: safeString(item?.period),
          Year: safeString(item?.year),
          Month: safeString(item?.month),
          Income: formatNumber(item?.income),
          Expenses: formatNumber(item?.expenses),
          'Net Balance': formatNumber(item?.net_balance),
          'Growth Rate': formatPercentage(item?.growth_rate),
          'Transaction Count': formatNumber(item?.transaction_count)
        }));
        
      case 'category-breakdown':
        return (data.categories && Array.isArray(data.categories) ? data.categories : []).map(item => ({
          Category: safeString(item?.category_display || item?.category),
          'Total Amount': formatNumber(item?.total_amount),
          Percentage: formatPercentage(item?.percentage),
          'Transaction Count': formatNumber(item?.transaction_count),
          'Average Amount': formatNumber(item?.avg_amount)
        }));
        
      case 'vendor-analysis':
        return (data.vendors && Array.isArray(data.vendors) ? data.vendors : []).map(item => ({
          Vendor: safeString(item?.vendor_name),
          'Total Spent': formatNumber(item?.total_spent),
          'Percentage of Total': formatPercentage(item?.percentage_of_total),
          'Transaction Count': formatNumber(item?.transaction_count),
          'Average Transaction': formatNumber(item?.avg_transaction),
          'First Transaction': formatDate(item?.first_transaction),
          'Last Transaction': formatDate(item?.last_transaction),
          'Frequency per Month': formatNumber(item?.frequency_per_month)
        }));
        
      case 'tax-deductible':
        return (data.category_breakdown && Array.isArray(data.category_breakdown) ? data.category_breakdown : []).map(item => ({
          Category: safeString(item?.category_display || item?.category),
          'Total Amount': formatNumber(item?.total_amount),
          'Transaction Count': formatNumber(item?.transaction_count),
          'Average Amount': formatNumber(item?.avg_amount),
          'Is Deductible': item?.is_deductible === true ? 'Yes' : item?.is_deductible === false ? 'No' : 'N/A'
        }));
        
      case 'audit-log':
        return (data.audit_entries && Array.isArray(data.audit_entries) ? data.audit_entries : []).map(item => ({
          'Receipt ID': safeString(item?.receipt_id),
          'Original Filename': safeString(item?.original_filename),
          'Upload Date': formatDate(item?.uploaded_at),
          'OCR Status': safeString(item?.ocr_status),
          'OCR Confidence': item?.ocr_confidence != null ? formatNumber(item.ocr_confidence) : 'N/A',
          'Is Verified': item?.is_verified === true ? 'Yes' : item?.is_verified === false ? 'No' : 'N/A',
          'Transaction Created': item?.transaction_created === true ? 'Yes' : item?.transaction_created === false ? 'No' : 'N/A',
          'Transaction Amount': item?.transaction_amount != null ? formatNumber(item.transaction_amount) : 'N/A'
        }));
        
      default:
        return [];
    }
  };

  // Export to CSV
  const handleCSVExport = async () => {
    if (!canExport('csv')) {
      alert(getUpgradeMessage('csv-export'));
      return;
    }

    setExporting('csv');
    let url = null; // Track URL for cleanup
    
    try {
      const csvData = formatDataForCSV(reportData);
      if (csvData.length === 0) {
        alert('No data available for export. Please ensure your report contains data.');
        return;
      }

      const csv = Papa.unparse(csvData);
      
      // Validate file size (warn if > 10MB)
      const fileSizeBytes = new Blob([csv]).size;
      const fileSizeMB = fileSizeBytes / (1024 * 1024);
      
      if (fileSizeMB > 10) {
        const proceed = window.confirm(
          `The export file is large (${fileSizeMB.toFixed(1)}MB). This may take longer to download. Continue?`
        );
        if (!proceed) {
          return;
        }
      }

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `financial-report-${reportType}-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL object to prevent memory leaks
        URL.revokeObjectURL(url);
        url = null;
      } else {
        throw new Error('Browser does not support file downloads');
      }
    } catch (error) {
      console.error('CSV export failed:', error);
      
      // Provide specific error messages based on error type
      if (error.name === 'QuotaExceededError') {
        alert('Export failed: Not enough storage space available. Please free up some space and try again.');
      } else if (error.message && error.message.includes('Papa')) {
        alert('Export failed: Error processing data for CSV format. Please try again with different filters.');
      } else if (error.message && error.message.includes('Blob')) {
        alert('Export failed: Unable to create export file. The data may be too large.');
      } else {
        alert(`Export failed: ${error.message || 'An unexpected error occurred. Please try again.'}`);
      }
    } finally {
      // Ensure URL is cleaned up even if an error occurs
      if (url) {
        URL.revokeObjectURL(url);
      }
      setExporting(null);
    }
  };

  // Export to PDF
  const handlePDFExport = async () => {
    if (!canExport('pdf')) {
      alert(getUpgradeMessage('pdf-export'));
      return;
    }

    if (!reportRef?.current) {
      alert('Report content not available for PDF export');
      return;
    }

    setExporting('pdf');
    
    try {
      // Create canvas from the report element
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Calculate dimensions and margins
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margins = { top: 50, bottom: 20, left: 20, right: 20 };
      const contentWidth = pdfWidth - margins.left - margins.right;
      const contentHeight = pdfHeight - margins.top - margins.bottom;
      
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      
      // Calculate scaling to fit content width
      const scaleRatio = contentWidth / imgWidth;
      const scaledWidth = imgWidth * scaleRatio;
      const scaledHeight = imgHeight * scaleRatio;
      
      // Helper function to add header to each page
      const addHeader = (pageNum) => {
        pdf.setFontSize(20);
        pdf.setTextColor(25, 118, 210);
        pdf.text('Smart Accounting', margins.left, 20);
        
        pdf.setFontSize(16);
        pdf.setTextColor(0, 0, 0);
        pdf.text(title, margins.left, 30);
        
        pdf.setFontSize(10);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Generated on: ${new Date().toLocaleDateString('en-US')}`, margins.left, 40);
        
        // Add page number
        if (pageNum > 1) {
          pdf.text(`Page ${pageNum}`, pdfWidth - margins.right - 30, 40);
        }
        
        // Add horizontal line under header
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margins.left, 45, pdfWidth - margins.right, 45);
      };
      
      // Helper function to add footer to each page
      const addFooter = (pageNum, totalPages) => {
        const footerY = pdfHeight - 10;
        pdf.setFontSize(8);
        pdf.setTextColor(100, 100, 100);
        pdf.text(
          `Smart Accounting Financial Report - Page ${pageNum} of ${totalPages}`,
          pdfWidth / 2,
          footerY,
          { align: 'center' }
        );
      };
      
      // Check if content fits on single page
      if (scaledHeight <= contentHeight) {
        // Single page layout
        addHeader(1);
        
        const imgX = margins.left + (contentWidth - scaledWidth) / 2;
        const imgY = margins.top;
        
        pdf.addImage(imgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);
        addFooter(1, 1);
      } else {
        // Multi-page layout
        let currentY = margins.top;
        let pageNumber = 1;
        let remainingHeight = scaledHeight;
        let sourceY = 0;
        
        // Calculate how many pages we'll need
        const totalPages = Math.ceil(scaledHeight / contentHeight);
        
        while (remainingHeight > 0) {
          // Add header for current page
          addHeader(pageNumber);
          currentY = margins.top;
          
          // Calculate height for this page
          const pageContentHeight = Math.min(remainingHeight, contentHeight);
          const sourceHeight = (pageContentHeight / scaleRatio);
          
          // Create a temporary canvas for this page's content
          const tempCanvas = document.createElement('canvas');
          const tempCtx = tempCanvas.getContext('2d');
          tempCanvas.width = imgWidth;
          tempCanvas.height = sourceHeight;
          
          // Draw the portion of the original image for this page
          const originalImg = new Image();
          originalImg.onload = () => {
            tempCtx.drawImage(
              originalImg,
              0, sourceY, imgWidth, sourceHeight,
              0, 0, imgWidth, sourceHeight
            );
            
            const pageImgData = tempCanvas.toDataURL('image/png');
            const imgX = margins.left + (contentWidth - scaledWidth) / 2;
            
            pdf.addImage(pageImgData, 'PNG', imgX, currentY, scaledWidth, pageContentHeight);
            addFooter(pageNumber, totalPages);
            
            // Move to next page if there's more content
            remainingHeight -= pageContentHeight;
            sourceY += sourceHeight;
            
            if (remainingHeight > 0) {
              pdf.addPage();
              pageNumber++;
            }
            
            // Save the PDF when all pages are processed
            if (remainingHeight <= 0) {
              pdf.save(`financial-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
            }
          };
          originalImg.src = imgData;
          
          // For synchronous processing, we'll use a different approach
          break; // Exit the while loop and use the alternative method below
        }
        
        // Alternative approach for multi-page (synchronous)
        for (let page = 0; page < totalPages; page++) {
          if (page > 0) {
            pdf.addPage();
          }
          
          addHeader(page + 1);
          currentY = margins.top;
          
          // Calculate the portion of the image for this page
          const pageContentHeight = Math.min(contentHeight, scaledHeight - (page * contentHeight));
          const sourceYPos = (page * contentHeight) / scaleRatio;
          const sourceHeightPortion = pageContentHeight / scaleRatio;
          
          // For this implementation, we'll add the full image and clip it
          // This is a simplified approach - in production, you might want to use image slicing
          const imgX = margins.left + (contentWidth - scaledWidth) / 2;
          const imgY = currentY - (page * contentHeight);
          
          // Add image with clipping
          pdf.addImage(imgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);
          
          addFooter(page + 1, totalPages);
        }
        
        // Save the PDF
        pdf.save(`financial-report-${reportType}-${new Date().toISOString().split('T')[0]}.pdf`);
      }
      
    } catch (error) {
      console.error('PDF export failed:', error);
      
      // Enhanced error handling for PDF export
      if (error.message && error.message.includes('html2canvas')) {
        alert('PDF export failed: Unable to capture report content. Please try refreshing the page and exporting again.');
      } else if (error.message && error.message.includes('jsPDF')) {
        alert('PDF export failed: Error generating PDF file. The content may be too large or complex.');
      } else if (error.name === 'QuotaExceededError') {
        alert('PDF export failed: Not enough storage space available. Please free up some space and try again.');
      } else {
        alert(`PDF export failed: ${error.message || 'An unexpected error occurred. Please try again.'}`);
      }
    } finally {
      setExporting(null);
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Tooltip title={!canExport('csv') ? getUpgradeMessage('csv-export') : 'Export as CSV'}>
        <span>
          <Button
            variant="outlined"
            startIcon={exporting === 'csv' ? <CircularProgress size={18} /> : <TableChart />}
            onClick={handleCSVExport}
            disabled={isCsvDisabled}
            size="small"
          >
            {exporting === 'csv' ? 'Exporting...' : 'CSV'}
          </Button>
        </span>
      </Tooltip>
      
      <Tooltip title={!canExport('pdf') ? getUpgradeMessage('pdf-export') : 'Export as PDF'}>
        <span>
          <Button
            variant="outlined"
            startIcon={exporting === 'pdf' ? <CircularProgress size={18} /> : <PictureAsPdf />}
            onClick={handlePDFExport}
            disabled={isPdfDisabled}
            size="small"
          >
            {exporting === 'pdf' ? 'Exporting...' : 'PDF'}
          </Button>
        </span>
      </Tooltip>
    </Box>
  );
};

export default ExportButtons;
