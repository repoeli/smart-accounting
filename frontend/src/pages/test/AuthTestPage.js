/**
 * Authentication Test Page
 * For debugging authentication flow
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import tokenStorage from '../../services/storage/tokenStorage';
import receiptService from '../../services/api/receiptService';

function AuthTestPage() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [testResults, setTestResults] = useState({});

  const runTests = async () => {
    console.log('🧪 Running authentication tests...');
    const results = {};

    // Test 1: Check auth state
    results.authState = {
      isAuthenticated,
      user: user ? 'present' : 'null',
      isLoading
    };

    // Test 2: Check stored tokens
    const tokens = tokenStorage.getTokens();
    results.storedTokens = {
      accessToken: tokens.accessToken ? 'present' : 'missing',
      refreshToken: tokens.refreshToken ? 'present' : 'missing',
      directAccess: localStorage.getItem('smart_accounting_token') ? 'present' : 'missing',
      directRefresh: localStorage.getItem('smart_accounting_refresh_token') ? 'present' : 'missing'
    };

    // Test 3: Try API call
    try {
      console.log('Testing API call...');
      const response = await receiptService.getReceipts({ limit: 1 });
      results.apiCall = {
        success: true,
        status: 'success',
        data: response
      };
    } catch (error) {
      results.apiCall = {
        success: false,
        status: 'error',
        error: error.message,
        statusCode: error.response?.status
      };
    }

    setTestResults(results);
    console.log('🧪 Test results:', results);
  };

  useEffect(() => {
    if (!isLoading) {
      runTests();
    }
  }, [isLoading, isAuthenticated]);

  const clearTokens = () => {
    tokenStorage.clearTokens();
    localStorage.clear();
    window.location.reload();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="space-y-6">
        {/* Auth State */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Authentication State</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Is Authenticated:</span>
              <span className={isAuthenticated ? 'text-green-600' : 'text-red-600'}>
                {isAuthenticated ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Is Loading:</span>
              <span>{isLoading ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between">
              <span>User:</span>
              <span>{user ? user.email : 'None'}</span>
            </div>
          </div>
        </div>

        {/* Token Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Token Status</h2>
          {testResults.storedTokens && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Access Token (tokenStorage):</span>
                <span className={testResults.storedTokens.accessToken === 'present' ? 'text-green-600' : 'text-red-600'}>
                  {testResults.storedTokens.accessToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Refresh Token (tokenStorage):</span>
                <span className={testResults.storedTokens.refreshToken === 'present' ? 'text-green-600' : 'text-red-600'}>
                  {testResults.storedTokens.refreshToken}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Access Token (localStorage):</span>
                <span className={testResults.storedTokens.directAccess === 'present' ? 'text-green-600' : 'text-red-600'}>
                  {testResults.storedTokens.directAccess}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Refresh Token (localStorage):</span>
                <span className={testResults.storedTokens.directRefresh === 'present' ? 'text-green-600' : 'text-red-600'}>
                  {testResults.storedTokens.directRefresh}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* API Test */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">API Test</h2>
          {testResults.apiCall && (
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>API Call Status:</span>
                <span className={testResults.apiCall.success ? 'text-green-600' : 'text-red-600'}>
                  {testResults.apiCall.status}
                </span>
              </div>
              {testResults.apiCall.error && (
                <div className="flex justify-between">
                  <span>Error:</span>
                  <span className="text-red-600">{testResults.apiCall.error}</span>
                </div>
              )}
              {testResults.apiCall.statusCode && (
                <div className="flex justify-between">
                  <span>Status Code:</span>
                  <span className="text-red-600">{testResults.apiCall.statusCode}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Actions</h2>
          <div className="space-x-4">
            <button
              onClick={runTests}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Run Tests
            </button>
            <button
              onClick={clearTokens}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Clear Tokens
            </button>
          </div>
        </div>

        {/* Raw Data */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Raw Test Results</h2>
          <pre className="bg-gray-100 dark:bg-gray-700 p-4 rounded text-sm overflow-auto">
            {JSON.stringify(testResults, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default AuthTestPage;
