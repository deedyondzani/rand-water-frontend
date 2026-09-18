import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('rw_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('rw_token') || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const login = useCallback(async (username, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/api/auth/login', { username, password });
      const { token: t, ...userData } = res.data;
      localStorage.setItem('rw_token', t);
      localStorage.setItem('rw_user', JSON.stringify(userData));
      setToken(t);
      setUser(userData);
      return { success: true, user: userData };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      setError(msg);
      return { success: false, error: msg };
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      if (token) await api.post('/api/auth/logout');
    } catch { /* ignore */ }
    localStorage.removeItem('rw_token');
    localStorage.removeItem('rw_user');
    setToken(null);
    setUser(null);
  }, [token]);

  const isAdmin = useCallback(() => user?.role === 'admin', [user]);
  const isSupervisor = useCallback(() => user?.role === 'supervisor', [user]);
  const isOperator = useCallback(() => user?.role === 'operator', [user]);
  const isReadOnly = useCallback(() => user?.role === 'supervisor', [user]);

  // Approved plant names for operators
  const approvedPlants = useCallback(() => {
    if (!user || user.role !== 'operator') return null; // null = all plants
    const approved = (user.plantRights || [])
      .filter((pr) => pr.status === 'approved')
      .map((pr) => pr.plantName);
    return approved;
  }, [user]);

  useEffect(() => {
    if (token) localStorage.setItem('rw_token', token);
  }, [token]);

  const value = {
    user,
    token,
    loading,
    error,
    login,
    logout,
    isAuthenticated: !!token,
    isAdmin,
    isSupervisor,
    isOperator,
    isReadOnly,
    approvedPlants,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
