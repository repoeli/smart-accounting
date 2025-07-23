/**
 * Token Debug Component
 * Real-time token status monitoring
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import tokenStorage from '../../services/storage/tokenStorage';

function TokenDebug() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [tokenStatus, setTokenStatus] = useState({});
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const updateTokenStatus = () => {
    // Only update if component is visible and in development
    if (process.env.NODE_ENV !== 'development') return;
    
    const tokens = tokenStorage.getTokens();
    const directAccess = localStorage.getItem('smart_accounting_token');
    const directRefresh = localStorage.getItem('smart_accounting_refresh_token');
    
    setTokenStatus({
      // TokenStorage access
      tokenStorageAccess: tokens.accessToken ? 'present' : 'missing',
      tokenStorageRefresh: tokens.refreshToken ? 'present' : 'missing',
      
      // Direct localStorage access
      directAccess: directAccess ? 'present' : 'missing',
      directRefresh: directRefresh ? 'present' : 'missing',
      
      // Token details (first 20 chars only for security)
      accessTokenPreview: tokens.accessToken ? `${tokens.accessToken.substring(0, 20)}...` : 'none',
      refreshTokenPreview: tokens.refreshToken ? `${tokens.refreshToken.substring(0, 20)}...` : 'none',
      
      // Validation
      accessTokenValid: tokens.accessToken && !tokenStorage.isTokenExpired(tokens.accessToken),
      
      // Reduce localStorage scanning frequency
      allLocalStorageKeys: Object.keys(localStorage).filter(key => key.includes('smart_accounting'))
    });
    
    setLastUpdate(new Date());
  };

  useEffect(() => {
    updateTokenStatus();
    // Reduce update frequency from 1000ms to 5000ms (5 seconds) and only in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(updateTokenStatus, 5000); // Update every 5 seconds instead of 1
      return () => clearInterval(interval);
    }
  }, []);

  const getStatusColor = (status) => {
    if (status === 'present' || status === true) return 'text-green-600';
    if (status === 'missing' || status === false) return 'text-red-600';
    return 'text-gray-600';
  };

  const testApiCall = async () => {
    try {
      console.log('Testing API call with current tokens...');
      const receiptService = (await import('../../services/api/receiptService')).default;
      const response = await receiptService.getReceipts({ limit: 1 });
      console.log('API test successful:', response);
      alert('API call successful! Check console for details.');
    } catch (error) {
      console.error('API test failed:', error);
      alert(`API call failed: ${error.message}`);
    }
  };

  // Only render in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-4 max-w-md z-50">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          🔍 Token Debug
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={updateTokenStatus}
            className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
          >
            Refresh
          </button>
          <button
            onClick={testApiCall}
            className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
          >
            Test API
          </button>
        </div>
      </div>
      
      <div className="space-y-2 text-xs">
        {/* Auth State */}
        <div className="border-b pb-2">
          <div className="flex justify-between">
            <span>Authenticated:</span>
            <span className={getStatusColor(isAuthenticated)}>
              {isAuthenticated ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Loading:</span>
            <span>{isLoading ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span>User:</span>
            <span>{user?.email || 'None'}</span>
          </div>
        </div>

        {/* Token Status */}
        <div className="border-b pb-2">
          <div className="flex justify-between">
            <span>Access (Storage):</span>
            <span className={getStatusColor(tokenStatus.tokenStorageAccess)}>
              {tokenStatus.tokenStorageAccess}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Refresh (Storage):</span>
            <span className={getStatusColor(tokenStatus.tokenStorageRefresh)}>
              {tokenStatus.tokenStorageRefresh}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Access (Direct):</span>
            <span className={getStatusColor(tokenStatus.directAccess)}>
              {tokenStatus.directAccess}
            </span>
          </div>
          <div className="flex justify-between">
            <span>Refresh (Direct):</span>
            <span className={getStatusColor(tokenStatus.directRefresh)}>
              {tokenStatus.directRefresh}
            </span>
          </div>
        </div>

        {/* Token Preview */}
        <div className="border-b pb-2">
          <div className="text-gray-600 dark:text-gray-400">Access Token:</div>
          <div className="font-mono text-xs break-all">
            {tokenStatus.accessTokenPreview}
          </div>
          <div className="text-gray-600 dark:text-gray-400 mt-1">Refresh Token:</div>
          <div className="font-mono text-xs break-all">
            {tokenStatus.refreshTokenPreview}
          </div>
        </div>

        {/* Validation */}
        <div className="border-b pb-2">
          <div className="flex justify-between">
            <span>Token Valid:</span>
            <span className={getStatusColor(tokenStatus.accessTokenValid)}>
              {tokenStatus.accessTokenValid ? 'Yes' : 'No'}
            </span>
          </div>
        </div>

        {/* Storage Keys */}
        <div>
          <div className="text-gray-600 dark:text-gray-400">localStorage Keys:</div>
          <div className="text-xs text-gray-500">
            {tokenStatus.allLocalStorageKeys?.join(', ') || 'None'}
          </div>
        </div>

        {/* Last Update */}
        <div className="text-xs text-gray-500 text-center pt-2 border-t">
          Updated: {lastUpdate.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default TokenDebug;
