import React from 'react';
import { useAuth } from '../../context/AuthContext';

const DashboardPage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Dashboard
            </h1>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              Logout
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Welcome, {user?.first_name}!
              </h3>
              <p className="text-blue-700 dark:text-blue-300">
                You are successfully logged in to Smart Accounting.
              </p>
            </div>

            <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-2">
                Account Status
              </h3>
              <p className="text-green-700 dark:text-green-300">
                Plan: {user?.subscription_plan}
              </p>
              <p className="text-green-700 dark:text-green-300">
                Email: {user?.email}
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900 dark:text-purple-100 mb-2">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button className="block w-full text-left text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100">
                  Upload Receipt
                </button>
                <button className="block w-full text-left text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100">
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;