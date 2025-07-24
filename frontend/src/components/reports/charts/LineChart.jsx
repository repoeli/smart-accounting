import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Utility function for robust color parsing
const parseColor = (colorString) => {
  try {
    // Handle hex colors
    if (typeof colorString === 'string' && colorString.startsWith('#')) {
      const hex = colorString.replace('#', '');
      if (hex.length === 3) {
        // Convert 3-digit hex to 6-digit
        const expandedHex = hex.split('').map(char => char + char).join('');
        const r = parseInt(expandedHex.substr(0, 2), 16);
        const g = parseInt(expandedHex.substr(2, 2), 16);
        const b = parseInt(expandedHex.substr(4, 2), 16);
        return { r, g, b, valid: true };
      } else if (hex.length === 6) {
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return { r, g, b, valid: true };
      }
    }
    
    // Handle rgb/rgba colors
    if (typeof colorString === 'string' && (colorString.includes('rgb'))) {
      const values = colorString.match(/\d+/g);
      if (values && values.length >= 3) {
        return {
          r: parseInt(values[0], 10),
          g: parseInt(values[1], 10),
          b: parseInt(values[2], 10),
          valid: true
        };
      }
    }
    
    // Handle named colors (basic set)
    const namedColors = {
      'red': { r: 255, g: 0, b: 0 },
      'green': { r: 0, g: 128, b: 0 },
      'blue': { r: 0, g: 0, b: 255 },
      'black': { r: 0, g: 0, b: 0 },
      'white': { r: 255, g: 255, b: 255 }
    };
    
    if (typeof colorString === 'string' && namedColors[colorString.toLowerCase()]) {
      return { ...namedColors[colorString.toLowerCase()], valid: true };
    }
    
    return { r: 25, g: 118, b: 210, valid: false }; // Default blue fallback
  } catch (error) {
    console.warn('Color parsing failed:', colorString, error);
    return { r: 25, g: 118, b: 210, valid: false }; // Default blue fallback
  }
};

// Create gradient generator function (outside render)
const createGradientFill = (color, height = 300) => {
  try {
    const parsedColor = parseColor(color);
    
    // Return a function that will be called by Chart.js when it needs the gradient
    return (ctx) => {
      if (!ctx || !ctx.canvas) return color;
      
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      const { r, g, b } = parsedColor;
      
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.2)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.05)`);
      
      return gradient;
    };
  } catch (error) {
    console.warn('Gradient creation failed:', error);
    return color; // Fallback to original color
  }
};

const LineChart = ({ 
  data, 
  title = '', 
  height = 300,
  showLegend = true,
  showGrid = true,
  animate = true,
  gradientFill = false
}) => {
  // Memoize processed data to avoid recalculation on every render
  const processedData = useMemo(() => {
    if (!data) return data;
    
    if (gradientFill && data.datasets) {
      return {
        ...data,
        datasets: data.datasets.map((dataset, index) => {
          try {
            const color = dataset.borderColor || '#1976d2';
            
            return {
              ...dataset,
              fill: true,
              backgroundColor: createGradientFill(color, height)
            };
          } catch (error) {
            console.warn(`Failed to create gradient for dataset ${index}:`, error);
            // Fallback to solid color with transparency
            const fallbackColor = dataset.borderColor || '#1976d2';
            const parsedColor = parseColor(fallbackColor);
            return {
              ...dataset,
              fill: true,
              backgroundColor: `rgba(${parsedColor.r}, ${parsedColor.g}, ${parsedColor.b}, 0.1)`
            };
          }
        })
      };
    }
    
    return data;
  }, [data, gradientFill, height]);
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: animate ? {
      duration: 1000,
      easing: 'easeInOutQuart'
    } : false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'top',
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
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#1976d2',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Time Period'
        }
      },
      y: {
        display: true,
        grid: {
          display: showGrid,
          color: 'rgba(0, 0, 0, 0.1)'
        },
        title: {
          display: true,
          text: 'Amount ($)'
        },
        ticks: {
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  return (
    <div style={{ height: `${height}px`, width: '100%' }}>
      <Line data={processedData} options={options} />
    </div>
  );
};

export default LineChart;
