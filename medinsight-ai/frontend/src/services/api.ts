import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Automatic JWT Bearer token attachment
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('medinsight_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for unified response unwrapping and auth handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized and not already on login page, clear expired session
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('medinsight_token');
        localStorage.removeItem('medinsight_user');
      }
    }
    return Promise.reject(error);
  }
);
