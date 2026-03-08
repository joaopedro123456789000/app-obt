import { create } from 'zustand';
import { User } from '../types';

// Mock user for demo purposes
const DEMO_USER: User = {
  user_id: 'demo_user_123',
  email: 'demo@ecoponto.com',
  name: 'Usuário Demo',
  picture: undefined,
  points: 350,
  level: 2,
  total_kg_collected: 15.5,
  total_co2_saved: 23.2,
  role: 'user',
  city: 'São Paulo',
  state: 'SP',
  created_at: new Date().toISOString(),
};

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
  updateUserStats: (stats: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: DEMO_USER,
  isAuthenticated: true,
  isLoading: false,
  setUser: (user) => set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (loading) => set({ isLoading: loading }),
  logout: () => set({ user: DEMO_USER, isAuthenticated: true }),
  updateUserStats: (stats) => set((state) => ({
    user: state.user ? { ...state.user, ...stats } : null,
  })),
}));
