import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('sf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sf_token');
      localStorage.removeItem('sf_company');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// --- Auth ---
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// --- Roles ---
export const rolesAPI = {
  list: () => api.get('/roles'),
  get: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.patch(`/roles/${id}`, data),
  remove: (id) => api.delete(`/roles/${id}`),
};

// --- Email ---
export const emailAPI = {
  list: () => api.get('/email'),
  create: (data) => api.post('/email', data),
  delete: (id) => api.delete(`/email/${id}`),
};

// --- Candidates ---
export const candidatesAPI = {
  create: (roleId, data) => api.post(`/roles/${roleId}/candidates`, data),
  bulkUpload: (roleId, formData) => api.post(`/roles/${roleId}/candidates/bulk`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  upload: (roleId, formData) =>
    api.post(`/roles/${roleId}/candidates/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: (roleId, params) => api.get(`/roles/${roleId}/candidates`, { params }),
  get: (id) => api.get(`/candidates/${id}`),
  updateStatus: (id, data) => api.patch(`/candidates/${id}/status`, data),
  remove: (id) => api.delete(`/candidates/${id}`),
  export: (roleId, format = 'csv') =>
    api.get(`/roles/${roleId}/export`, { params: { format }, responseType: 'blob' }),
  analytics: (roleId) => api.get(`/roles/${roleId}/analytics`),
  fetchLinkedIn: (roleId, id, linkedinUrl) => api.post(`/roles/${roleId}/candidates/${id}/linkedin`, { linkedinUrl }),
};

export default api;
