/**
 * Environment configuration
 */
export const ENV = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1',
  API_TIMEOUT: parseInt(process.env.REACT_APP_API_TIMEOUT) || 10000,
  TOKEN_REFRESH_THRESHOLD: parseInt(process.env.REACT_APP_TOKEN_REFRESH_THRESHOLD) || 300000,
  APP_NAME: process.env.REACT_APP_APP_NAME || 'Smart Accounting',
  VERSION: process.env.REACT_APP_VERSION || '1.0.0',
  DEBUG: process.env.REACT_APP_DEBUG === 'true',
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
};

// Debug logging in development
if (ENV.isDevelopment) {
  console.log('Environment Configuration:', {
    API_URL: ENV.API_URL,
    NODE_ENV: process.env.NODE_ENV,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
  });
}

export default ENV;
