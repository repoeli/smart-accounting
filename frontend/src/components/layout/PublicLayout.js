/**
 * Public Layout Component
 * Layout for public pages (auth pages, landing page, etc.)
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';

function PublicLayout() {
  const { theme } = useApp();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Header for public pages */}
        <header className="bg-white dark:bg-gray-800 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Smart Accounting
                </h1>
              </div>

              {/* Navigation for public pages */}
              <nav className="hidden md:flex space-x-4">
                <a
                  href="/login"
                  className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign In
                </a>
                <a
                  href="/register"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sign Up
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main>
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center text-gray-600 dark:text-gray-400">
              <p>&copy; 2024 Smart Accounting. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default PublicLayout;
