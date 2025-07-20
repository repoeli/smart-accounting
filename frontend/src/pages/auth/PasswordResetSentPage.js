/**
 * Password Reset Sent Page Component
 * Displays confirmation that password reset email was sent
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';

function PasswordResetSentPage() {
  const location = useLocation();
  const email = location.state?.email || 'your email address';

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
            We've sent a password reset link to{' '}
            <span className="font-medium text-gray-900 dark:text-white">{email}</span>
          </p>
          <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
            Click the link in the email to reset your password. The link will expire in 1 hour.
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
            <Link
              to="/forgot-password"
              className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Send another reset email
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

export default PasswordResetSentPage;
