import React, { useMemo } from 'react';
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box, AppBar, Toolbar, Typography, Tab, Tabs, Menu, MenuItem,
  Button, Chip, Avatar, Stack, IconButton,
} from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import { useAuth } from '../context/AuthContext';

const PLANTS = ['Palmiet', 'Eikenhof', 'Zwartkopjes', 'Mapleton'];

const SUB_PAGES = [
  { label: 'Dashboard', path: 'dashboard' },
  { label: 'Engine Rooms', path: 'engine-rooms' },
  { label: 'Quality Data', path: 'quality-data' },
  { label: 'Process Dosing', path: 'process-dosing' },
  { label: 'Dosing Chart', path: 'dosing-chart' },
  { label: 'Chemical Storage', path: 'chemical-storage' },
  { label: 'Audit Log', path: 'audit-log' },
];

const ROLE_COLORS = {
  admin: '#d32f2f',
  supervisor: '#8E44AD',
  operator: '#28A743',
};

export default function Layout() {
  const { plantId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAdmin, isSupervisor } = useAuth();

  const [plantMenuAnchor, setPlantMenuAnchor] = React.useState(null);
  const currentPlant = plantId || 'Palmiet';

  const visiblePlants = useMemo(() => {
    if (!user) return PLANTS;
    if (user.role !== 'operator') return PLANTS;
    return (user.plantRights || [])
      .filter((pr) => pr.status === 'approved')
      .map((pr) => pr.plantName);
  }, [user]);

  const currentSub = useMemo(() => {
    if (location.pathname.includes('/admin')) return 'admin';
    if (location.pathname.includes('/joe-console')) return 'joe-console';
    const match = SUB_PAGES.find((p) => location.pathname.includes(p.path));
    return match ? match.path : 'dashboard';
  }, [location.pathname]);

  const handlePlantChange = (plant) => {
    navigate(`/plant/${plant}/${currentSub}`);
    setPlantMenuAnchor(null);
  };

  const handleSubTabChange = (event, newValue) => {
    navigate(`/plant/${currentPlant}/${newValue}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const showAdmin = isAdmin() || isSupervisor();
  const showJoe = isAdmin();

  const visibleSubPages = useMemo(() => {
    const pages = [...SUB_PAGES];
    if (showAdmin) pages.push({ label: 'Admin', path: 'admin', icon: 'admin' });
    if (showJoe) pages.push({ label: 'Joe Console', path: 'joe-console', icon: 'joe' });
    return pages;
  }, [showAdmin, showJoe]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#F5F7FA' }}>
      <AppBar position="static" sx={{ bgcolor: '#003366' }}>
        <Toolbar>
          <Box
            component="img"
            src="/randwater_logo.jpg"
            alt="Rand Water"
            sx={{ height: 36, mr: 2, objectFit: 'contain', bgcolor: 'white', p: 0.5, borderRadius: 0.5 }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <Typography variant="h6" sx={{ fontWeight: 'bold', mr: 3 }}>
            Rand Water Quality System
          </Typography>

          <Button
            color="inherit"
            onClick={(e) => setPlantMenuAnchor(e.currentTarget)}
            sx={{ fontWeight: 'bold', textTransform: 'none', fontSize: '1rem' }}
          >
            {currentPlant} &#9662;
          </Button>
          <Menu
            anchorEl={plantMenuAnchor}
            open={Boolean(plantMenuAnchor)}
            onClose={() => setPlantMenuAnchor(null)}
          >
            {visiblePlants.map((p) => (
              <MenuItem key={p} selected={p === currentPlant} onClick={() => handlePlantChange(p)}>
                {p}
              </MenuItem>
            ))}
          </Menu>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ bgcolor: ROLE_COLORS[user?.role] || '#666', width: 32, height: 32 }}>
              {(user?.fullName || user?.username || '?')[0].toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                {user?.fullName || user?.username}
              </Typography>
              <Chip
                label={(user?.role || '').toUpperCase()}
                size="small"
                sx={{
                  height: 16, fontSize: '0.6rem',
                  bgcolor: ROLE_COLORS[user?.role] || '#666',
                  color: 'white', fontWeight: 'bold',
                }}
              />
            </Box>
            <IconButton color="inherit" onClick={handleLogout} title="Logout">
              <LogoutIcon />
            </IconButton>
          </Stack>
        </Toolbar>
      </AppBar>

      <Box sx={{ bgcolor: '#d6eaf8', borderBottom: '1px solid #B0BEC5' }}>
        <Tabs
          value={currentSub}
          onChange={handleSubTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': { fontWeight: 'bold', color: '#003366', textTransform: 'none' },
            '& .Mui-selected': { color: '#003366' },
            '& .MuiTabs-indicator': { backgroundColor: '#DC6400', height: 3 },
          }}
        >
          {visibleSubPages.map((p) => (
            <Tab
              key={p.path}
              label={
                p.icon === 'admin' ? (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <AdminPanelSettingsIcon fontSize="small" />
                    {p.label}
                  </Box>
                ) : p.icon === 'joe' ? (
                  <Box display="flex" alignItems="center" gap={0.5}>
                    <SmartToyIcon fontSize="small" />
                    {p.label}
                  </Box>
                ) : p.label
              }
              value={p.path}
            />
          ))}
        </Tabs>
      </Box>

      <Box sx={{ p: 2 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
