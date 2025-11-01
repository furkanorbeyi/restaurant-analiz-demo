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

interface RegisterProps {
  onToggleMode: () => void;
}

export const Register = ({ onToggleMode }: RegisterProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp, resendConfirmation } = useAuth();
  const [resendLoading, setResendLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (password !== confirmPassword) {
      setError('Şifreler eşleşmiyor');
      return;
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır');
      return;
    }

    setLoading(true);

    try {
      await signUp(email, password);
  setSuccess(true);
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kayıt başarısız');
    } finally {
      setLoading(false);
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
            Kayıt Ol
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Kayıt başarılı! Lütfen e-postanızı doğrulayın, ardından giriş yapabilirsiniz.
              <Button
                size="small"
                onClick={async () => {
                  setResendLoading(true);
                  try {
                    await resendConfirmation(email);
                  } finally {
                    setResendLoading(false);
                  }
                }}
                disabled={resendLoading}
                sx={{ ml: 1 }}
              >
                {resendLoading ? 'Gönderiliyor...' : 'Doğrulama e-postasını tekrar gönder'}
              </Button>
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
              autoComplete="new-password"
            />
            <TextField
              fullWidth
              label="Şifre Tekrar"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
              autoComplete="new-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              size="large"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
            </Button>
          </form>

          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Typography variant="body2">
              Zaten hesabınız var mı?{' '}
              <Button onClick={onToggleMode} sx={{ textTransform: 'none' }}>
                Giriş Yap
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
