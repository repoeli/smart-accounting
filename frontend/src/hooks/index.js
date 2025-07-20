/**
 * Custom Hooks
 * Reusable custom hooks for common functionality
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

/**
 * Hook for API calls with loading and error handling
 */
export function useApi(apiFunction, dependencies = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiFunction(...args);
      setData(result.data);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, dependencies); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error, execute };
}

/**
 * Hook for form state management
 */
export function useForm(initialValues = {}, validationSchema = null) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update field value
  const setValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  }, [errors]);

  // Handle input change
  const handleChange = useCallback((event) => {
    const { name, value, type, checked } = event.target;
    setValue(name, type === 'checkbox' ? checked : value);
  }, [setValue]);

  // Handle field blur
  const handleBlur = useCallback((event) => {
    const { name } = event.target;
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  // Validate form
  const validate = useCallback(() => {
    if (!validationSchema) return true;

    const validationErrors = {};
    let isValid = true;

    Object.keys(validationSchema).forEach(field => {
      const rules = validationSchema[field];
      const value = values[field];

      for (const rule of rules) {
        if (!rule.validator(value, values)) {
          validationErrors[field] = rule.message;
          isValid = false;
          break;
        }
      }
    });

    setErrors(validationErrors);
    return isValid;
  }, [values, validationSchema]);

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  // Submit form
  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true);
    
    if (!validate()) {
      setIsSubmitting(false);
      return false;
    }

    try {
      await onSubmit(values);
      return true;
    } catch (error) {
      if (error.errors) {
        setErrors(error.errors);
      }
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, validate]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    handleChange,
    handleBlur,
    handleSubmit,
    validate,
    reset
  };
}

/**
 * Hook for pagination
 */
export function usePagination(initialPage = 1, initialPageSize = 10) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [totalItems, setTotalItems] = useState(0);

  const totalPages = Math.ceil(totalItems / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }, [totalPages]);

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasNextPage]);

  const previousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1);
    }
  }, [hasPreviousPage]);

  const reset = useCallback(() => {
    setCurrentPage(initialPage);
    setPageSize(initialPageSize);
    setTotalItems(0);
  }, [initialPage, initialPageSize]);

  return {
    currentPage,
    pageSize,
    totalItems,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    setCurrentPage: goToPage,
    setPageSize,
    setTotalItems,
    nextPage,
    previousPage,
    reset
  };
}

/**
 * Hook for debounced values
 */
export function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for local storage
 */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

/**
 * Hook for window size
 */
export function useWindowSize() {
  const [windowSize, setWindowSize] = useState({
    width: undefined,
    height: undefined,
  });

  useEffect(() => {
    function handleResize() {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    }

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
}

/**
 * Hook for click outside
 */
export function useClickOutside(callback) {
  const ref = useRef();

  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    }

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [callback]);

  return ref;
}

/**
 * Hook for previous value
 */
export function usePrevious(value) {
  const ref = useRef();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

/**
 * Hook for async operation
 */
export function useAsync(asyncFunction, immediate = true) {
  const [status, setStatus] = useState('idle');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async (...args) => {
    setStatus('pending');
    setData(null);
    setError(null);

    try {
      const result = await asyncFunction(...args);
      setData(result);
      setStatus('success');
      return result;
    } catch (error) {
      setError(error);
      setStatus('error');
      throw error;
    }
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    execute,
    status,
    data,
    error,
    isIdle: status === 'idle',
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error'
  };
}

/**
 * Hook for notifications
 */
export function useNotifications() {
  const { showSuccess, showError, showWarning, showInfo } = useApp();

  return {
    success: showSuccess,
    error: showError,
    warning: showWarning,
    info: showInfo
  };
}

/**
 * Hook for authentication checks
 */
export function useAuthCheck() {
  const { isAuthenticated, user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const isOwner = user?.role === 'owner';
  const isUser = user?.role === 'user';
  const hasRole = useCallback((role) => user?.role === role, [user]);
  const hasAnyRole = useCallback((roles) => roles.includes(user?.role), [user]);

  return {
    isAuthenticated,
    isAdmin,
    isOwner,
    isUser,
    hasRole,
    hasAnyRole,
    user
  };
}
