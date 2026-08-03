import { create } from 'zustand';
import { mmkvStorage } from './mmkv';
import { generateId as uuid } from '../utils/generateId';
import { format, startOfToday, subDays } from 'date-fns';
import * as Notifications from 'expo-notifications';

export type HabitType = 'yesno' | 'numeric' | 'timer';

export interface Habit {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: HabitType;
  target?: number;
  unit?: string;
  category: string;
  completions: string[];
  streak: number;
  bestStreak: number;
  order: number;
  reminderTime?: string; // "HH:mm"
  reminderNotificationId?: string;
  createdAt: string;
}

export const HABIT_CATEGORIES = [
  'General', 'Health', 'Fitness', 'Nutrition', 'Learning', 'Mindfulness', 'Productivity', 'Social',
];

const HABIT_COLORS = [
  '#6C63FF', '#FF6584', '#43CBFF', '#F7971E',
  '#6FCF97', '#BB6BD9', '#EB5757', '#2F80ED',
];

// ─── Completion Format ───────────────────────────────────────────────────────
// yesno:   "2026-04-25" or "2026-04-25@14:30" (with time tracking)
// numeric: "2026-04-25|3" or "2026-04-25|3@14:30"
//
// The @HH:MM suffix is optional and backward-compatible.

function getCompletionDates(habit: Habit): string[] {
  return habit.completions.map(c => c.split('|')[0].split('@')[0]);
}

export function isCompletedOn(habit: Habit, date: string): boolean {
  if (habit.type === 'yesno') {
    return habit.completions.some(c => c === date || c.startsWith(date + '@'));
  }
  return habit.completions.some(c => c.startsWith(date + '|'));
}

export function getValueOn(habit: Habit, date: string): number {
  const entry = habit.completions.find(c => c.startsWith(date + '|'));
  if (!entry) return 0;
  // "2026-04-25|3@14:30" → "3"
  const valuePart = entry.split('|')[1]?.split('@')[0];
  return parseFloat(valuePart) || 0;
}

export function getCompletionTime(habit: Habit, date: string): string | null {
  const entry = habit.completions.find(c => {
    const datePart = c.split('|')[0].split('@')[0];
    return datePart === date;
  });
  if (!entry) return null;
  const atIdx = entry.indexOf('@');
  if (atIdx === -1) return null;
  return entry.substring(atIdx + 1); // "14:30"
}

function nowTimeStr(): string {
  return format(new Date(), 'HH:mm');
}

function calcStreak(habit: Habit): { streak: number; bestStreak: number } {
  const dates = getCompletionDates(habit);
  if (!dates.length) return { streak: 0, bestStreak: habit.bestStreak || 0 };

  const uniqueSorted = [...new Set(dates)].sort().reverse();
  let streak = 0;
  const today = format(startOfToday(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(today + 'T12:00:00'), 1), 'yyyy-MM-dd');

  // Grace period: if today isn't done yet, start checking from yesterday
  // so the streak doesn't drop to 0 at midnight until user actually misses a day.
  const checkFrom = uniqueSorted[0] === today ? today : yesterday;
  let checking = checkFrom;

  for (const date of uniqueSorted) {
    if (date === checking) {
      streak++;
      checking = format(subDays(new Date(checking + 'T12:00:00'), 1), 'yyyy-MM-dd');
    } else if (date < checking) {
      break;
    }
  }

  const allSorted = [...new Set(dates)].sort();
  let run = 0;
  let best = habit.bestStreak || 0;
  for (let i = 0; i < allSorted.length; i++) {
    if (i === 0) { run = 1; }
    else {
      const prev = new Date(allSorted[i - 1] + 'T12:00:00');
      const curr = new Date(allSorted[i] + 'T12:00:00');
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > best) best = run;
  }
  return { streak, bestStreak: best };
}

// ─── Completion Rate Helpers ─────────────────────────────────────────────────
export function getCompletionRate(habit: Habit, days: number): number {
  const dateStrs: string[] = [];
  for (let i = 0; i < days; i++) {
    dateStrs.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
  }
  const done = dateStrs.filter(d => isCompletedOn(habit, d)).length;
  return days > 0 ? Math.round((done / days) * 100) : 0;
}

export function getAllCompletionRate(habits: Habit[], days: number): number {
  if (!habits.length) return 0;
  const dateStrs: string[] = [];
  for (let i = 0; i < days; i++) {
    dateStrs.push(format(subDays(new Date(), i), 'yyyy-MM-dd'));
  }
  const total = habits.length * dateStrs.length;
  const done = dateStrs.reduce(
    (sum, day) => sum + habits.filter(h => isCompletedOn(h, day)).length,
    0,
  );
  return total > 0 ? Math.round((done / total) * 100) : 0;
}

export function getDailyCompletionRates(habits: Habit[], days: number): number[] {
  if (!habits.length) return Array(days).fill(0);
  const rates: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const done = habits.filter(h => isCompletedOn(h, date)).length;
    rates.push(Math.round((done / habits.length) * 100));
  }
  return rates;
}

