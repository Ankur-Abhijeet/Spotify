'use client';

import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  init: () => Promise<void>;
  login: (email: string, password?: string) => Promise<void>;
  signup: (email: string, password?: string, firstName?: string, lastName?: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  init: async () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('access_token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      set({
        accessToken: token,
        user: JSON.parse(savedUser),
        isAuthenticated: true,
      });

      // Verify token/profile with backend
      try {
        const res = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const user = await res.json();
          localStorage.setItem('user', JSON.stringify(user));
          set({ user });
        } else {
          // Token expired or invalid
          get().logout();
        }
      } catch (err) {
        console.error('Failed to verify session, offline or API down', err);
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Login failed');
      }

      const data = await res.json();
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signup: async (email, password, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Signup failed');
      }

      const data = await res.json();
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      localStorage.setItem('user', JSON.stringify(data.user));

      set({
        user: data.user,
        accessToken: data.accessToken,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  clearError: () => set({ error: null }),
}));
