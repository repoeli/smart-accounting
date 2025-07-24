import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

// Data validation function
const validateChartData = (data) => {
  // Check if data exists and is an object
  if (!data || typeof data !== 'object') {
    return { isValid: false, error: 'Chart data must be an object' };
  }

  // Check if labels exist and is an array
  if (!data.labels || !Array.isArray(data.labels)) {
    return { isValid: false, error: 'Chart data must have a labels array' };
  }

  // Check if labels array has content
  if (data.labels.length === 0) {
    return { isValid: false, error: 'Chart data labels cannot be empty' };
  }

  // Check if datasets exist and is an array
  if (!data.datasets || !Array.isArray(data.datasets)) {
    return { isValid: false, error: 'Chart data must have a datasets array' };
  }

  // Check if datasets array has content
  if (data.datasets.length === 0) {
    return { isValid: false, error: 'Chart data datasets cannot be empty' };
  }

  // Validate the first dataset
  const dataset = data.datasets[0];
  if (!dataset || typeof dataset !== 'object') {
    return { isValid: false, error: 'First dataset must be an object' };
  }

  // Check if dataset has data property and is an array
  if (!dataset.data || !Array.isArray(dataset.data)) {
    return { isValid: false, error: 'Dataset must have a data array' };
  }

  // Check if data array length matches labels length
  if (dataset.data.length !== data.labels.length) {
    return { isValid: false, error: 'Dataset data length must match labels length' };
  }

  // Validate data values are numbers
  const hasInvalidData = dataset.data.some(value => {
    const numValue = parseFloat(value);
    return isNaN(numValue) || !isFinite(numValue) || numValue < 0;
  });

  if (hasInvalidData) {
    return { isValid: false, error: 'Dataset data must contain valid positive numbers' };
  }

  return { isValid: true, error: null };
};

// Error fallback component
const ChartErrorFallback = ({ error, height }) => (
  <div style={{ 
    height: `${height}px`, 
    width: '100%', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    border: '1px solid #ddd',
    borderRadius: '4px',
    flexDirection: 'column',
    color: '#666'
  }}>
    <div style={{ fontSize: '18px', marginBottom: '8px' }}>⚠️</div>
    <div style={{ fontSize: '14px', textAlign: 'center' }}>
      <strong>Chart Error</strong><br />
      {error || 'Unable to render chart with provided data'}
    </div>
  </div>
);

const PieChart = ({ 
  data, 
  title = '', 
  height = 300,
  showLegend = true,
  showPercentages = true,
  animate = true,
  cutout = 0 // Set to 50-60 for donut chart
}) => {
  // Validate input data
  const validation = validateChartData(data);
  if (!validation.isValid) {
    return <ChartErrorFallback error={validation.error} height={height} />;
  }

  // Wrap chart rendering in try-catch for additional safety
  try {
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: cutout ? `${cutout}%` : undefined,
    animation: animate ? {
      animateRotate: true,
      animateScale: true,
      duration: 1000
    } : false,
    elements: {
      arc: {
        borderWidth: 2,
        borderColor: '#fff'
      }
    },
    plugins: {
      legend: {
        display: showLegend,
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          },
          generateLabels: function(chart) {
            const data = chart.data;
            
            // Add null safety checks for data.labels and data.datasets
            if (!data?.labels?.length || !data?.datasets?.length) {
              return [];
            }
            
            const dataset = data.datasets[0];
            
            // Additional safety check for dataset.data
            if (!dataset?.data || !Array.isArray(dataset.data)) {
              return [];
            }
            
            const total = dataset.data.reduce((sum, value) => sum + (value || 0), 0);
            
            // Prevent division by zero
            if (total === 0) {
              return data.labels.map((label, i) => ({
                text: label,
                fillStyle: dataset.backgroundColor?.[i] || '#ccc',
                strokeStyle: dataset.borderColor?.[i] || '#fff',
                lineWidth: 2,
                index: i
              }));
            }
            
            return data.labels.map((label, i) => {
              const value = dataset.data[i] || 0;
              const percentage = ((value / total) * 100).toFixed(1);
              
              return {
                text: showPercentages ? `${label} (${percentage}%)` : label,
                fillStyle: dataset.backgroundColor?.[i] || '#ccc',
                strokeStyle: dataset.borderColor?.[i] || '#fff',
                lineWidth: 2,
                index: i
              };
            });
          }
        }
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#1976d2',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: $${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    }
  };

  // Generate colors if not provided
  const processedData = { ...data };
  
  // Ensure datasets exists and is an array
  if (!processedData.datasets || !Array.isArray(processedData.datasets)) {
    processedData.datasets = [];
  }
  
  // Ensure at least one dataset exists
  if (processedData.datasets.length === 0) {
    processedData.datasets.push({});
  }
  
  // Add colors if not provided for the first dataset
  if (!processedData.datasets[0]?.backgroundColor) {
    const colors = [
      '#1976d2', '#dc004e', '#ff9800', '#4caf50', '#9c27b0',
      '#f44336', '#2196f3', '#ff5722', '#795548', '#607d8b',
      '#e91e63', '#3f51b5', '#00bcd4', '#8bc34a', '#ffeb3b'
    ];
    
    // Ensure labels exists before using its length
    const labelCount = processedData.labels?.length || 0;
    
    processedData.datasets[0] = {
      ...processedData.datasets[0],
      backgroundColor: colors.slice(0, labelCount),
      borderColor: colors.slice(0, labelCount).map(color => color + '80')
    };
  }

  return (
    <div style={{ height: `${height}px`, width: '100%', display: 'flex', alignItems: 'center' }}>
      <Pie data={processedData} options={options} />
    </div>
  );
  
  } catch (error) {
    // Log error for debugging
    console.error('PieChart render error:', error);
    
    // Return error fallback UI
    return <ChartErrorFallback error="Chart rendering failed" height={height} />;
  }
};

export default PieChart;
