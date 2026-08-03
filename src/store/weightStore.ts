import { create } from 'zustand';
import { mmkvStorage } from './mmkv';
import { format } from 'date-fns';
import { generateId } from '../utils/generateId';

export interface WeightEntry {
  id: string;
  date: string;
  value: number;
  createdAt: string;
}

interface WeightState {
  entries: WeightEntry[];
  addEntry: (value: number, date?: string) => void;
  removeEntry: (id: string) => void;
  latest: () => WeightEntry | null;
  getRange: (days: number) => WeightEntry[];
  load: () => void;
  _save: () => void;
}

export const useWeightStore = create<WeightState>((set, get) => ({
  entries: [],

  addEntry: (value, date) => {
    const day = date ?? format(new Date(), 'yyyy-MM-dd');
    const clean = Number(value.toFixed(1));
    set(s => ({
      entries: [...s.entries, {
        id: generateId(), date: day, value: clean, createdAt: new Date().toISOString(),
      }].sort((a, b) => a.date === b.date
        ? a.createdAt.localeCompare(b.createdAt)
        : a.date.localeCompare(b.date)
      ),
    }));
    get()._save();
  },

  removeEntry: (id) => {
    set(s => ({ entries: s.entries.filter(e => e.id !== id) }));
    get()._save();
  },

  latest: () => {
    const list = get().entries;
    return list.length ? list[list.length - 1] : null;
  },

  getRange: (days) => {
    const cutoff = format(new Date(Date.now() - (days - 1) * 86400000), 'yyyy-MM-dd');
    return get().entries.filter(e => e.date >= cutoff);
  },

  load: () => {
    const raw = mmkvStorage.getString('weight');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as WeightEntry[];
      set({
        entries: (Array.isArray(parsed) ? parsed : []).sort((a, b) => a.date === b.date
          ? a.createdAt.localeCompare(b.createdAt)
          : a.date.localeCompare(b.date)
        ),
      });
    } catch {
      set({ entries: [] });
    }
  },

  _save: () => {
    mmkvStorage.set('weight', JSON.stringify(get().entries));
  },
}));