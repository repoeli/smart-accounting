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
  const { theme, sidebarOpen, setSidebar } = useApp();

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setSidebar(false)}
          />
        )}

        {/* Sidebar */}
        <Sidebar />

        {/* Main content area */}
        <div
          className={`fixed top-0 bottom-0 transition-all duration-300 ${
            sidebarOpen ? 'left-52' : 'left-16'
          } right-0 flex flex-col`}
        >
          {/* Header */}
          <Header />

          {/* Main content - aligned with sidebar navigation */}
          <main className="flex-1 bg-gray-50 dark:bg-gray-900 pt-4 overflow-y-auto">
            <div className="max-w-full w-full px-4 sm:px-6 lg:px-8 pb-4 min-h-full">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

export default PrivateLayout;
