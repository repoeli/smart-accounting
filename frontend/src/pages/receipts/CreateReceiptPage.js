/**
 * Create Receipt Page Component
 * Form for creating new receipts
 */

import React from 'react';

function CreateReceiptPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Add New Receipt
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload and process a new receipt
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="text-center py-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Receipt creation form coming soon
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This will include image upload and OCR processing
          </p>
        </div>
      </div>
    </div>
  );
}

export default CreateReceiptPage;
