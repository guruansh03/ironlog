import { create } from 'zustand';
import { mmkvStorage } from './mmkv';

interface User {
  name: string;
  accent: string;
  unit: 'kg' | 'lbs';
}

interface UserState {
  user: User;
  setName: (name: string) => void;
  setAccent: (accent: string) => void;
  setUnit: (unit: 'kg' | 'lbs') => void;
  loadUser: () => void;
}

const DEFAULT_USER: User = { name: '', accent: '#6C63FF', unit: 'kg' };

export const useUserStore = create<UserState>((set, get) => ({
  user: DEFAULT_USER,

  setName: (name) => {
    const user = { ...get().user, name };
    set({ user });
    mmkvStorage.set('user', JSON.stringify(user));
  },

  setAccent: (accent) => {
    const user = { ...get().user, accent };
    set({ user });
    mmkvStorage.set('user', JSON.stringify(user));
  },

  setUnit: (unit) => {
    const user = { ...get().user, unit };
    set({ user });
    mmkvStorage.set('user', JSON.stringify(user));
  },

  loadUser: () => {
    const raw = mmkvStorage.getString('user');
    if (raw) set({ user: { ...DEFAULT_USER, ...JSON.parse(raw) } });
  },
}));