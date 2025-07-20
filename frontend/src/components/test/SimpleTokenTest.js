/**
 * Simple Token Test Component
 * Minimal test to verify token flow
 */

import React, { useState } from 'react';
import authService from '../../services/api/authService';
import tokenStorage from '../../services/storage/tokenStorage';
import httpClient from '../../services/http/httpClient';
import { API_CONFIG } from '../../config/api';

function SimpleTokenTest() {
  const [logs, setLogs] = useState([]);
  
  const addLog = (message) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const testLogin = async () => {
    setLogs([]);
    addLog('🚀 Starting login test...');
    
    try {
      // Test with your actual credentials
      const credentials = {
        email: 'test@example.com', // Replace with your test email
        password: 'your-password'   // Replace with your test password
      };
      
      addLog('📝 Attempting login with credentials...');
      const result = await authService.login(credentials);
      addLog(`✅ Login result: ${JSON.stringify(result, null, 2)}`);
      
      // Check token storage immediately
      addLog('🔍 Checking token storage...');
      const tokens = tokenStorage.getTokens();
      addLog(`📦 Tokens from storage: access=${tokens.accessToken ? 'YES' : 'NO'}, refresh=${tokens.refreshToken ? 'YES' : 'NO'}`);
      
      // Check localStorage directly
      const directAccess = localStorage.getItem('smart_accounting_token');
      const directRefresh = localStorage.getItem('smart_accounting_refresh_token');
      addLog(`🗄️ Direct localStorage: access=${directAccess ? 'YES' : 'NO'}, refresh=${directRefresh ? 'YES' : 'NO'}`);
      
      // Wait and test API call
      addLog('⏳ Waiting 2 seconds then testing API call...');
      setTimeout(async () => {
        try {
          addLog('🌐 Making test API call...');
          const response = await httpClient.get('/api/v1/receipts/?limit=1');
          addLog(`✅ API call successful: ${response.status}`);
        } catch (error) {
          addLog(`❌ API call failed: ${error.response?.status} - ${error.message}`);
        }
      }, 2000);
      
    } catch (error) {
      addLog(`❌ Login failed: ${error.message}`);
    }
  };

  const clearStorage = () => {
    localStorage.clear();
    setLogs([]);
    addLog('🧹 Storage cleared');
  };

  const checkStorage = () => {
    addLog('🔍 Current storage state:');
    const tokens = tokenStorage.getTokens();
    addLog(`TokenStorage: access=${tokens.accessToken ? 'YES' : 'NO'}, refresh=${tokens.refreshToken ? 'YES' : 'NO'}`);
    
    const directAccess = localStorage.getItem('smart_accounting_token');
    const directRefresh = localStorage.getItem('smart_accounting_refresh_token');
    addLog(`Direct: access=${directAccess ? 'YES' : 'NO'}, refresh=${directRefresh ? 'YES' : 'NO'}`);
    
    addLog(`All keys: ${Object.keys(localStorage).join(', ')}`);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Simple Token Test</h1>
      
      <div className="space-x-4 mb-6">
        <button
          onClick={testLogin}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Login Flow
        </button>
        <button
          onClick={checkStorage}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Check Storage
        </button>
        <button
          onClick={clearStorage}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Clear Storage
        </button>
      </div>
      
      <div className="bg-gray-100 p-4 rounded-lg">
        <h2 className="font-semibold mb-2">Logs:</h2>
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SimpleTokenTest;
