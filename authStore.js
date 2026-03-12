// src/stores/authStore.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null, token: null,
      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
        set({ user: data.user, token: data.token });
        return data;
      },
      logout: () => {
        delete api.defaults.headers.common['Authorization'];
        set({ user: null, token: null });
      },
    }),
    {
      name: 'optivision-auth',
      partialize: s => ({ user: s.user, token: s.token }),
      onRehydrateStorage: () => s => { if (s?.token) api.defaults.headers.common['Authorization'] = `Bearer ${s.token}`; }
    }
  )
);
