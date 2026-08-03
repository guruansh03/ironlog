import { useMemo } from 'react';
import { format, subDays, parseISO } from 'date-fns';
import { WorkoutSession } from '../store/gymStore';

export interface WorkoutStreakInfo {
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastWorkoutDate: string | null;
  weeklyCount: number;
  monthlyCount: number;
}

export function calculateWorkoutStreaks(
  sessions: WorkoutSession[],
  now = new Date()
): WorkoutStreakInfo {
  if (!sessions.length) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      totalSessions: 0,
      lastWorkoutDate: null,
      weeklyCount: 0,
      monthlyCount: 0,
    };
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  const totalSessions = sorted.length;
  const lastWorkoutDate = format(parseISO(sorted[0].startedAt), 'yyyy-MM-dd');

  // Build a Set of workout dates
  const workoutDates = new Set(
    sorted.map((s) => format(parseISO(s.startedAt), 'yyyy-MM-dd'))
  );

  // Current streak
  let currentStreak = 0;
  const today = format(now, 'yyyy-MM-dd');
  const offset = workoutDates.has(today) ? 0 : 1;
  while (
    workoutDates.has(format(subDays(now, offset + currentStreak), 'yyyy-MM-dd'))
  ) {
    currentStreak++;
  }

  // Longest streak
  const allDates = Array.from(workoutDates).sort();
  let longestStreak = 0;
  let run = 0;
  for (let i = 0; i < allDates.length; i++) {
    if (i === 0) {
      run = 1;
    } else {
      const prev = new Date(allDates[i - 1] + 'T12:00:00');
      const curr = new Date(allDates[i] + 'T12:00:00');
      const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000);
      run = diff === 1 ? run + 1 : 1;
    }
    if (run > longestStreak) longestStreak = run;
  }

  const weekAgo = subDays(now, 7);
  const monthAgo = subDays(now, 30);

  const weeklyCount = sorted.filter(
    (s) => parseISO(s.startedAt) >= weekAgo
  ).length;
  const monthlyCount = sorted.filter(
    (s) => parseISO(s.startedAt) >= monthAgo
  ).length;

  return {
    currentStreak,
    longestStreak,
    totalSessions,
    lastWorkoutDate,
    weeklyCount,
    monthlyCount,
  };
}

export function useWorkoutStreaks(sessions: WorkoutSession[]): WorkoutStreakInfo {
  return useMemo(() => calculateWorkoutStreaks(sessions), [sessions]);
}
