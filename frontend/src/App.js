/**
 * Main App Component
 * Root component with routing and context providers
 */

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import AppRoutes from './routes/AppRoutes';
import NotificationSystem from './components/common/NotificationSystem';
import './App.css';

// Only import development utilities in development mode
if (process.env.NODE_ENV === 'development') {
  import('./utils/apiTest').catch(console.error);
  import('./utils/devAuth').catch(console.error);
}

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          '&:hover': {
            boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
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
    </ThemeProvider>
  );
}

export default App;
