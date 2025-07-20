/**
 * Utility Functions
 * Common utility functions used throughout the application
 */

/**
 * Format currency value
 */
export function formatCurrency(amount, currency = 'USD', locale = 'en-US') {
  if (typeof amount !== 'number') {
    return '$0.00';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format date
 */
export function formatDate(date, format = 'MM/DD/YYYY', locale = 'en-US') {
  if (!date) return '';

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }

  switch (format) {
    case 'MM/DD/YYYY':
      return dateObj.toLocaleDateString(locale);
    case 'DD/MM/YYYY':
      return dateObj.toLocaleDateString('en-GB');
    case 'YYYY-MM-DD':
      return dateObj.toISOString().split('T')[0];
    case 'long':
      return dateObj.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    case 'short':
      return dateObj.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    case 'time':
      return dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
      });
    case 'datetime':
      return `${dateObj.toLocaleDateString(locale)} ${dateObj.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
    default:
      return dateObj.toLocaleDateString(locale);
  }
}

/**
 * Format file size
 */
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Truncate text
 */
export function truncateText(text, maxLength = 100, suffix = '...') {
  if (!text || text.length <= maxLength) {
    return text;
  }

  return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter
 */
export function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert camelCase to Title Case
 */
export function camelToTitle(str) {
  if (!str) return '';
  
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, function(str) { return str.toUpperCase(); })
    .trim();
}

/**
 * Generate random ID
 */
export function generateId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Deep clone object
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }

  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }

  if (typeof obj === 'object') {
    const clonedObj = {};
    Object.keys(obj).forEach(key => {
      clonedObj[key] = deepClone(obj[key]);
    });
    return clonedObj;
  }
}

/**
 * Debounce function
 */
export function debounce(func, wait, immediate = false) {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle function
 */
export function throttle(func, limit) {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if object is empty
 */
export function isEmpty(obj) {
  if (!obj) return true;
  
  if (Array.isArray(obj)) return obj.length === 0;
  
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }
  
  return !obj;
}

/**
 * Get nested object value safely
 */
export function getNestedValue(obj, path, defaultValue = null) {
  if (!obj || !path) return defaultValue;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current[key] === undefined || current[key] === null) {
      return defaultValue;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Set nested object value
 */
export function setNestedValue(obj, path, value) {
  const keys = path.split('.');
  const lastKey = keys.pop();
  let current = obj;
  
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
  return obj;
}

/**
 * Validate email format
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone number format
 */
export function isValidPhone(phone) {
  const phoneRegex = /^[+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
}

/**
 * Format phone number
 */
export function formatPhoneNumber(phone) {
  if (!phone) return '';
  
  const cleaned = phone.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  
  return phone;
}

/**
 * Generate slug from text
 */
export function generateSlug(text) {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

/**
 * Parse query string
 */
export function parseQueryString(queryString) {
  const params = {};
  const searchParams = new URLSearchParams(queryString);
  
  for (const [key, value] of searchParams) {
    params[key] = value;
  }
  
  return params;
}

/**
 * Build query string
 */
export function buildQueryString(params) {
  const searchParams = new URLSearchParams();
  
  Object.keys(params).forEach(key => {
    if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
      searchParams.append(key, params[key]);
    }
  });
  
  return searchParams.toString();
}

/**
 * Download file from blob
 */
export function downloadFile(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  } else {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      textArea.remove();
      return false;
    }
  }
}

/**
 * Check if device is mobile
 */
export function isMobile() {
  return window.innerWidth <= 768;
}

/**
 * Check if device is tablet
 */
export function isTablet() {
  return window.innerWidth > 768 && window.innerWidth <= 1024;
}

/**
 * Check if device is desktop
 */
export function isDesktop() {
  return window.innerWidth > 1024;
}

/**
 * Get file extension
 */
export function getFileExtension(filename) {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
}

/**
 * Check if file is image
 */
export function isImageFile(filename) {
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'];
  const extension = getFileExtension(filename).toLowerCase();
  return imageExtensions.includes(extension);
}

/**
 * Format percentage
 */
export function formatPercentage(value, decimals = 1) {
  return `${(value * 100).toFixed(decimals)}%`;
}

/**
 * Calculate percentage
 */
export function calculatePercentage(value, total) {
  if (total === 0) return 0;
  return (value / total) * 100;
}
