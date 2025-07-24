import React from 'react';
import PropTypes from 'prop-types';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const BarChart = ({ 
  data, 
  title = '', 
  height = 300,
  horizontal = false,
  showLegend = true,
  showGrid = true,
  animate = true,
  stacked = false,
  // Axis configuration props
  xAxisTitle = null,
  yAxisTitle = null,
  xAxisFormatter = null,
  yAxisFormatter = null,
  // Tooltip configuration props
  tooltipFormatter = null,
  currencySymbol = '$',
  // Legacy currency formatting (for backward compatibility)
  useCurrencyFormat = true
}) => {
  // Default currency formatter for backward compatibility
  const defaultCurrencyFormatter = (value) => {
    return '$' + value.toLocaleString();
  };

  // Helper functions to determine axis configuration
  const getXAxisTitle = () => {
    if (xAxisTitle !== null) return xAxisTitle;
    if (useCurrencyFormat) {
      return horizontal ? 'Amount ($)' : 'Categories';
    }
    return horizontal ? 'Values' : 'Categories';
  };

  const getYAxisTitle = () => {
    if (yAxisTitle !== null) return yAxisTitle;
    if (useCurrencyFormat) {
      return horizontal ? 'Categories' : 'Amount ($)';
    }
    return horizontal ? 'Categories' : 'Values';
  };

  const getXAxisFormatter = () => {
    if (xAxisFormatter !== null) return xAxisFormatter;
    if (useCurrencyFormat && horizontal) {
      return defaultCurrencyFormatter;
    }
    return null;
  };

  const getYAxisFormatter = () => {
    if (yAxisFormatter !== null) return yAxisFormatter;
    if (useCurrencyFormat && !horizontal) {
      return defaultCurrencyFormatter;
    }
    return null;
  };

  const getTooltipFormatter = () => {
    if (tooltipFormatter !== null) return tooltipFormatter;
    if (useCurrencyFormat) {
      return (value) => `${currencySymbol}${value.toLocaleString()}`;
    }
    return (value) => value.toLocaleString();
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: horizontal ? 'y' : 'x',
    animation: animate ? {
      duration: 1000,
      easing: 'easeInOutQuart'
    } : false,
    plugins: {
      legend: {
        display: showLegend,
        position: horizontal ? 'bottom' : 'top',
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
            const label = context.dataset.label || '';
            const value = context.parsed[horizontal ? 'x' : 'y'];
            const formattedValue = getTooltipFormatter()(value);
            return `${label}: ${formattedValue}`;
          }
        }
      }
    },
    interaction: {
      mode: 'index',
      intersect: false
    },
    scales: {
      x: {
        display: true,
        stacked: stacked,
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
          display: true,
          text: getXAxisTitle()
        },
        ticks: getXAxisFormatter() ? {
          callback: getXAxisFormatter()
        } : undefined
      },
      y: {
        display: true,
        stacked: stacked,
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
          display: true,
          text: getYAxisTitle()
        },
        ticks: getYAxisFormatter() ? {
          callback: getYAxisFormatter()
        } : undefined
      }
    },
    elements: {
      bar: {
        borderRadius: 4,
        borderWidth: 1
      }
    }
  };

  // Generate colors if not provided
  const processedData = { ...data };
  if (processedData.datasets) {
    processedData.datasets = processedData.datasets.map((dataset, index) => {
      if (!dataset.backgroundColor) {
        const colors = [
          '#1976d2', '#dc004e', '#ff9800', '#4caf50', '#9c27b0',
          '#f44336', '#2196f3', '#ff5722', '#795548', '#607d8b'
        ];
        
        const color = colors[index % colors.length];
        return {
          ...dataset,
          backgroundColor: color + '80',
          borderColor: color,
          borderWidth: 1
        };
      }
      return dataset;
    });
  }

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Bar data={processedData} options={options} />
    </div>
  );
};

BarChart.propTypes = {
  data: PropTypes.object.isRequired,
  title: PropTypes.string,
  height: PropTypes.number,
  horizontal: PropTypes.bool,
  showLegend: PropTypes.bool,
  showGrid: PropTypes.bool,
  animate: PropTypes.bool,
  stacked: PropTypes.bool,
  xAxisTitle: PropTypes.string,
  yAxisTitle: PropTypes.string,
  xAxisFormatter: PropTypes.func,
  yAxisFormatter: PropTypes.func,
  tooltipFormatter: PropTypes.func,
  currencySymbol: PropTypes.string,
  useCurrencyFormat: PropTypes.bool
};

export default BarChart;
