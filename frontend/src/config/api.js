import ENV from './environment';

/**
 * API Configuration
 */
export const API_CONFIG = {
  BASE_URL: ENV.API_URL,
  TIMEOUT: ENV.API_TIMEOUT,
  
  // API Endpoints
  ENDPOINTS: {
    // Authentication
    AUTH: {
      LOGIN: '/accounts/token/',
      REFRESH: '/accounts/token/refresh/',
      LOGOUT: '/accounts/logout/',
      REGISTER: '/accounts/register/',
      VERIFY_EMAIL: '/accounts/verify-email/',
      RESEND_VERIFICATION: '/accounts/resend-verification-email/',
      FORGOT_PASSWORD: '/accounts/password/reset/',
      RESET_PASSWORD: '/accounts/reset-password/',
      CHANGE_PASSWORD: '/accounts/change_password/',
      PROFILE: '/accounts/me/',
    },
    
    // User Management
    USER: {
      PROFILE: '/accounts/me/',
      UPDATE_PROFILE: '/accounts/update_profile/',
    },
    
    // Receipts
    RECEIPTS: {
      LIST: '/receipts/',
      DETAIL: '/receipts/:id/',
      CREATE: '/receipts/',
      UPDATE: '/receipts/:id/',
      DELETE: '/receipts/:id/',
      UPLOAD: '/receipts/:id/upload/',
      PROCESS: '/receipts/:id/process/',
      REPROCESS: (id) => `/receipts/${id}/reprocess/`,
      API_STATUS: '/receipts/api_status/',
      STATS: '/receipts/stats/',
      DASHBOARD: '/receipts/dashboard/',
      CATEGORIES: '/receipts/categories/',
      EXPORT: '/receipts/export/',
    },
    
    // Subscriptions
    SUBSCRIPTIONS: {
      LIST: '/subscriptions/',
      DETAIL: (id) => `/subscriptions/${id}/`,
    },
  },
  
  // Request Headers
  HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

export default API_CONFIG;
