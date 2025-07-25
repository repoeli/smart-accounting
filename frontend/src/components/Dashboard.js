import React, { useState } from 'react';

// Navigation item component
const NavigationItem = ({ icon, text, active, onClick }) => {
  return (
    <div 
      onClick={onClick} 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '12px 16px',
        backgroundColor: active ? '#1976d2' : 'transparent',
        color: active ? 'white' : '#333',
        borderRadius: '4px',
        marginBottom: '8px',
        cursor: 'pointer'
      }}
    >
      <span style={{ marginRight: '12px' }}>{icon}</span>
      <span>{text}</span>
    </div>
  );
};

// Dashboard card component
const DashboardCard = ({ title, icon, value, color }) => {
  return (
    <div style={{ 
      backgroundColor: '#fff', 
      borderRadius: '8px', 
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ 
        position: 'absolute', 
        top: '10px', 
        right: '10px',
        fontSize: '24px'
      }}>
        {icon}
      </div>
      <h3 style={{ 
        margin: '0 0 15px 0', 
        fontSize: '14px', 
        color: '#666',
        fontWeight: 'normal' 
      }}>
        {title}
      </h3>
      <div style={{ 
        fontSize: '24px', 
        fontWeight: 'bold',
        color: color
      }}>
        {value}
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');

  // Mock data for dashboard
  const currentMonth = "July 2025";
  const totalExpenses = "$2,450.75";
  const totalIncome = "$4,200.00";
  const balance = "$1,749.25";
  const pendingReceipts = 3;

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif'
    }}>
      {/* Sidebar */}
      <div style={{ 
        width: '250px', 
        backgroundColor: '#f5f5f5',
        padding: '20px',
        boxShadow: '2px 0 5px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          fontSize: '24px', 
          fontWeight: 'bold', 
          color: '#1976d2', 
          marginBottom: '30px',
          display: 'flex',
          alignItems: 'center'
        }}>
          <img 
            src="/logo192.svg" 
            alt="Smart Accounting" 
            style={{ width: '32px', height: '32px', marginRight: '10px' }} 
          />
          Smart Accounting
        </div>

        <NavigationItem 
          icon="📊" 
          text="Dashboard" 
          active={activeSection === 'dashboard'} 
          onClick={() => setActiveSection('dashboard')} 
        />
        <NavigationItem 
          icon="🧾" 
          text="Receipts" 
          active={activeSection === 'receipts'} 
          onClick={() => setActiveSection('receipts')} 
        />
        <NavigationItem 
          icon="💰" 
          text="Expenses" 
          active={activeSection === 'expenses'} 
          onClick={() => setActiveSection('expenses')} 
        />
        <NavigationItem 
          icon="📝" 
          text="Reports" 
          active={activeSection === 'reports'} 
          onClick={() => setActiveSection('reports')} 
        />
        <NavigationItem 
          icon="📅" 
          text="Budget" 
          active={activeSection === 'budget'} 
          onClick={() => setActiveSection('budget')} 
        />
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, padding: '30px', backgroundColor: '#fafafa' }}>
        <header style={{ marginBottom: '30px' }}>
          <h1 style={{ margin: '0 0 10px 0', color: '#333' }}>
            {activeSection === 'dashboard' && 'Dashboard'}
            {activeSection === 'receipts' && 'Receipt Management'}
            {activeSection === 'expenses' && 'Expense Tracking'}
            {activeSection === 'reports' && 'Financial Reports'}
            {activeSection === 'budget' && 'Budget Planning'}
          </h1>
          <p style={{ margin: 0, color: '#666' }}>
            {activeSection === 'dashboard' && `Overview for ${currentMonth}`}
            {activeSection !== 'dashboard' && 'Feature coming soon'}
          </p>
        </header>

        {activeSection === 'dashboard' && (
          <>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <DashboardCard 
                title="Total Expenses" 
                icon="💸" 
                value={totalExpenses} 
                color="#e53935" 
              />
              <DashboardCard 
                title="Total Income" 
                icon="💵" 
                value={totalIncome} 
                color="#43a047" 
              />
              <DashboardCard 
                title="Balance" 
                icon="💰" 
                value={balance} 
                color="#1976d2" 
              />
              <DashboardCard 
                title="Pending Receipts" 
                icon="🧾" 
                value={pendingReceipts} 
                color="#f57c00" 
              />
            </div>

            <div style={{ 
              backgroundColor: '#fff', 
              borderRadius: '8px', 
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
              padding: '20px',
              marginBottom: '20px'
            }}>
              <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', color: '#333' }}>Recent Transactions</h2>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
                <p style={{ color: '#666', textAlign: 'center' }}>
                  Sample transaction data will appear here.<br />
                  <span style={{ fontSize: '14px' }}>Connect your accounts to start tracking your finances.</span>
                </p>
              </div>
            </div>
          </>
        )}

        {activeSection !== 'dashboard' && (
          <div style={{ 
            backgroundColor: '#fff', 
            borderRadius: '8px', 
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)', 
            padding: '40px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚧</div>
            <h2 style={{ margin: '0 0 20px 0', color: '#333' }}>Feature Coming Soon</h2>
            <p style={{ color: '#666' }}>
              We're working hard to bring you this feature.<br />
              Check back later for updates!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
