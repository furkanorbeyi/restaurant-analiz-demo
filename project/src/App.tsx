import { useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Auth/Login';
import { Register } from './components/Auth/Register';
import { Dashboard } from './components/Dashboard/Dashboard';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#2e7d32',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function AppContent() {
  const { user, loading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  if (loading) {
    return null;
  }

  if (!user) {
    return isLoginMode ? (
      <Login onToggleMode={() => setIsLoginMode(false)} />
    ) : (
      <Register onToggleMode={() => setIsLoginMode(true)} />
    );
  }

  return <Dashboard />;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
