/**
 * Not Found Page Component
 * 404 error page
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-9xl font-bold text-gray-300 dark:text-gray-700">
            404
          </h1>
          <h2 className="mt-6 text-2xl font-bold text-gray-900 dark:text-white">
            Page not found
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            The page you're looking for doesn't exist.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => navigate(-1)}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go back
          </button>
          
          <button
            onClick={() => navigate('/dashboard')}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;
