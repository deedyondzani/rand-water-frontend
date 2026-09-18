import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Stack, Divider,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState(null);
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    if (!username || !password) {
      setLocalError('Please enter username and password');
      return;
    }
    const result = await login(username, password);
    if (result.success) {
      if (result.user?.passwordResetRequired) {
        navigate('/change-password');
      } else {
        navigate('/plant/Palmiet/dashboard');
      }
    } else {
      setLocalError(result.error || 'Login failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #E8F4FD 0%, #D6EAF8 100%)',
        p: 2,
        boxSizing: 'border-box',
      }}
    >
      <Card
        sx={{
          width: '100%',
          maxWidth: 440,
          boxShadow: 6,
          mx: 'auto',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              component="img"
              src="/randwater_logo.jpg"
              alt="Rand Water"
              sx={{
                height: 70,
                mb: 2,
                objectFit: 'contain',
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
                color: '#003366',
                textAlign: 'center',
                lineHeight: 1.2,
              }}
            >
              Rand Water Quality System
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
              Multi-Plant Management v6
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {localError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {localError}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Username"
                fullWidth
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
                disabled={loading}
              />
              <TextField
                label="Password"
                type="password"
                fullWidth
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
                sx={{ bgcolor: '#003366', py: 1.5, fontWeight: 'bold' }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Sign In'}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
