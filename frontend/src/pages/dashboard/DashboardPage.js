/**
 * Dashboard Page Component
 * Main dashboard overview for authenticated users
 */

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useApi } from '../../hooks';
import receiptService from '../../services/api/receiptService';
import tokenStorage from '../../services/storage/tokenStorage';
import TokenDebug from '../../components/debug/TokenDebug';
import { formatCurrency, formatDate } from '../../utils';

function DashboardPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [stats, setStats] = useState({
    totalReceipts: 0,
    totalAmount: 0,
    thisMonthAmount: 0,
    pendingReceipts: 0
  });
  
  const { data: recentReceipts, loading: receiptsLoading, execute: fetchRecentReceipts } = useApi(
    () => receiptService.getReceipts({ limit: 5, ordering: '-created_at' })
  );

  useEffect(() => {
    console.log('🏠 DashboardPage: useEffect triggered');
    console.log('Authentication state:', { 
      isAuthenticated, 
      authLoading, 
      user: user ? 'present' : 'null' 
    });

    // Only proceed if user is authenticated and not loading
    if (!authLoading && isAuthenticated) {
      console.log('✅ DashboardPage: User is authenticated, checking tokens...');
      
      const tokens = tokenStorage.getTokens();
      console.log('DashboardPage: Available tokens:', {
        access: tokens.accessToken ? 'present' : 'missing',
        refresh: tokens.refreshToken ? 'present' : 'missing'
      });

      if (tokens.accessToken) {
        console.log('✅ DashboardPage: Tokens available, starting API calls with delay...');
        
        // Add a longer delay to ensure everything is properly initialized
        const timer = setTimeout(() => {
          console.log('🚀 DashboardPage: Executing fetchRecentReceipts...');
          fetchRecentReceipts().catch(error => {
            console.error('❌ DashboardPage: fetchRecentReceipts failed:', error);
            
            // If it's an auth error, don't retry immediately
            if (error.response?.status === 401) {
              console.log('🔐 DashboardPage: Got 401 error, token refresh should be handled by interceptor');
            }
          });
          // fetchStats(); // Temporarily disabled - endpoint doesn't exist
        }, 1000); // Increased delay to 1 second

        return () => clearTimeout(timer);
      } else {
        console.log('❌ DashboardPage: No access token available, waiting...');
        
        // If no token, wait a bit longer and check again
        const retryTimer = setTimeout(() => {
          console.log('🔄 DashboardPage: Retrying token check...');
          const retryTokens = tokenStorage.getTokens();
          if (retryTokens.accessToken) {
            console.log('✅ DashboardPage: Tokens now available on retry');
            fetchRecentReceipts().catch(error => {
              console.error('❌ DashboardPage: fetchRecentReceipts retry failed:', error);
            });
          } else {
            console.log('❌ DashboardPage: Still no tokens available after retry');
          }
        }, 2000);
        
        return () => clearTimeout(retryTimer);
      }
    } else {
      console.log('⏳ DashboardPage: Waiting for authentication...', { 
        authLoading, 
        isAuthenticated 
      });
    }
  }, [isAuthenticated, authLoading, fetchRecentReceipts]);

  const fetchStats = async () => {
    try {
      console.log('📊 DashboardPage: Fetching stats...');
      const response = await receiptService.getReceiptStats();
      if (response.success) {
        setStats(response.data);
        console.log('✅ DashboardPage: Stats fetched successfully');
      }
    } catch (error) {
      console.error('❌ DashboardPage: Failed to fetch stats:', error);
    }
  };

  const StatCard = ({ title, value, icon, color = 'blue' }) => (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100 dark:bg-${color}-900`}>
          <div className={`text-${color}-600 dark:text-${color}-300`}>
            {icon}
          </div>
        </div>
        <div className="ml-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">
            {value}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Debug Component - Remove in production */}
      <TokenDebug />
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.first_name || user?.email}!
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Here's an overview of your financial data
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Receipts"
          value={stats.totalReceipts}
          color="blue"
          icon={
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          }
        />
        
        <StatCard
          title="Total Amount"
          value={formatCurrency(stats.totalAmount)}
          color="green"
          icon={
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
          }
        />
        
        <StatCard
          title="This Month"
          value={formatCurrency(stats.thisMonthAmount)}
          color="purple"
          icon={
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          }
        />
        
        <StatCard
          title="Pending"
          value={stats.pendingReceipts}
          color="orange"
          icon={
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          }
        />
      </div>

      {/* Recent Receipts */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Recent Receipts
          </h2>
        </div>
        
        <div className="p-6">
          {receiptsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : recentReceipts?.results?.length > 0 ? (
            <div className="space-y-4">
              {recentReceipts.results.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <svg className="h-5 w-5 text-blue-600 dark:text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {receipt.merchant_name || 'Unknown Merchant'}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(receipt.created_at)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {formatCurrency(receipt.total_amount)}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      receipt.status === 'processed'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : receipt.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                    }`}>
                      {receipt.status || 'draft'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                No receipts yet
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by creating your first receipt.
              </p>
              <div className="mt-6">
                <a
                  href="/receipts/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Add Receipt
                </a>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <a
            href="/receipts/new"
            className="flex items-center p-4 bg-blue-50 dark:bg-blue-900 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 transition-colors"
          >
            <svg className="h-8 w-8 text-blue-600 dark:text-blue-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Add Receipt
              </h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Upload a new receipt
              </p>
            </div>
          </a>
          
          <a
            href="/receipts"
            className="flex items-center p-4 bg-green-50 dark:bg-green-900 rounded-lg hover:bg-green-100 dark:hover:bg-green-800 transition-colors"
          >
            <svg className="h-8 w-8 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-green-900 dark:text-green-100">
                View Receipts
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Manage all receipts
              </p>
            </div>
          </a>
          
          <a
            href="/reports"
            className="flex items-center p-4 bg-purple-50 dark:bg-purple-900 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800 transition-colors"
          >
            <svg className="h-8 w-8 text-purple-600 dark:text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Reports
              </h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                View analytics
              </p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;
