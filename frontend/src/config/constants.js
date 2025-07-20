/**
 * Application Constants
 */

// Authentication
export const AUTH_CONSTANTS = {
  TOKEN_KEY: 'smart_accounting_token',
  REFRESH_TOKEN_KEY: 'smart_accounting_refresh_token',
  USER_KEY: 'smart_accounting_user',
  TOKEN_EXPIRY_THRESHOLD: 5 * 60 * 1000, // 5 minutes in ms
};

// UI Constants
export const UI_CONSTANTS = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
  DESKTOP_BREAKPOINT: 1200,
};

// Form Validation
export const VALIDATION_RULES = {
  EMAIL: {
    required: 'Email is required',
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: 'Invalid email address',
    },
  },
  PASSWORD: {
    required: 'Password is required',
    minLength: {
      value: 8,
      message: 'Password must be at least 8 characters',
    },
  },
  CONFIRM_PASSWORD: {
    required: 'Please confirm your password',
    validate: (value, { password }) => 
      value === password || 'Passwords do not match',
  },
  FIRST_NAME: {
    required: 'First name is required',
    minLength: {
      value: 2,
      message: 'First name must be at least 2 characters',
    },
  },
  LAST_NAME: {
    required: 'Last name is required',
    minLength: {
      value: 2,
      message: 'Last name must be at least 2 characters',
    },
  },
};

// Status Constants
export const STATUS = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
};

// User Types
export const USER_TYPES = {
  INDIVIDUAL: 'individual',
  ACCOUNTING_FIRM: 'accounting_firm',
};

// Subscription Status
export const SUBSCRIPTION_STATUS = {
  ACTIVE: 'active',
  CANCELLED: 'cancelled',
  PAST_DUE: 'past_due',
  TRIALING: 'trialing',
  UNPAID: 'unpaid',
};

// Notification Types
export const NOTIFICATION_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Routes
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  VERIFY_EMAIL: '/verify-email',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  DASHBOARD: '/dashboard',
  RECEIPTS: '/receipts',
  RECEIPT_DETAIL: '/receipts/:id',
  PROFILE: '/profile',
  SUBSCRIPTIONS: '/subscriptions',
  NOT_FOUND: '/404',
};

export default {
  AUTH_CONSTANTS,
  UI_CONSTANTS,
  VALIDATION_RULES,
  STATUS,
  USER_TYPES,
  SUBSCRIPTION_STATUS,
  NOTIFICATION_TYPES,
  ROUTES,
};
