import { create } from 'zustand';
import { mmkvStorage } from './mmkv';
import { format, subDays } from 'date-fns';
import { Platform } from 'react-native';

export interface StepEntry {
  date: string;
  count: number;
  source: 'pedometer' | 'health-connect' | 'google-fit';
}

interface StepsState {
  entries: StepEntry[];
  status: 'idle' | 'syncing' | 'ready' | 'no-data' | 'error';
  source: 'pedometer' | 'health-connect' | 'google-fit' | 'none';
  message: string;
  requestPermissions: () => Promise<boolean>;
  syncLast30Days: (promptForPermission?: boolean) => Promise<void>;
  todayCount: () => number;
  getRange: (days: number) => StepEntry[];
  load: () => void;
  _save: () => void;
}

async function fetchPedometerRange(promptForPermission = true): Promise<StepEntry[] | null> {
  try {
    const { Pedometer } = require('expo-sensors');
    const available = await Pedometer.isAvailableAsync();
    if (!available) return null;

    const permissionResult = promptForPermission
      ? await Pedometer.requestPermissionsAsync()
      : await Pedometer.getPermissionsAsync();
    const { status } = permissionResult;
    if (status !== 'granted') return null;

    const entries: StepEntry[] = [];
    const now = new Date();

    // Fetch day-by-day for last 30 days
    for (let i = 29; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const endOfDay = new Date(dayStart);
      endOfDay.setHours(23, 59, 59, 999);
      const dayEnd = endOfDay.getTime() > now.getTime() ? now : endOfDay;

      try {
        const result = await Pedometer.getStepCountAsync(dayStart, dayEnd);
        entries.push({
          date: format(dayStart, 'yyyy-MM-dd'),
          count: result?.steps ?? 0,
          source: 'pedometer',
        });
      } catch {
        entries.push({
          date: format(dayStart, 'yyyy-MM-dd'),
          count: 0,
          source: 'pedometer',
        });
      }
    }

    return entries;
  } catch {
    return null;
  }
}

function mergeStepEntries(existing: StepEntry[], incoming: StepEntry[]): StepEntry[] {
  const byDate = new Map<string, StepEntry>();
  existing.forEach((entry) => byDate.set(entry.date, entry));

  incoming.forEach((entry) => {
    const previous = byDate.get(entry.date);
    if (!previous || entry.count >= previous.count) {
      byDate.set(entry.date, entry);
      return;
    }
    byDate.set(entry.date, { ...previous, source: entry.source });
  });

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export const useStepsStore = create<StepsState>((set, get) => ({
  entries: [],
  status: 'idle',
  source: 'none',
  message: 'No data available',

  requestPermissions: async () => {
    const data = await fetchPedometerRange(true);
    if (data) {
      const entries = mergeStepEntries(get().entries, data);
      const hasData = entries.some(e => e.count > 0);
      set({
        entries,
        source: 'pedometer',
        status: hasData ? 'ready' : 'no-data',
        message: hasData ? '' : 'No step data found',
      });
      get()._save();
      return true;
    }
    set({ source: 'none', status: 'no-data', message: 'Step counter not available on this device', entries: [] });
    get()._save();
    return false;
  },

  syncLast30Days: async (promptForPermission = true) => {
    set({ status: 'syncing' });
    const data = await fetchPedometerRange(promptForPermission);
    const entries = data ? mergeStepEntries(get().entries, data) : get().entries;
    const hasData = entries.some(e => e.count > 0);
    set({
      entries,
      status: hasData ? 'ready' : 'no-data',
      source: data ? 'pedometer' : get().source,
      message: hasData ? '' : 'No step data found',
    });
    get()._save();
  },

  todayCount: () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return get().entries.find(e => e.date === today)?.count ?? 0;
  },

  getRange: (days) => {
    const cutoff = format(subDays(new Date(), days - 1), 'yyyy-MM-dd');
    return get().entries.filter(e => e.date >= cutoff);
  },

  load: () => {
    const raw = mmkvStorage.getString('steps');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      set({
        entries: parsed.entries ?? [],
        source: parsed.source ?? 'none',
        status: parsed.entries?.some((e: StepEntry) => e.count > 0) ? 'ready' : 'no-data',
        message: parsed.message ?? 'No data available',
      });
    } catch {
      set({ entries: [], source: 'none', status: 'no-data', message: 'No data available' });
    }
  },

  _save: () => {
    const { entries, source, message } = get();
    mmkvStorage.set('steps', JSON.stringify({ entries, source, message }));
  },
}));
