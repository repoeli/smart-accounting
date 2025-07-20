/**
 * Email Verification Sent Page Component
 * Displays confirmation that verification email was sent
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function EmailVerificationSentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendSuccess, setResendSuccess] = useState(false);

  const email = location.state?.email || 'your email address';

  const handleResendEmail = async () => {
    if (!location.state?.email) {
      navigate('/register');
      return;
    }

    setIsResending(true);
    setResendMessage('');
    
    try {
      const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000/api/v1'}/accounts/resend-verification-email/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: location.state.email }),
      });

      if (response.ok) {
        setResendSuccess(true);
        setResendMessage('Verification email sent successfully! Please check your inbox.');
        
        // Reset success state after 5 seconds
        setTimeout(() => {
          setResendSuccess(false);
          setResendMessage('');
        }, 5000);
      } else {
        const errorData = await response.json();
        setResendMessage(errorData.error || 'Failed to resend verification email. Please try again.');
      }
    } catch (error) {
      setResendMessage('Network error. Please check your connection and try again.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            Check your email
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            We've sent a verification link to{' '}
            <span className="font-medium text-gray-900 dark:text-white">{email}</span>
          </p>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Click the link in the email to verify your account. The link will expire in 24 hours.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/50 border border-yellow-200 dark:border-yellow-700 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Didn't receive the email?
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Check your spam or junk folder</li>
                    <li>Make sure you entered the correct email address</li>
                    <li>Wait a few minutes for the email to arrive</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-3">
            {resendMessage && (
              <div className={`p-3 rounded-md text-sm mb-4 ${
                resendSuccess 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {resendMessage}
              </div>
            )}

            <button
              type="button"
              disabled={isResending || resendSuccess}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700"
              onClick={handleResendEmail}
            >
              {isResending ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-700 mr-2"></div>
                  Sending...
                </div>
              ) : resendSuccess ? (
                'Email Sent!'
              ) : (
                'Resend verification email'
              )}
            </button>

            <Link
              to="/register"
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Use a different email address
            </Link>

            <div className="text-center">
              <Link
                to="/login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Back to sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EmailVerificationSentPage;
