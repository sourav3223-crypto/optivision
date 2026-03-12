import axios from 'axios';
const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 30000 });
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('optivision-auth');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
export default api;
