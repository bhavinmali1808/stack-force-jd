import { create } from 'zustand';
import api from '../api';

export const useAuthStore = create((set) => ({
  admin: null,
  isLoading: true,

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    set({ admin: res.data.admin });
    return res.data;
  },

  logout: async () => {
    try { await api.post('/auth/logout'); } catch {}
    set({ admin: null });
  },

  fetchMe: async () => {
    try {
      const res = await api.get('/auth/me');
      set({ admin: res.data.admin, isLoading: false });
    } catch {
      set({ admin: null, isLoading: false });
    }
  },
}));
