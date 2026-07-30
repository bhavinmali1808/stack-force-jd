import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:5000/api/public',
  headers: { 'Content-Type': 'application/json' },
});

export const publicAPI = {
  getJobs: (params) => api.get('/jobs', { params }),
  getJob: (id) => api.get(`/jobs/${id}`),
  getCompanies: () => api.get('/companies'),
  
// Admin Endpoints with JWT Authentication
  adminLogin: (credentials) => api.post('/admin/login', credentials),
  deleteJob: (id, token) => api.delete(`/admin/jobs/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
  bulkImportJobs: (data, token) => api.post('/admin/jobs/bulk', data, { headers: { Authorization: `Bearer ${token}` } }),
  parseWhatsAppMessage: (messageText, token) => api.post('/admin/whatsapp/parse', { messageText }, { headers: { Authorization: `Bearer ${token}` } }),
};

export default api;
