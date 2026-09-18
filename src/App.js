import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import EngineRooms from './pages/EngineRooms';
import QualityData from './pages/QualityData';
import ProcessDosing from './pages/ProcessDosing';
import DosingChart from './pages/DosingChart';
import ChemicalStorage from './pages/ChemicalStorage';
import AuditLog from './pages/AuditLog';
import Admin from './pages/Admin';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import JoeConsole from './pages/JoeConsole';

import { AuthProvider, useAuth } from './context/AuthContext';

const theme = createTheme({
  palette: {
    primary: { main: '#003366' },
    secondary: { main: '#DC6400' },
    background: { default: '#F5F7FA' },
  },
  typography: {
    fontFamily: 'Segoe UI, Roboto, Arial, sans-serif',
  },
});

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Navigate to="/plant/Palmiet/dashboard" replace />} />
        <Route path="plant/:plantId/dashboard" element={<Dashboard />} />
        <Route path="plant/:plantId/engine-rooms" element={<EngineRooms />} />
        <Route path="plant/:plantId/quality-data" element={<QualityData />} />
        <Route path="plant/:plantId/process-dosing" element={<ProcessDosing />} />
        <Route path="plant/:plantId/dosing-chart" element={<DosingChart />} />
        <Route path="plant/:plantId/chemical-storage" element={<ChemicalStorage />} />
        <Route path="plant/:plantId/audit-log" element={<AuditLog />} />
        <Route path="plant/:plantId/admin" element={<Admin />} />
        <Route path="plant/:plantId/joe-console" element={<JoeConsole />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
