/**
 * Email Verification Test Component
 * For testing the email verification fix with debugging
 */

import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import emailVerificationManager from '../../services/verification/EmailVerificationManager';

function EmailVerificationTest() {
  const { verifyEmail } = useAuth();
  const [token, setToken] = useState('');
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [globalStatus, setGlobalStatus] = useState(null);

  const checkGlobalStatus = () => {
    if (!token.trim()) {
      setGlobalStatus({ error: 'Please enter a token' });
      return;
    }
    
    const status = emailVerificationManager.getStatus(token);
    setGlobalStatus({ status, timestamp: new Date().toISOString() });
  };

  const clearToken = () => {
    if (!token.trim()) {
      setGlobalStatus({ error: 'Please enter a token' });
      return;
    }
    
    emailVerificationManager.clearToken(token);
    setGlobalStatus({ cleared: true, timestamp: new Date().toISOString() });
    setResult(null);
  };

  const clearAll = () => {
    emailVerificationManager.clearAll();
    setGlobalStatus({ clearedAll: true, timestamp: new Date().toISOString() });
    setResult(null);
  };

  const testVerification = async () => {
    if (!token.trim()) {
      setResult({ error: 'Please enter a token' });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      console.log('EmailVerificationTest: Testing with token:', token);
      const response = await verifyEmail(token);
      console.log('EmailVerificationTest: Response:', response);
      setResult(response);
    } catch (error) {
      console.error('EmailVerificationTest: Error:', error);
      setResult({ 
        success: false, 
        error: { message: error.message || 'Test failed' } 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        Email Verification Test & Debug
      </h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Test Interface */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Verification Token
            </label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your email verification token here..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              rows={4}
            />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={testVerification}
              disabled={isLoading || !token.trim()}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Testing...' : 'Test Verification'}
            </button>
            
            <button
              onClick={checkGlobalStatus}
              disabled={!token.trim()}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Check Status
            </button>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={clearToken}
              disabled={!token.trim()}
              className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Clear This Token
            </button>
            
            <button
              onClick={clearAll}
              className="flex-1 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
            >
              Clear All
            </button>
          </div>
        </div>
        
        {/* Right Column - Results */}
        <div className="space-y-4">
          {/* Global Status */}
          {globalStatus && (
            <div className="p-4 rounded-md bg-blue-50 border border-blue-200 dark:bg-blue-900 dark:border-blue-700">
              <h3 className="font-medium mb-2 text-blue-900 dark:text-blue-100">
                🔍 Global Status
              </h3>
              <pre className="text-xs bg-blue-100 dark:bg-blue-800 p-2 rounded overflow-auto">
                {JSON.stringify(globalStatus, null, 2)}
              </pre>
            </div>
          )}
          
          {/* Test Results */}
          {result && (
            <div className={`p-4 rounded-md ${
              result.success 
                ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900 dark:border-green-700 dark:text-green-100' 
                : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-100'
            }`}>
              <h3 className="font-medium mb-2">
                {result.success ? '✅ Success' : '❌ Failed'}
              </h3>
              
              {result.success ? (
                <div>
                  <p className="mb-2">{result.message}</p>
                  {result.cached && <p className="text-sm opacity-75">📋 From cache</p>}
                  {result.assumedSuccess && <p className="text-sm opacity-75">🔄 Assumed success (400 converted)</p>}
                </div>
              ) : (
                <div>
                  <p className="mb-2">{result.error?.message}</p>
                  {result.error?.status && (
                    <p className="text-sm opacity-75">Status: {result.error.status}</p>
                  )}
                </div>
              )}
              
              <details className="mt-3">
                <summary className="cursor-pointer text-sm opacity-75">
                  View Full Response
                </summary>
                <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </div>
      
      {/* Instructions */}
      <div className="mt-6 bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
        <h4 className="font-medium mb-2 text-gray-900 dark:text-white">Test Instructions:</h4>
        <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
          <li>1. Register a new account and get verification email</li>
          <li>2. Copy the token from the verification URL</li>
          <li>3. Use "Check Status" to see global verification state</li>
          <li>4. Use "Test Verification" to test the verification process</li>
          <li>5. Check browser console for detailed logs</li>
          <li>6. Use "Clear" buttons to reset state for testing</li>
        </ol>
        
        <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-900 rounded text-sm">
          <strong>Debugging Tips:</strong>
          <ul className="mt-1 space-y-1">
            <li>• Global status "completed" means token was already verified</li>
            <li>• Global status "verifying" means verification is in progress</li>
            <li>• "Clear This Token" resets state for one token</li>
            <li>• "Clear All" resets all verification state</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationTest;
