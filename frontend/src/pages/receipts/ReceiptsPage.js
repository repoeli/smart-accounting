/**
 * Receipts Page Component
 * Main receipts listing and management page
 */

import React from 'react';

function ReceiptsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Receipts
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your receipts and expenses
          </p>
        </div>
        
        <a
          href="/receipts/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Add Receipt
        </a>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Receipts component coming soon
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This component will be implemented with full CRUD functionality
          </p>
        </div>
      </div>
    </div>
  );
}

export default ReceiptsPage;
