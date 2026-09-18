import axios from 'axios';

// In dev: proxy handles /api/* → https://rand-water-backend.onrender.com
// In prod: we need the full URL
const API_BASE = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 90000,  // 90s — accommodates Render free-tier cold start
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rw_token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const sentBearer = error.config?.headers?.Authorization?.startsWith?.('Bearer ');
    if (status === 401 && sentBearer && window.location.pathname !== '/login') {
      localStorage.removeItem('rw_token');
      localStorage.removeItem('rw_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
