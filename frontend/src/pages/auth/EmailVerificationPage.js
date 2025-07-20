/**
 * Email Verification Page Component
 * Handles email verification with token
 */

/**
 * Email Verification Page Component
 * Handles email verification with token - BULLETPROOF VERSION
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import emailVerificationManager from '../../services/verification/EmailVerificationManager';

function EmailVerificationPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const [status, setStatus] = useState('checking'); // checking, verifying, success, error
  const [message, setMessage] = useState('');
  
  // Use useRef to prevent multiple effect runs
  const hasInitialized = useRef(false);
  const componentMounted = useRef(true);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      componentMounted.current = false;
    };
  }, []);

  useEffect(() => {
    console.log('🔄 EmailVerificationPage: useEffect triggered');
    console.log('📋 State: hasInitialized =', hasInitialized.current, 'componentMounted =', componentMounted.current);
    console.log('🎫 Token:', token ? token.substring(0, 30) + '...' : 'No token');

    // Prevent multiple initializations
    if (hasInitialized.current) {
      console.log('⏭️ EmailVerificationPage: Already initialized, skipping');
      return;
    }

    // Exit early if no token
    if (!token) {
      console.log('❌ EmailVerificationPage: No token provided');
      setStatus('error');
      setMessage('No verification token provided.');
      return;
    }

    // Mark as initialized immediately to prevent race conditions
    hasInitialized.current = true;

    const performVerification = async () => {
      // Check if component is still mounted
      if (!componentMounted.current) {
        console.log('🚫 Component unmounted during verification, aborting');
        return;
      }

      // Check global verification manager first
      const globalStatus = emailVerificationManager.getStatus(token);
      console.log('📊 Global verification status:', globalStatus);

      if (globalStatus === 'completed') {
        console.log('✅ Token already verified globally, showing success');
        setStatus('success');
        setMessage('Your email has been successfully verified! You can now sign in to your account.');
        
        // Redirect after delay
        setTimeout(() => {
          if (componentMounted.current) {
            navigate('/login', { 
              state: { 
                message: 'Email verified successfully! You can now sign in.' 
              }
            });
          }
        }, 3000);
        return;
      }

      if (globalStatus === 'verifying') {
        console.log('⏳ Verification already in progress globally');
        setStatus('verifying');
        setMessage('Email verification in progress...');
        
        // Poll for completion (fallback mechanism)
        const pollForCompletion = () => {
          setTimeout(() => {
            if (!componentMounted.current) return;
            
            const newStatus = emailVerificationManager.getStatus(token);
            if (newStatus === 'completed') {
              setStatus('success');
              setMessage('Your email has been successfully verified! You can now sign in to your account.');
              
              setTimeout(() => {
                if (componentMounted.current) {
                  navigate('/login', { 
                    state: { 
                      message: 'Email verified successfully! You can now sign in.' 
                    }
                  });
                }
              }, 2000);
            } else if (newStatus === 'verifying') {
              pollForCompletion(); // Continue polling
            } else {
              // Something went wrong, try verification
              performActualVerification();
            }
          }, 1000);
        };
        
        pollForCompletion();
        return;
      }

      // Perform actual verification
      performActualVerification();
    };

    const performActualVerification = async () => {
      if (!componentMounted.current) return;

      console.log('🚀 EmailVerificationPage: Starting actual verification');
      setStatus('verifying');
      setMessage('Verifying your email address...');
      
      try {
        const result = await verifyEmail(token);
        console.log('📨 EmailVerificationPage: Verification result:', result);
        
        if (!componentMounted.current) {
          console.log('🚫 Component unmounted after verification, ignoring result');
          return;
        }
        
        if (result.success) {
          setStatus('success');
          let successMessage = result.message || 'Your email has been successfully verified! You can now sign in to your account.';
          
          if (result.cached) {
            successMessage = 'Your email was already verified! You can sign in to your account.';
          } else if (result.assumedSuccess) {
            successMessage = 'Email verification completed! If you can log in, your email is verified.';
          }
          
          setMessage(successMessage);
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            if (componentMounted.current) {
              navigate('/login', { 
                state: { 
                  message: 'Email verified successfully! You can now sign in.' 
                }
              });
            }
          }, 3000);
        } else {
          setStatus('error');
          setMessage(result.error?.message || 'Email verification failed. The token may be expired or invalid.');
        }
      } catch (error) {
        console.error('❌ EmailVerificationPage: Verification error:', error);
        
        if (!componentMounted.current) return;
        
        setStatus('error');
        let errorMessage = 'An unexpected error occurred during verification.';
        
        if (error.message?.includes('already in progress')) {
          errorMessage = 'Email verification is already in progress. Please wait...';
          setStatus('verifying');
          
          // Retry after delay
          setTimeout(() => {
            if (componentMounted.current) {
              performVerification();
            }
          }, 2000);
          return;
        }
        
        setMessage(errorMessage);
      }
    };

    performVerification();
    
    // Only depend on token to prevent re-runs
  }, [token]); // Removed verifyEmail and navigate from dependencies

  const renderContent = () => {
    switch (status) {
      case 'checking':
        return (
          <div className="text-center">
            <div className="animate-pulse rounded-full h-12 w-12 border-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Checking verification status...
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Please wait while we check your email verification.
            </p>
          </div>
        );

      case 'verifying':
        return (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Verifying your email...
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {message || 'Please wait while we verify your email address.'}
            </p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Email Verified!
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {message}
            </p>
            <div className="mt-6">
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign In to Your Account
              </Link>
            </div>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
              Verification Status
            </h2>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {message}
            </p>
            <div className="mt-6 space-y-3">
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Sign In
              </Link>
              <div>
                <Link
                  to="/register"
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Register Again
                </Link>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {renderContent()}
      </div>
    </div>
  );
}

export default EmailVerificationPage;
