/**
 * Main App Component
 * Root component with routing and context providers
 */

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import AppRoutes from './routes/AppRoutes';
import NotificationSystem from './components/common/NotificationSystem';
import './App.css';

function App() {
  return (
    <div className="App">
      <AppProvider>
        <Router>
          <AuthProvider>
            <AppRoutes />
            <NotificationSystem />
          </AuthProvider>
        </Router>
      </AppProvider>
    </div>
  );
}

export default App;
