/**
 * Private Layout Component
 * Layout for authenticated users with sidebar and header
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Header from './Header';
import Sidebar from './Sidebar';

function PrivateLayout() {
  const { theme, sidebarOpen } = useApp();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div
          className={`transition-all duration-300 ${
            sidebarOpen ? 'lg:ml-64' : 'lg:ml-16'
          }`}
        >
          {/* Header */}
          <Header />

          {/* Main content */}
          <main className="flex-1">
            <div className="px-4 sm:px-6 lg:px-8 py-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default PrivateLayout;
