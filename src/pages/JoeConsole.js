import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, Button, Divider,
  Chip, Stack, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, IconButton, Tooltip, Alert,
  CircularProgress, LinearProgress, Avatar, List, ListItem,
  ListItemText, ListItemAvatar,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FavoriteIcon from '@mui/icons-material/Favorite';
import WarningIcon from '@mui/icons-material/Warning';
import BackupIcon from '@mui/icons-material/Backup';
import HealingIcon from '@mui/icons-material/Healing';
import SendIcon from '@mui/icons-material/Send';
import RestoreIcon from '@mui/icons-material/Restore';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../utils/useDocumentTitle';

export default function JoeConsole() {
  useDocumentTitle('Joe Console');
  const { user } = useAuth();

  const [health, setHealth] = useState(null);
  const [anomalies, setAnomalies] = useState({ count: 0, items: [] });
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [status, setStatus] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([
    {
      role: 'joe',
      text: "Hello. I'm Joe, your system monitor. Ask me things like 'how many pumps are running', 'any alarms?', or 'status'.",
      ts: new Date().toISOString(),
    },
  ]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);

  // ---------- Data fetch ----------
  const loadAll = useCallback(async () => {
    try {
      const [hRes, aRes, bRes] = await Promise.all([
        api.get('/api/joe/health'),
        api.get('/api/joe/anomalies'),
        api.get('/api/joe/backups'),
      ]);
      setHealth(hRes.data);
      setAnomalies(aRes.data);
      setBackups(bRes.data || []);
    } catch (err) {
      console.warn('Joe load failed', err);
      setStatus({ type: 'error', text: 'Failed to load Joe data' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 20000);
    return () => clearInterval(t);
  }, [loadAll]);

  // ---------- Actions ----------
  const doBackup = async () => {
    setActionLoading('backup');
    try {
      const res = await api.post('/api/joe/backup');
      setStatus({ type: 'success', text: `Backup #${res.data.id} created (${res.data.sizeBytes} bytes)` });
      loadAll();
    } catch (err) {
      setStatus({ type: 'error', text: 'Backup failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setActionLoading(null);
      setTimeout(() => setStatus(null), 4000);
    }
  };

  const doHeal = async () => {
    if (!window.confirm('Run auto-heal? This will fix any malformed state.')) return;
    setActionLoading('heal');
    try {
      const res = await api.post('/api/joe/heal');
      const n = res.data.fixesApplied;
      setStatus({
        type: n > 0 ? 'warning' : 'success',
        text: n === 0 ? 'No issues found — state is clean' : `Applied ${n} fix(es)`,
      });
      loadAll();
    } catch (err) {
      setStatus({ type: 'error', text: 'Heal failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setActionLoading(null);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const doRestore = async (id) => {
    if (!window.confirm(`Restore from backup #${id}? This overwrites current state.`)) return;
    setActionLoading('restore');
    try {
      const res = await api.post(`/api/joe/restore/${id}`);
      setStatus({ type: 'success', text: `Restored ${res.data.restoredRows} rows from backup #${id}` });
      loadAll();
    } catch (err) {
      setStatus({ type: 'error', text: 'Restore failed: ' + (err.response?.data?.error || err.message) });
    } finally {
      setActionLoading(null);
      setTimeout(() => setStatus(null), 5000);
    }
  };

  const askJoe = async () => {
    const q = question.trim();
    if (!q) return;
    setMessages((prev) => [...prev, { role: 'user', text: q, ts: new Date().toISOString() }]);
    setQuestion('');
    setAsking(true);
    try {
      const res = await api.post('/api/joe/ask', { question: q });
      setMessages((prev) => [...prev, {
        role: 'joe',
        text: res.data.answer,
        ts: new Date().toISOString(),
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'joe',
        text: 'Sorry, I could not process that request.',
        ts: new Date().toISOString(),
        error: true,
      }]);
    } finally {
      setAsking(false);
    }
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>;
  }

  const current = health?.current || {};
  const history = health?.history || [];
  const historyChart = history.slice(0, 20).reverse();

  const statusColors = {
    HEALTHY:  '#28A743',
    DEGRADED: '#FF9800',
    CRITICAL: '#d32f2f',
    NO_DATA:  '#9e9e9e',
  };

  const severityColors = {
    HIGH: '#d32f2f',
    WARN: '#FF9800',
    INFO: '#1976d2',
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#003366' }}>
            Joe Console
          </Typography>
          <Typography variant="caption" color="textSecondary">
            System monitor, backup manager, and self-heal engine
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={loadAll} color="primary"><RefreshIcon /></IconButton>
        </Tooltip>
      </Box>

      {status && (
        <Alert severity={status.type} sx={{ mb: 2 }} onClose={() => setStatus(null)}>
          {status.text}
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* ============ HEALTH CARD ============ */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderTop: `5px solid ${statusColors[current.status] || '#666'}`, height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <FavoriteIcon sx={{ color: statusColors[current.status] || '#666' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>System Health</Typography>
              </Stack>

              <Box textAlign="center" mb={2}>
                <Typography variant="h3" sx={{ fontWeight: 'bold', color: statusColors[current.status] || '#666' }}>
                  {current.status || 'UNKNOWN'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {current.capturedAt ? new Date(current.capturedAt).toLocaleTimeString() : 'No data'}
                </Typography>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Stack spacing={1.5}>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Database</Typography>
                  <Chip
                    label={current.dbOk ? 'OK' : 'DOWN'}
                    size="small"
                    color={current.dbOk ? 'success' : 'error'}
                  />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">DB latency</Typography>
                  <Typography variant="body2" fontWeight="bold">{current.dbLatencyMs || 0} ms</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Heap used</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {current.heapUsedMb || 0} / {current.heapMaxMb || 0} MB
                  </Typography>
                </Box>
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={current.heapMaxMb ? Math.min(100, (current.heapUsedMb / current.heapMaxMb) * 100) : 0}
                    sx={{ height: 8, borderRadius: 4 }}
                    color={
                      current.heapMaxMb && (current.heapUsedMb / current.heapMaxMb) > 0.9
                        ? 'error' : 'primary'
                    }
                  />
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Threads</Typography>
                  <Typography variant="body2" fontWeight="bold">{current.activeThreads || 0}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2">Uptime</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {current.uptimeSeconds ? Math.floor(current.uptimeSeconds / 60) + 'm' : '-'}
                  </Typography>
                </Box>
              </Stack>

              {/* Mini history sparkline (last 20 samples) */}
              {historyChart.length > 1 && (
                <Box mt={2}>
                  <Typography variant="caption" color="textSecondary">Heap history</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'flex-end', height: 30, gap: 0.3, mt: 0.5 }}>
                    {historyChart.map((h, i) => {
                      const pct = h.heapMaxMb ? (h.heapUsedMb / h.heapMaxMb) * 100 : 0;
                      return (
                        <Box
                          key={i}
                          sx={{
                            flex: 1,
                            height: `${Math.max(5, Math.min(pct, 100))}%`,
                            bgcolor: statusColors[h.status] || '#666',
                            borderRadius: 0.5,
                          }}
                        />
                      );
                    })}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ============ ANOMALIES ============ */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderTop: '5px solid #FF9800', height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <WarningIcon sx={{ color: '#FF9800' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Anomalies</Typography>
                <Chip label={anomalies.count} size="small" color={anomalies.count > 0 ? 'warning' : 'success'} />
              </Stack>

              {anomalies.count === 0 ? (
                <Box textAlign="center" py={4}>
                  <CheckCircleIcon sx={{ fontSize: 48, color: '#28A743' }} />
                  <Typography variant="body2" color="textSecondary">No anomalies detected</Typography>
                </Box>
              ) : (
                <List dense sx={{ maxHeight: 380, overflowY: 'auto' }}>
                  {anomalies.items.slice(0, 15).map((a, i) => (
                    <ListItem key={i} sx={{ px: 0, py: 0.5, alignItems: 'flex-start' }}>
                      <ListItemAvatar sx={{ minWidth: 32 }}>
                        <Box sx={{
                          width: 8, height: 8, borderRadius: '50%',
                          bgcolor: severityColors[a.severity] || '#666',
                          mt: 1,
                        }} />
                      </ListItemAvatar>
                      <ListItemText
                        primary={<Typography variant="body2">{a.message}</Typography>}
                        secondary={<Typography variant="caption" color="textSecondary">{a.type}</Typography>}
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ============ ACTIONS ============ */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderTop: '5px solid #003366', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>Quick Actions</Typography>

              <Stack spacing={2}>
                <Button
                  fullWidth variant="contained" startIcon={<BackupIcon />}
                  onClick={doBackup}
                  disabled={actionLoading !== null}
                  sx={{ bgcolor: '#003366' }}
                >
                  {actionLoading === 'backup' ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Create Backup'}
                </Button>

                <Button
                  fullWidth variant="contained" startIcon={<HealingIcon />}
                  onClick={doHeal}
                  disabled={actionLoading !== null}
                  sx={{ bgcolor: '#28A743' }}
                >
                  {actionLoading === 'heal' ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Run Auto-Heal'}
                </Button>

                <Divider />
                <Typography variant="caption" color="textSecondary">
                  Auto-backup runs every 5 min · Health sampled every 30s
                </Typography>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        {/* ============ BACKUPS ============ */}
        <Grid item xs={12} md={7}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
                Recent Backups ({backups.length})
              </Typography>

              {backups.length === 0 ? (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="textSecondary">No backups yet</Typography>
                </Paper>
              ) : (
                <TableContainer sx={{ maxHeight: 340 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>#</TableCell>
                        <TableCell sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>Type</TableCell>
                        <TableCell sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                        <TableCell align="right" sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>Size</TableCell>
                        <TableCell sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>Created</TableCell>
                        <TableCell align="right" sx={{ bgcolor: '#003366', color: 'white', fontWeight: 'bold' }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {backups.map((b) => (
                        <TableRow key={b.id} hover>
                          <TableCell>{b.id}</TableCell>
                          <TableCell>
                            <Chip label={b.type} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={b.status}
                              size="small"
                              color={b.status === 'OK' ? 'success' : 'error'}
                            />
                          </TableCell>
                          <TableCell align="right" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                            {b.sizeBytes ? `${(b.sizeBytes / 1024).toFixed(1)} KB` : '—'}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption">
                              {b.createdAt ? new Date(b.createdAt).toLocaleString() : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            {b.status === 'OK' && (
                              <Tooltip title="Restore from this backup">
                                <IconButton
                                  size="small" color="warning"
                                  onClick={() => doRestore(b.id)}
                                  disabled={actionLoading !== null}
                                >
                                  <RestoreIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* ============ ASK JOE ============ */}
        <Grid item xs={12} md={5}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Stack direction="row" alignItems="center" gap={1} mb={2}>
                <SmartToyIcon sx={{ color: '#003366' }} />
                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>Ask Joe</Typography>
              </Stack>

              <Box sx={{
                flex: 1, minHeight: 280, maxHeight: 340, overflowY: 'auto',
                bgcolor: '#f5f7fa', borderRadius: 1, p: 1.5, mb: 2,
              }}>
                <Stack spacing={1.5}>
                  {messages.map((m, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      <Box
                        sx={{
                          maxWidth: '85%',
                          bgcolor: m.role === 'user' ? '#003366' : 'white',
                          color: m.role === 'user' ? 'white' : '#333',
                          px: 1.5, py: 1, borderRadius: 2,
                          border: m.role === 'joe' ? '1px solid #e0e6ed' : 'none',
                          fontSize: 13,
                        }}
                      >
                        <Typography variant="caption" sx={{
                          display: 'block', fontWeight: 'bold',
                          color: m.role === 'user' ? 'rgba(255,255,255,0.8)' : '#003366',
                          mb: 0.3,
                        }}>
                          {m.role === 'user' ? (user?.fullName || 'You') : 'Joe'}
                        </Typography>
                        {m.text}
                      </Box>
                    </Box>
                  ))}
                  {asking && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                      <Box sx={{ bgcolor: 'white', px: 1.5, py: 1, borderRadius: 2, border: '1px solid #e0e6ed' }}>
                        <CircularProgress size={14} />
                      </Box>
                    </Box>
                  )}
                </Stack>
              </Box>

              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth size="small"
                  placeholder="Ask about status, alarms, backups…"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      askJoe();
                    }
                  }}
                  disabled={asking}
                />
                <Button
                  variant="contained"
                  onClick={askJoe}
                  disabled={asking || !question.trim()}
                  sx={{ bgcolor: '#003366', minWidth: 50 }}
                >
                  <SendIcon fontSize="small" />
                </Button>
              </Stack>

              <Box mt={1} sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                {['pumps running', 'alarms', 'backups', 'status'].map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    size="small"
                    variant="outlined"
                    onClick={() => setQuestion(s)}
                    sx={{ cursor: 'pointer', fontSize: 10 }}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
