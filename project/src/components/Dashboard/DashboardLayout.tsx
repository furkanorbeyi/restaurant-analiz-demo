import { ReactNode } from 'react';
import { AppBar, Toolbar, Typography, Button, Container, Box } from '@mui/material';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar position="static" elevation={2}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Restoran & Yemek Servisi Analitik
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.email}
          </Typography>
          <Button
            color="inherit"
            onClick={handleLogout}
            startIcon={<LogOut size={20} />}
          >
            Çıkış Yap
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
        {children}
      </Container>
    </Box>
  );
};
