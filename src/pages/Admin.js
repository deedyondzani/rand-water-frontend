import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Select, MenuItem, FormControl, InputLabel, FormControlLabel,
  Checkbox, Stack, CircularProgress, Alert, Tooltip, Divider,
  Card, CardContent, Grid, Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LockResetIcon from '@mui/icons-material/LockReset';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupervisedUserCircleIcon from '@mui/icons-material/SupervisedUserCircle';
import BuildCircleIcon from '@mui/icons-material/BuildCircle';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import useDocumentTitle from '../utils/useDocumentTitle';

const PLANTS = ['Palmiet', 'Eikenhof', 'Zwartkopjes', 'Mapleton'];

const ROLE_COLORS = {
  admin: '#d32f2f',
  supervisor: '#8E44AD',
  operator: '#28A743',
};

const ROLE_ICONS = {
  admin: <AdminPanelSettingsIcon fontSize="small" />,
  supervisor: <SupervisedUserCircleIcon fontSize="small" />,
  operator: <BuildCircleIcon fontSize="small" />,
};

// ============================================================
// USERS TAB
// ============================================================
function UsersTab() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [uRes, rRes] = await Promise.all([
        api.get('/api/admin/users'),
        api.get('/api/admin/roles'),
      ]);
      setUsers(uRes.data || []);
      setRoles(rRes.data || []);
    } catch (err) {
      console.warn('Failed to load users', err);
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (user) => {
    if (user.username === 'admin') {
      alert('Cannot delete the default admin user');
      return;
    }
    if (!window.confirm(`Delete user "${user.username}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/admin/users/${user.userId}`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const handleResetPassword = async (user) => {
    if (!window.confirm(`Reset password for "${user.username}" to temp123?\nThey'll be forced to change on next login.`)) return;
    try {
      await api.post(`/api/admin/users/${user.userId}/reset-password`);
      alert('Password reset to temp123');
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Reset failed');
    }
  };

  const openCreate = () => {
    setEditingUser(null);
    setDialogOpen(true);
  };

  const openEdit = (user) => {
    setEditingUser(user);
    setDialogOpen(true);
  };

  const handleDialogClose = (saved) => {
    setDialogOpen(false);
    setEditingUser(null);
    if (saved) load();
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366' }}>
          User Management
        </Typography>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Refresh">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
          {isAdmin() && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}
              sx={{ bgcolor: '#003366' }}>
              Add User
            </Button>
          )}
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#003366' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>ID</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Username</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Full Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Active</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Plants</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.userId} hover>
                  <TableCell>{u.userId}</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>{u.username}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>
                    <Chip
                      icon={ROLE_ICONS[u.roleName]}
                      label={(u.roleName || '').toUpperCase()}
                      size="small"
                      sx={{
                        bgcolor: ROLE_COLORS[u.roleName] || '#666',
                        color: 'white', fontWeight: 'bold',
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip label={u.isActive ? 'Active' : 'Disabled'} size="small"
                      color={u.isActive ? 'success' : 'default'} />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={0.5}>
                      <Box sx={{
                        width: 8, height: 8, borderRadius: '50%',
                        bgcolor: u.isOnline ? '#28A743' : '#B0BEC5',
                      }} />
                      <Typography variant="caption">
                        {u.isOnline ? 'Online' : 'Offline'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    {u.roleName === 'operator' && u.plantRights?.length > 0 ? (
                      <Stack direction="row" spacing={0.5} flexWrap="wrap">
                        {u.plantRights.map((pr) => (
                          <Chip
                            key={pr.plantName}
                            label={`${pr.plantName} (${pr.status})`}
                            size="small"
                            color={pr.status === 'approved' ? 'success'
                                 : pr.status === 'pending' ? 'warning' : 'default'}
                            sx={{ fontSize: '0.65rem', height: 20 }}
                          />
                        ))}
                      </Stack>
                    ) : u.roleName === 'operator' ? (
                      <Typography variant="caption" color="textSecondary">No plants</Typography>
                    ) : (
                      <Typography variant="caption" color="textSecondary">All plants</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {isAdmin() && (
                      <>
                        <Tooltip title="Edit">
                          <IconButton size="small" onClick={() => openEdit(u)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reset password">
                          <IconButton size="small" onClick={() => handleResetPassword(u)}>
                            <LockResetIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(u)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <UserDialog
        open={dialogOpen}
        onClose={handleDialogClose}
        editingUser={editingUser}
        roles={roles}
      />
    </Box>
  );
}

// ============================================================
// USER DIALOG (create/edit)
// ============================================================
function UserDialog({ open, onClose, editingUser, roles }) {
  const isEdit = !!editingUser;
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [roleName, setRoleName] = useState('operator');
  const [isActive, setIsActive] = useState(true);
  const [plantRights, setPlantRights] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingUser) {
      setUsername(editingUser.username || '');
      setFullName(editingUser.fullName || '');
      setPassword('');
      setRoleName(editingUser.roleName || 'operator');
      setIsActive(editingUser.isActive !== false);
      const prMap = {};
      (editingUser.plantRights || []).forEach((pr) => {
        prMap[pr.plantName] = pr.status;
      });
      setPlantRights(prMap);
    } else {
      setUsername('');
      setFullName('');
      setPassword('');
      setRoleName('operator');
      setIsActive(true);
      setPlantRights({});
    }
  }, [open, editingUser]);

  const handlePlantCheck = (plant, checked) => {
    setPlantRights((prev) => {
      const next = { ...prev };
      if (checked) {
        next[plant] = next[plant] || 'approved';
      } else {
        delete next[plant];
      }
      return next;
    });
  };

  const handlePlantStatus = (plant, status) => {
    setPlantRights((prev) => ({ ...prev, [plant]: status }));
  };

  const handleSave = async () => {
    if (!fullName.trim()) { alert('Full name is required'); return; }
    if (!isEdit && !username.trim()) { alert('Username is required'); return; }
    if (!isEdit && !password.trim()) { alert('Password is required for new users'); return; }

    const payload = {
      username: username.trim(),
      fullName: fullName.trim(),
      roleName,
      isActive,
      plantRights: roleName === 'operator'
        ? Object.entries(plantRights).map(([plantName, status]) => ({ plantName, status }))
        : [],
    };
    if (password.trim()) payload.password = password.trim();

    setSaving(true);
    try {
      if (isEdit) {
        await api.put(`/api/admin/users/${editingUser.userId}`, payload);
      } else {
        await api.post('/api/admin/users', payload);
      }
      onClose(true);
    } catch (err) {
      alert(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? `Edit User: ${editingUser?.username}` : 'Add New User'}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <TextField
            label="Username"
            fullWidth
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={isEdit}
            helperText={isEdit ? 'Username cannot be changed' : ''}
          />
          <TextField
            label="Full Name"
            fullWidth
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
          <TextField
            label={isEdit ? 'New Password (leave blank to keep current)' : 'Password'}
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={roleName} label="Role" onChange={(e) => setRoleName(e.target.value)}>
              {(roles || []).map((r) => (
                <MenuItem key={r.roleId} value={r.roleName}>
                  {r.roleName.charAt(0).toUpperCase() + r.roleName.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Checkbox checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
            label="Active account"
          />

          {roleName === 'operator' && (
            <Box>
              <Divider sx={{ mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: '#003366' }}>
                Plant Access Rights
              </Typography>
              {PLANTS.map((plant) => (
                <Box key={plant} display="flex" alignItems="center" gap={1} mb={1}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={!!plantRights[plant]}
                        onChange={(e) => handlePlantCheck(plant, e.target.checked)}
                      />
                    }
                    label={plant}
                    sx={{ flex: 1 }}
                  />
                  {plantRights[plant] && (
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                      <Select
                        value={plantRights[plant]}
                        onChange={(e) => handlePlantStatus(plant, e.target.value)}
                      >
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="approved">Approved</MenuItem>
                        <MenuItem value="denied">Denied</MenuItem>
                      </Select>
                    </FormControl>
                  )}
                </Box>
              ))}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving} sx={{ bgcolor: '#003366' }}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ============================================================
// ACCESS REQUESTS TAB
// ============================================================
function AccessRequestsTab() {
  const { isAdmin, isSupervisor } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');

  const canApprove = isAdmin() || isSupervisor();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = filter === 'pending'
        ? '/api/admin/access-requests'
        : `/api/admin/access-requests/all?status=${filter}`;
      const res = await api.get(url);
      setRequests(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleApprove = async (req) => {
    try {
      await api.post(`/api/admin/access-requests/${req.id}/approve`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Approve failed');
    }
  };

  const handleDeny = async (req) => {
    try {
      await api.post(`/api/admin/access-requests/${req.id}/deny`);
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Deny failed');
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366' }}>
          Plant Access Requests
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Show</InputLabel>
            <Select value={filter} label="Show" onChange={(e) => setFilter(e.target.value)}>
              <MenuItem value="pending">Pending only</MenuItem>
              <MenuItem value="approved">Approved</MenuItem>
              <MenuItem value="denied">Denied</MenuItem>
              <MenuItem value="all">All</MenuItem>
            </Select>
          </FormControl>
          <Tooltip title="Refresh">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
      ) : requests.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">No {filter} requests</Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#003366' }}>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>User</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Full Name</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Plant</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Status</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Requested</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {requests.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell sx={{ fontWeight: 'bold' }}>{r.username}</TableCell>
                  <TableCell>{r.fullName}</TableCell>
                  <TableCell>{r.plantName}</TableCell>
                  <TableCell>
                    <Chip
                      label={r.status.toUpperCase()}
                      size="small"
                      color={r.status === 'pending' ? 'warning'
                           : r.status === 'approved' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {r.requestedAt ? new Date(r.requestedAt).toLocaleString() : '--'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    {r.status === 'pending' && canApprove && (
                      <>
                        <Tooltip title="Approve">
                          <IconButton size="small" color="success" onClick={() => handleApprove(r)}>
                            <CheckCircleIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Deny">
                          <IconButton size="small" color="error" onClick={() => handleDeny(r)}>
                            <CancelIcon />
                          </IconButton>
                        </Tooltip>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ============================================================
// ACTIVE USERS TAB
// ============================================================
function ActiveUsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/api/admin/active-users');
      setUsers(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load active users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, [load]);

  const formatTime = (ts) => {
    if (!ts) return 'Never';
    try {
      const d = new Date(ts);
      const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin} min ago`;
      if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ${diffMin % 60}m ago`;
      return d.toLocaleString();
    } catch {
      return ts;
    }
  };

  const onlineCount = users.filter((u) => u.isOnline).length;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#003366' }}>
          Active Users (last 24 hours)
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          <Chip
            icon={<PersonIcon />}
            label={`${onlineCount} online / ${users.length} active`}
            color="success"
            variant="outlined"
          />
          <Tooltip title="Refresh">
            <IconButton onClick={load}><RefreshIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" p={6}><CircularProgress /></Box>
      ) : users.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">No active users in the last 24 hours</Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {users.map((u) => (
            <Grid item xs={12} sm={6} md={4} key={u.userId}>
              <Card sx={{
                borderLeft: `5px solid ${u.isOnline ? '#28A743' : '#B0BEC5'}`,
                height: '100%',
              }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar sx={{ bgcolor: ROLE_COLORS[u.roleName] || '#666' }}>
                      {(u.fullName || u.username || '?')[0].toUpperCase()}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                        {u.fullName}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {u.username}
                      </Typography>
                    </Box>
                    <Box sx={{
                      width: 12, height: 12, borderRadius: '50%',
                      bgcolor: u.isOnline ? '#28A743' : '#B0BEC5',
                      boxShadow: u.isOnline ? '0 0 6px #28A743' : 'none',
                    }} />
                  </Box>
                  <Chip
                    label={(u.roleName || '').toUpperCase()}
                    size="small"
                    sx={{
                      bgcolor: ROLE_COLORS[u.roleName] || '#666',
                      color: 'white', fontWeight: 'bold', mb: 1.5,
                    }}
                  />
                  <Divider sx={{ my: 1 }} />
                  <Stack spacing={0.5}>
                    <Typography variant="caption" color="textSecondary">
                      Last login: {formatTime(u.lastLogin)}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      Last seen: {formatTime(u.lastActive)}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

// ============================================================
// MAIN ADMIN PAGE
// ============================================================
export default function Admin() {
  useDocumentTitle('Admin');
  const { isAdmin, isSupervisor } = useAuth();
  const [tab, setTab] = useState(0);

  if (!isAdmin() && !isSupervisor()) {
    return (
      <Paper sx={{ p: 4, textAlign: 'center' }}>
        <Typography variant="h6" color="error">
          Access Denied
        </Typography>
        <Typography color="textSecondary">
          Admin or Supervisor privileges required.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ fontWeight: 'bold', color: '#003366', mb: 2 }}>
        Admin Dashboard
      </Typography>

      <Paper sx={{ mb: 3, bgcolor: '#d6eaf8' }}>
        <Tabs
          value={tab}
          onChange={(e, v) => setTab(v)}
          sx={{
            '& .MuiTab-root': { fontWeight: 'bold', color: '#003366', textTransform: 'none' },
            '& .MuiTabs-indicator': { backgroundColor: '#DC6400', height: 3 },
          }}
        >
          <Tab label="Users" />
          <Tab label="Access Requests" />
          <Tab label="Active Users" />
        </Tabs>
      </Paper>

      {tab === 0 && <UsersTab />}
      {tab === 1 && <AccessRequestsTab />}
      {tab === 2 && <ActiveUsersTab />}
    </Box>
  );
}
