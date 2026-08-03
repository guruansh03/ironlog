import { Platform } from 'react-native';

let storage: { set: (k: string, v: string) => void; getString: (k: string) => string | undefined; delete: (k: string) => void };

if (Platform.OS === 'web') {
  storage = {
    set: (k, v) => localStorage.setItem(k, v),
    getString: (k) => localStorage.getItem(k) ?? undefined,
    delete: (k) => localStorage.removeItem(k),
  };
} else {
  const memoryFallback = new Map<string, string>();

  try {
    const mmkvModule = require('react-native-mmkv');
    const instance = typeof mmkvModule.createMMKV === 'function'
      ? mmkvModule.createMMKV({ id: 'ironlog' })
      : new mmkvModule.MMKV({ id: 'ironlog' });

    storage = {
      set: (k, v) => instance.set(k, v),
      getString: (k) => instance.getString(k),
      delete: (k) => instance.delete(k),
    };
  } catch (error) {
    console.warn('MMKV unavailable, using in-memory storage fallback.', error);
    storage = {
      set: (k, v) => memoryFallback.set(k, v),
      getString: (k) => memoryFallback.get(k),
      delete: (k) => memoryFallback.delete(k),
    };
  }
}

export const mmkvStorage = storage;