interface HabitState {
  habits: Habit[];
  addHabit: (name: string, icon: string, type?: HabitType, target?: number, unit?: string, category?: string) => void;
  deleteHabit: (id: string) => void;
  toggleToday: (id: string) => void;
  incrementToday: (id: string, amount?: number) => void;
  setValueToday: (id: string, value: number) => void;
  reorderHabits: (from: number, to: number) => void;
  setReminderTime: (id: string, time: string | undefined) => Promise<void>;
  updateHabitCategory: (id: string, category: string) => void;
  _toggleOnDate: (id: string, date: string) => void;
  _setValueOnDate: (id: string, value: number, date: string) => void;
  load: () => void;
  _save: () => void;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],

  addHabit: (name, icon, type = 'yesno', target, unit, category = 'General') => {
    const color = HABIT_COLORS[get().habits.length % HABIT_COLORS.length];
    const habit: Habit = {
      id: uuid(),
      name, icon, color, type, target, unit,
      category,
      completions: [],
      streak: 0,
      bestStreak: 0,
      order: get().habits.length,
      createdAt: new Date().toISOString(),
    };
    set(s => ({ habits: [...s.habits, habit] }));
    get()._save();
  },

  deleteHabit: (id) => {
    set(s => ({ habits: s.habits.filter(h => h.id !== id) }));
    get()._save();
  },

  toggleToday: (id) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const time = nowTimeStr();
    set(s => ({
      habits: s.habits.map(h => {
        if (h.id !== id) return h;
        const alreadyDone = h.completions.some(c => c === today || c.startsWith(today + '@'));
        const completions = alreadyDone
          ? h.completions.filter(d => d !== today && !d.startsWith(today + '@'))
          : [...h.completions, `${today}@${time}`];
        return { ...h, completions, ...calcStreak({ ...h, completions }) };
      }),
    }));
    get()._save();
  },

  incrementToday: (id, amount = 1) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const time = nowTimeStr();
    set(s => ({
      habits: s.habits.map(h => {
        if (h.id !== id) return h;
        const existing = h.completions.find(c => c.startsWith(today + '|'));
        let completions: string[];
        if (existing) {
          const oldVal = parseFloat(existing.split('|')[1]?.split('@')[0]) || 0;
          completions = h.completions.map(c =>
            c.startsWith(today + '|') ? `${today}|${oldVal + amount}@${time}` : c
          );
        } else {
          completions = [...h.completions, `${today}|${amount}@${time}`];
        }
        return { ...h, completions, ...calcStreak({ ...h, completions }) };
      }),
    }));
    get()._save();
  },

  setValueToday: (id, value) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const time = nowTimeStr();
    set(s => ({
      habits: s.habits.map(h => {
        if (h.id !== id) return h;
        const filtered = h.completions.filter(c => !c.startsWith(today + '|'));
        const completions = value > 0 ? [...filtered, `${today}|${value}@${time}`] : filtered;
        return { ...h, completions, ...calcStreak({ ...h, completions }) };
      }),
    }));
    get()._save();
  },

  reorderHabits: (from, to) => {
    set(s => {
      const habits = [...s.habits];
      const [moved] = habits.splice(from, 1);
      habits.splice(to, 0, moved);
      return { habits: habits.map((h, i) => ({ ...h, order: i })) };
    });
    get()._save();
  },

  updateHabitCategory: (id, category) => {
    set(s => ({
      habits: s.habits.map(h => h.id === id ? { ...h, category } : h),
    }));
    get()._save();
  },

  setReminderTime: async (id, time) => {
    const currentHabit = get().habits.find(h => h.id === id);
    if (!currentHabit) return;

    if (currentHabit.reminderNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(currentHabit.reminderNotificationId).catch(() => undefined);
    }

    let reminderNotificationId: string | undefined;
    if (time) {
      const [hourRaw, minuteRaw] = time.split(':');
      const hour = Number(hourRaw);
      const minute = Number(minuteRaw);
      if (Number.isFinite(hour) && Number.isFinite(minute)) {
        let perm = await Notifications.getPermissionsAsync();
        if (perm.status !== 'granted') {
          perm = await Notifications.requestPermissionsAsync();
        }
        if (perm.status === 'granted') {
          reminderNotificationId = await Notifications.scheduleNotificationAsync({
            content: {
              title: currentHabit.name,
              body: 'Time to log your habit',
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DAILY,
              hour,
              minute,
            },
          });
        }
      }
    }

    set(s => ({
      habits: s.habits.map(h => h.id === id ? { ...h, reminderTime: time, reminderNotificationId } : h),
    }));
    get()._save();
  },

  _toggleOnDate: (id, date) => {
    const time = nowTimeStr();
    set(s => ({
      habits: s.habits.map(h => {
        if (h.id !== id) return h;
        const alreadyDone = h.completions.some(c => c === date || c.startsWith(date + '@'));
        const completions = alreadyDone
          ? h.completions.filter(d => d !== date && !d.startsWith(date + '@'))
          : [...h.completions, `${date}@${time}`];
        return { ...h, completions, ...calcStreak({ ...h, completions }) };
      }),
    }));
    get()._save();
  },

  _setValueOnDate: (id, value, date) => {
    const time = nowTimeStr();
    set(s => ({
      habits: s.habits.map(h => {
        if (h.id !== id) return h;
        const filtered = h.completions.filter(c => !c.startsWith(date + '|'));
        const completions = value > 0 ? [...filtered, `${date}|${value}@${time}`] : filtered;
        return { ...h, completions, ...calcStreak({ ...h, completions }) };
      }),
    }));
    get()._save();
  },

  load: () => {
    const raw = mmkvStorage.getString('habits');
    if (!raw) return;
    try {
      const habits = JSON.parse(raw).map((h: any, i: number) => ({
        ...h,
        type: h.type || 'yesno',
        category: h.category || 'General',
        bestStreak: h.bestStreak || 0,
        order: h.order ?? i,
      }));
      set({ habits });
    } catch {
      set({ habits: [] });
    }
  },

  _save: () => {
    mmkvStorage.set('habits', JSON.stringify(get().habits));
  },
}));