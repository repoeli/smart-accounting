/**
 * Profile Page Component
 * User profile management page
 */

import React from 'react';
import { useAuth } from '../../context/AuthContext';

function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          User Information
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <p className="text-gray-900 dark:text-white">{user?.email}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              First Name
            </label>
            <p className="text-gray-900 dark:text-white">{user?.first_name || 'Not set'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Last Name
            </label>
            <p className="text-gray-900 dark:text-white">{user?.last_name || 'Not set'}</p>
          </div>
        </div>
        
        <div className="mt-6">
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
            Edit Profile
          </button>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
