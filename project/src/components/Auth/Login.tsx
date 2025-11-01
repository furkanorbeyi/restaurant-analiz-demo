import { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Container,
  Alert,
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';

interface LoginProps {
  onToggleMode: () => void;
}

export const Login = ({ onToggleMode }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, resendConfirmation } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Giriş başarısız');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await resendConfirmation(email);
      setError('Doğrulama e-postası tekrar gönderildi. Lütfen e-postanızı kontrol edin.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'E-posta gönderilemedi');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Restoran Analitik
          </Typography>
          <Typography variant="h6" gutterBottom align="center" color="text.secondary">
            Giriş Yap
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
              {error.toLowerCase().includes('email not confirmed') && (
                <>
                  {' '}
                  <Button size="small" onClick={handleResend} disabled={resendLoading} sx={{ ml: 1 }}>
                    {resendLoading ? 'Gönderiliyor...' : 'Doğrulama e-postasını tekrar gönder'}
                  </Button>
                </>
              )}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="E-posta"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoComplete="email"
            />
            <TextField
              fullWidth
              label="Şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              Hesabınız yok mu?{' '}
              <Button onClick={onToggleMode} sx={{ textTransform: 'none' }}>
                Kayıt Ol
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
