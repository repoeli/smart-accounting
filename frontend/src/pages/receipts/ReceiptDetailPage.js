/**
 * Receipt Detail Page Component
 * Individual receipt view and edit page
 */

import React from 'react';
import { useParams } from 'react-router-dom';

function ReceiptDetailPage() {
  const { id } = useParams();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Receipt Details
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Receipt ID: {id}
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Receipt detail component coming soon
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This will show detailed receipt information
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReceiptDetailPage;
