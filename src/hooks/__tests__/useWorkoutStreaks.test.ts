import { calculateWorkoutStreaks } from '../useWorkoutStreaks';
import { WorkoutSession } from '../../store/gymStore';

function makeSession(startedAt: string): WorkoutSession {
  return {
    id: 's1',
    splitId: 'split-1',
    splitName: 'Test Split',
    dayName: 'Day A',
    startedAt,
    endedAt: startedAt,
    durationSeconds: 3600,
    totalVolume: 10000,
    exercises: [],
  };
}

describe('calculateWorkoutStreaks', () => {
  it('returns zero streaks for empty sessions', () => {
    const result = calculateWorkoutStreaks([]);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.totalSessions).toBe(0);
    expect(result.lastWorkoutDate).toBeNull();
  });

  it('calculates current streak including today', () => {
    const today = new Date();
    const iso = today.toISOString();
    const sessions = [makeSession(iso)];
    const result = calculateWorkoutStreaks(sessions, today);
    expect(result.currentStreak).toBe(1);
    expect(result.lastWorkoutDate).toBeDefined();
  });

  it('calculates current streak across multiple days', () => {
    const today = new Date('2024-06-15T12:00:00');
    const sessions = [
      makeSession('2024-06-15T10:00:00'),
      makeSession('2024-06-14T10:00:00'),
      makeSession('2024-06-13T10:00:00'),
    ];
    const result = calculateWorkoutStreaks(sessions, today);
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
  });

  it('breaks streak when a day is missed', () => {
    const today = new Date('2024-06-15T12:00:00');
    const sessions = [
      makeSession('2024-06-15T10:00:00'),
      makeSession('2024-06-13T10:00:00'),
    ];
    const result = calculateWorkoutStreaks(sessions, today);
    expect(result.currentStreak).toBe(1);
  });

  it('counts weekly and monthly sessions', () => {
    const today = new Date('2024-06-15T12:00:00');
    const sessions = [
      makeSession('2024-06-15T10:00:00'),
      makeSession('2024-06-10T10:00:00'),
      makeSession('2024-06-01T10:00:00'),
    ];
    const result = calculateWorkoutStreaks(sessions, today);
    expect(result.weeklyCount).toBe(2);
    expect(result.monthlyCount).toBe(3);
  });
});
