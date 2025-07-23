/**
 * App Context
 * Provides global application state and settings
 */

import React, { createContext, useContext, useReducer, useEffect } from 'react';

// Initial state
const initialState = {
  theme: 'light',
  sidebarOpen: typeof window !== 'undefined' ? window.innerWidth >= 1024 : true, // Only open by default on desktop (lg breakpoint)
  notifications: [],
  loading: false,
  error: null,
  settings: {
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    timezone: 'UTC',
    language: 'en'
  }
};

// Action types
const APP_ACTIONS = {
  SET_THEME: 'SET_THEME',
  TOGGLE_SIDEBAR: 'TOGGLE_SIDEBAR',
  SET_SIDEBAR: 'SET_SIDEBAR',
  ADD_NOTIFICATION: 'ADD_NOTIFICATION',
  REMOVE_NOTIFICATION: 'REMOVE_NOTIFICATION',
  CLEAR_NOTIFICATIONS: 'CLEAR_NOTIFICATIONS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS'
};

// Reducer
function appReducer(state, action) {
  switch (action.type) {
    case APP_ACTIONS.SET_THEME:
      return {
        ...state,
        theme: action.payload
      };
      
    case APP_ACTIONS.TOGGLE_SIDEBAR:
      return {
        ...state,
        sidebarOpen: !state.sidebarOpen
      };
      
    case APP_ACTIONS.SET_SIDEBAR:
      return {
        ...state,
        sidebarOpen: action.payload
      };
      
    case APP_ACTIONS.ADD_NOTIFICATION:
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
      
    case APP_ACTIONS.REMOVE_NOTIFICATION:
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload
        )
      };
      
    case APP_ACTIONS.CLEAR_NOTIFICATIONS:
      return {
        ...state,
        notifications: []
      };
      
    case APP_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
      
    case APP_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload
      };
      
    case APP_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null
      };
      
    case APP_ACTIONS.UPDATE_SETTINGS:
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload
        }
      };
      
    default:
      return state;
  }
}

// Create context
const AppContext = createContext();

// Provider component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load saved preferences on mount
  useEffect(() => {
    loadPreferences();
    
    // Handle window resize for responsive sidebar
    const handleResize = () => {
      if (typeof window === 'undefined') return;
      
      if (window.innerWidth >= 1024) {
        // Desktop: ensure sidebar is open if not explicitly closed
        const savedSidebar = localStorage.getItem('app_sidebar_open');
        if (savedSidebar === null || JSON.parse(savedSidebar) === true) {
          dispatch({ type: APP_ACTIONS.SET_SIDEBAR, payload: true });
        }
      } else {
        // Mobile: close sidebar
        dispatch({ type: APP_ACTIONS.SET_SIDEBAR, payload: false });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      handleResize(); // Call once on mount

      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Save preferences when they change
  useEffect(() => {
    savePreferences();
  }, [state.theme, state.sidebarOpen, state.settings]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Load user preferences from localStorage
   */
  function loadPreferences() {
    try {
      const savedTheme = localStorage.getItem('app_theme');
      const savedSidebar = localStorage.getItem('app_sidebar_open');
      const savedSettings = localStorage.getItem('app_settings');

      if (savedTheme) {
        dispatch({ type: APP_ACTIONS.SET_THEME, payload: savedTheme });
      }

      if (savedSidebar !== null) {
        dispatch({
          type: APP_ACTIONS.SET_SIDEBAR,
          payload: JSON.parse(savedSidebar)
        });
      }

      if (savedSettings) {
        dispatch({
          type: APP_ACTIONS.UPDATE_SETTINGS,
          payload: JSON.parse(savedSettings)
        });
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    }
  }

  /**
   * Save user preferences to localStorage
   */
  function savePreferences() {
    try {
      localStorage.setItem('app_theme', state.theme);
      localStorage.setItem('app_sidebar_open', JSON.stringify(state.sidebarOpen));
      localStorage.setItem('app_settings', JSON.stringify(state.settings));
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  }

  /**
   * Toggle theme between light and dark
   */
  function toggleTheme() {
    const newTheme = state.theme === 'light' ? 'dark' : 'light';
    dispatch({ type: APP_ACTIONS.SET_THEME, payload: newTheme });
  }

  /**
   * Set specific theme
   */
  function setTheme(theme) {
    dispatch({ type: APP_ACTIONS.SET_THEME, payload: theme });
  }

  /**
   * Toggle sidebar open/closed
   */
  function toggleSidebar() {
    dispatch({ type: APP_ACTIONS.TOGGLE_SIDEBAR });
  }

  /**
   * Set sidebar state
   */
  function setSidebar(isOpen) {
    dispatch({ type: APP_ACTIONS.SET_SIDEBAR, payload: isOpen });
  }

  /**
   * Add notification
   */
  function addNotification(notification) {
    const id = Date.now() + Math.random();
    const notificationWithId = {
      id,
      type: 'info',
      duration: 5000,
      ...notification
    };

    dispatch({
      type: APP_ACTIONS.ADD_NOTIFICATION,
      payload: notificationWithId
    });

    // Auto-remove notification after duration
    if (notificationWithId.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notificationWithId.duration);
    }

    return id;
  }

  /**
   * Remove notification by ID
   */
  function removeNotification(id) {
    dispatch({ type: APP_ACTIONS.REMOVE_NOTIFICATION, payload: id });
  }

  /**
   * Clear all notifications
   */
  function clearNotifications() {
    dispatch({ type: APP_ACTIONS.CLEAR_NOTIFICATIONS });
  }

  /**
   * Show success notification
   */
  function showSuccess(message, options = {}) {
    return addNotification({
      type: 'success',
      message,
      ...options
    });
  }

  /**
   * Show error notification
   */
  function showError(message, options = {}) {
    return addNotification({
      type: 'error',
      message,
      duration: 0, // Don't auto-remove error notifications
      ...options
    });
  }

  /**
   * Show warning notification
   */
  function showWarning(message, options = {}) {
    return addNotification({
      type: 'warning',
      message,
      ...options
    });
  }

  /**
   * Show info notification
   */
  function showInfo(message, options = {}) {
    return addNotification({
      type: 'info',
      message,
      ...options
    });
  }

  /**
   * Set global loading state
   */
  function setLoading(loading) {
    dispatch({ type: APP_ACTIONS.SET_LOADING, payload: loading });
  }

  /**
   * Set global error
   */
  function setError(error) {
    dispatch({ type: APP_ACTIONS.SET_ERROR, payload: error });
  }

  /**
   * Clear global error
   */
  function clearError() {
    dispatch({ type: APP_ACTIONS.CLEAR_ERROR });
  }

  /**
   * Update application settings
   */
  function updateSettings(newSettings) {
    dispatch({ type: APP_ACTIONS.UPDATE_SETTINGS, payload: newSettings });
  }

  // Context value
  const value = {
    // State
    theme: state.theme,
    sidebarOpen: state.sidebarOpen,
    notifications: state.notifications,
    loading: state.loading,
    error: state.error,
    settings: state.settings,
    
    // Theme actions
    toggleTheme,
    setTheme,
    
    // Sidebar actions
    toggleSidebar,
    setSidebar,
    
    // Notification actions
    addNotification,
    removeNotification,
    clearNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    
    // Global state actions
    setLoading,
    setError,
    clearError,
    
    // Settings actions
    updateSettings
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

// Hook to use app context
export function useApp() {
  const context = useContext(AppContext);
  
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  
  return context;
}

export default AppContext;
