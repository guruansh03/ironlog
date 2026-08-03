import { create } from 'zustand';
import { mmkvStorage } from './mmkv';
import { generateId as uuid } from '../utils/generateId';
import { format, subDays } from 'date-fns';

export interface BodyMeasurements {
  chest?: number;
  waist?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
  neck?: number;
  shoulders?: number;
  calves?: number;
}

export interface MeasurementEntry {
  id: string;
  date: string; // yyyy-MM-dd
  measurements: BodyMeasurements;
  createdAt: string;
}

export const MEASUREMENT_LABELS: Record<keyof BodyMeasurements, string> = {
  chest: 'Chest',
  waist: 'Waist',
  hips: 'Hips',
  arms: 'Arms',
  thighs: 'Thighs',
  neck: 'Neck',
  shoulders: 'Shoulders',
  calves: 'Calves',
};

export const MEASUREMENT_KEYS = Object.keys(MEASUREMENT_LABELS) as (keyof BodyMeasurements)[];

interface MeasurementsState {
  entries: MeasurementEntry[];
  addEntry: (date: string, measurements: BodyMeasurements) => void;
  removeEntry: (id: string) => void;
  getRange: (days: number) => MeasurementEntry[];
  latest: () => MeasurementEntry | null;
  load: () => void;
  _save: () => void;
}

export const useMeasurementsStore = create<MeasurementsState>((set, get) => ({
  entries: [],

  addEntry: (date, measurements) => {
    // Remove any empty values
    const clean: BodyMeasurements = {};
    for (const key of MEASUREMENT_KEYS) {
      const val = measurements[key];
      if (val !== undefined && val !== null && !isNaN(val) && val > 0) {
        clean[key] = Number(val.toFixed(1));
      }
    }
    if (Object.keys(clean).length === 0) return;

    const entry: MeasurementEntry = {
      id: uuid(),
      date,
      measurements: clean,
      createdAt: new Date().toISOString(),
    };
    set(s => ({
      entries: [...s.entries, entry].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    get()._save();
  },

  removeEntry: (id) => {
    set(s => ({ entries: s.entries.filter(e => e.id !== id) }));
    get()._save();
  },

  getRange: (days) => {
    const cutoff = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
    return get().entries.filter(e => e.date >= cutoff);
  },

  latest: () => {
    const { entries } = get();
    if (!entries.length) return null;
    return entries[entries.length - 1];
  },

  load: () => {
    const raw = mmkvStorage.getString('measurements');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      set({ entries: Array.isArray(parsed) ? parsed : [] });
    } catch {
      set({ entries: [] });
    }
  },

  _save: () => {
    mmkvStorage.set('measurements', JSON.stringify(get().entries));
  },
}));
