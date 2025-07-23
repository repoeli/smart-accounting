/**
 * Simple Login Test Component
 * Basic form to test authentication without complex interceptors
 */

import React, { useState } from 'react';

const SimpleLoginTest = () => {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testLogin = async () => {
    setLoading(true);
    setResult(null);

    try {
      console.log('🧪 Simple Login Test Starting...');
      
      const response = await fetch('http://localhost:8000/api/v1/accounts/token/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: 'ineliyow@gmail.com',
          password: 'Password123',
        }),
      });

      console.log('📡 Response received:', response);
      console.log('Status:', response.status);
      console.log('Headers:', Object.fromEntries(response.headers.entries()));

      const data = await response.text();
      console.log('📄 Response body:', data);

      setResult({
        success: response.ok,
        status: response.status,
        data: data,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('❌ Login test failed:', error);
      setResult({
        success: false,
        error: error.message,
        name: error.name,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', background: '#f5f5f5', margin: '20px', borderRadius: '8px' }}>
      <h3>🧪 Simple Login Test</h3>
      <button 
        onClick={testLogin} 
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: loading ? '#ccc' : '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer',
        }}
      >
        {loading ? 'Testing...' : 'Test Login'}
      </button>
      
      {result && (
        <div style={{ marginTop: '20px', padding: '15px', background: 'white', borderRadius: '4px' }}>
          <h4>Result:</h4>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SimpleLoginTest;
