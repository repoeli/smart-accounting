/**
 * Development Authentication Helper
 * Quick authentication setup for testing purposes
 */

// JWT token we generated for the test user (test@example.com)
const DEV_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUzMzMwMTU5LCJpYXQiOjE3NTMzMjgzNTksImp0aSI6ImYzNjZmY2FhNWFmNzQ1NzQ5MzI5ZDExY2IzYTJhNzgxIiwidXNlcl9pZCI6MTN9.X_XTSeLYfgDwUE9mSA3E_sWvtatdH6foa3Jy525O5nU";

const DEV_USER = {
  id: 13,
  email: "test@example.com",
  username: "testuser",
  first_name: "Test",
  last_name: "User",
  is_active: true,
  email_verified: false
};

/**
 * Quick authentication setup for development/testing
 * Run this in browser console to authenticate instantly
 */
export const setupDevAuth = () => {
  console.log('🔧 Setting up development authentication...');
  
  // Set tokens in localStorage
  localStorage.setItem('smart_accounting_token', DEV_TOKEN);
  localStorage.setItem('smart_accounting_user', JSON.stringify(DEV_USER));
  
  console.log('✅ Development authentication set up successfully!');
  console.log('👤 Authenticated as:', DEV_USER.email);
  console.log('🔑 Token stored in localStorage');
  console.log('🚀 You can now access protected routes!');
  console.log('📋 Visit /subscriptions/test to test Stripe integration');
  
  // Reload the page to apply authentication
  window.location.reload();
};

/**
 * Clear authentication
 */
export const clearDevAuth = () => {
  localStorage.removeItem('smart_accounting_token');
  localStorage.removeItem('smart_accounting_refresh_token');
  localStorage.removeItem('smart_accounting_user');
  console.log('🧹 Development authentication cleared');
  window.location.reload();
};

// Make functions available globally for console use
if (typeof window !== 'undefined') {
  window.setupDevAuth = setupDevAuth;
  window.clearDevAuth = clearDevAuth;
  
  console.log('🛠️  Development Auth Helper Loaded');
  console.log('💡 Run setupDevAuth() in console to authenticate quickly');
  console.log('🧹 Run clearDevAuth() to clear authentication');
}

export default {
  setupDevAuth,
  clearDevAuth,
  DEV_TOKEN,
  DEV_USER
};
