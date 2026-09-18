import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, TextField, Button, Typography,
  Alert, CircularProgress, Stack, Divider,
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function ChangePassword() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const forced = user?.passwordResetRequired === true;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (newPassword.length < 4) {
      setError('Password must be at least 4 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await api.post('/api/auth/change-password', { newPassword });
      // Update local user object
      const updated = { ...user, passwordResetRequired: false };
      localStorage.setItem('rw_user', JSON.stringify(updated));
      setSuccess(true);
      setTimeout(() => {
        navigate('/plant/Palmiet/dashboard');
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.error || 'Password change failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (forced) {
      // Can't skip a forced reset — force logout
      await logout();
      navigate('/login');
    } else {
      navigate(-1);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh', width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #E8F4FD 0%, #D6EAF8 100%)',
        p: 2, boxSizing: 'border-box',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 440, boxShadow: 6, mx: 'auto' }}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box sx={{
              width: 64, height: 64, borderRadius: '50%',
              bgcolor: forced ? '#DC6400' : '#003366',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              mb: 2,
            }}>
              <LockResetIcon fontSize="large" />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#003366', textAlign: 'center' }}>
              {forced ? 'Password Change Required' : 'Change Password'}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, textAlign: 'center' }}>
              {forced
                ? 'An administrator set a temporary password. Please set a new one to continue.'
                : 'Enter your new password below.'}
            </Typography>
          </Box>

          <Divider sx={{ mb: 3 }} />

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>Password updated — redirecting…</Alert>}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="New Password" type="password" fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoFocus disabled={loading || success}
              />
              <TextField
                label="Confirm New Password" type="password" fullWidth
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading || success}
              />
              <Button
                type="submit" variant="contained" fullWidth size="large"
                disabled={loading || success}
                sx={{ bgcolor: '#003366', py: 1.5, fontWeight: 'bold' }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Update Password'}
              </Button>
              {!forced && (
                <Button variant="text" fullWidth onClick={handleCancel} disabled={loading}>
                  Cancel
                </Button>
              )}
            </Stack>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
