import axios from 'axios';

// Centralized Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  withCredentials: true, // Required for HttpOnly cookie authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for handling 401 errors (Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clean handling for unauthenticated sessions
    }
    return Promise.reject(error);
  }
);

export default api;
