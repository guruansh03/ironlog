/**
 * Muscle Recovery Heatmap Logic
 *
 * For each muscle group, calculates how many hours since it was last trained.
 * Returns a recovery status: 'fatigued' | 'recovering' | 'ready' | 'untrained'
 */

import { WorkoutSession } from '../store/gymStore';

export type RecoveryStatus = 'fatigued' | 'recovering' | 'ready' | 'untrained';

export interface MuscleRecovery {
  muscleGroup: string;
  status: RecoveryStatus;
  hoursSinceLastTrained: number;
  lastTrainedDate: string | null;
  totalSetsLast7Days: number;
}

import { MUSCLE_GROUPS } from './exerciseData';

const ALL_MUSCLE_GROUPS = [...MUSCLE_GROUPS] as string[];

/**
 * Calculate recovery status for all muscle groups based on session history.
 * - < 24h → fatigued (red)
 * - 24–48h → recovering (yellow)
 * - > 48h → ready (green)
 * - Never trained → untrained (gray)
 */
export function calculateMuscleRecovery(sessions: WorkoutSession[]): MuscleRecovery[] {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  // Find last trained time and 7-day set count per muscle group
  const lastTrained = new Map<string, number>();
  const setCount7d = new Map<string, number>();

  for (const session of sessions) {
    const sessionTime = new Date(session.startedAt).getTime();
    for (const exercise of session.exercises) {
      // Normalize to title-case for case-insensitive matching
      const raw = exercise.muscleGroup ?? '';
      const mg = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      const existing = lastTrained.get(mg) ?? 0;
      if (sessionTime > existing) lastTrained.set(mg, sessionTime);

      if (sessionTime >= sevenDaysAgo) {
        const completedSets = exercise.sets.filter(s => s.completed && s.weight > 0 && s.reps > 0).length;
        setCount7d.set(mg, (setCount7d.get(mg) ?? 0) + completedSets);
      }
    }
  }

  return ALL_MUSCLE_GROUPS.map(mg => {
    const lastTime = lastTrained.get(mg);
    if (!lastTime) {
      return {
        muscleGroup: mg,
        status: 'untrained' as RecoveryStatus,
        hoursSinceLastTrained: Infinity,
        lastTrainedDate: null,
        totalSetsLast7Days: 0,
      };
    }

    const hoursSince = (now - lastTime) / (1000 * 60 * 60);
    let status: RecoveryStatus;
    if (hoursSince < 24) status = 'fatigued';
    else if (hoursSince < 48) status = 'recovering';
    else status = 'ready';

    return {
      muscleGroup: mg,
      status,
      hoursSinceLastTrained: Math.round(hoursSince),
      lastTrainedDate: new Date(lastTime).toISOString(),
      totalSetsLast7Days: setCount7d.get(mg) ?? 0,
    };
  });
}

export function getRecoveryColor(status: RecoveryStatus): string {
  switch (status) {
    case 'fatigued': return '#ef4444';
    case 'recovering': return '#f59e0b';
    case 'ready': return '#22c55e';
    case 'untrained': return '#6b7280';
  }
}

export function getRecoveryLabel(status: RecoveryStatus): string {
  switch (status) {
    case 'fatigued': return 'Fatigued';
    case 'recovering': return 'Recovering';
    case 'ready': return 'Ready';
    case 'untrained': return 'Not trained';
  }
}
