import { create } from 'zustand';
import { mmkvStorage } from './mmkv';
import { generateId as uuid } from '../utils/generateId';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExerciseSet {
  id: string;
  weight: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  loadMode?: 'weight' | 'plates';
}

export interface WorkoutExercise {
  id: string;
  name: string;
  muscleGroup: string;
  sets: ExerciseSet[];
  note: string;
}

export interface WorkoutSession {
  id: string;
  splitId: string;
  splitName: string;
  dayName: string;
  exercises: WorkoutExercise[];
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  totalVolume: number;
}

export interface PersonalRecord {
  id: string;
  exerciseName: string;
  weight: number;
  reps: number;
  e1rm: number;
  achievedAt: string;
  sessionId: string;
}

export interface SplitDay {
  id: string;
  name: string;
  exercises: { id: string; name: string; muscleGroup: string }[];
}

export interface Split {
  id: string;
  name: string;
  days: SplitDay[];
  isCustom: boolean;
}

export interface CustomExercise {
  id: string;
  name: string;
  muscleGroup: string;
  createdAt: string;
}

// ─── Predefined Splits ────────────────────────────────────────────────────────

export const PREDEFINED_SPLITS: Split[] = [
  {
    id: 'ppl',
    name: 'PPL',
    isCustom: false,
    days: [
      {
        id: 'push', name: 'Push',
        exercises: [
          { id: 'bp', name: 'Bench Press', muscleGroup: 'Chest' },
          { id: 'ohp', name: 'Overhead Press', muscleGroup: 'Shoulders' },
          { id: 'tri', name: 'Tricep Pushdown', muscleGroup: 'Triceps' },
          { id: 'lat', name: 'Lateral Raise', muscleGroup: 'Shoulders' },
        ],
      },
      {
        id: 'pull', name: 'Pull',
        exercises: [
          { id: 'dl', name: 'Deadlift', muscleGroup: 'Back' },
          { id: 'row', name: 'Barbell Row', muscleGroup: 'Back' },
          { id: 'pu', name: 'Pull-up', muscleGroup: 'Back' },
          { id: 'curl', name: 'Barbell Curl', muscleGroup: 'Biceps' },
        ],
      },
      {
        id: 'legs', name: 'Legs',
        exercises: [
          { id: 'sq', name: 'Squat', muscleGroup: 'Quads' },
          { id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'Hamstrings' },
          { id: 'lp', name: 'Leg Press', muscleGroup: 'Quads' },
          { id: 'calf', name: 'Calf Raise', muscleGroup: 'Calves' },
        ],
      },
    ],
  },
  {
    id: 'bro',
    name: 'Bro Split',
    isCustom: false,
    days: [
      {
        id: 'chest_day', name: 'Chest',
        exercises: [
          { id: 'bp2', name: 'Bench Press', muscleGroup: 'Chest' },
          { id: 'inc', name: 'Incline Press', muscleGroup: 'Chest' },
          { id: 'fly', name: 'Cable Fly', muscleGroup: 'Chest' },
        ],
      },
      {
        id: 'back_day', name: 'Back',
        exercises: [
          { id: 'dl2', name: 'Deadlift', muscleGroup: 'Back' },
          { id: 'row2', name: 'T-Bar Row', muscleGroup: 'Back' },
          { id: 'pu2', name: 'Lat Pulldown', muscleGroup: 'Back' },
        ],
      },
      {
        id: 'shoulder_day', name: 'Shoulders',
        exercises: [
          { id: 'ohp2', name: 'Overhead Press', muscleGroup: 'Shoulders' },
          { id: 'lat2', name: 'Lateral Raise', muscleGroup: 'Shoulders' },
          { id: 'rr', name: 'Rear Delt Fly', muscleGroup: 'Shoulders' },
        ],
      },
      {
        id: 'arm_day', name: 'Arms',
        exercises: [
          { id: 'curl2', name: 'Barbell Curl', muscleGroup: 'Biceps' },
          { id: 'ham', name: 'Hammer Curl', muscleGroup: 'Biceps' },
          { id: 'tri2', name: 'Skull Crusher', muscleGroup: 'Triceps' },
        ],
      },
      {
        id: 'leg_day2', name: 'Legs',
        exercises: [
          { id: 'sq2', name: 'Squat', muscleGroup: 'Quads' },
          { id: 'lp2', name: 'Leg Press', muscleGroup: 'Quads' },
          { id: 'legcurl', name: 'Leg Curl', muscleGroup: 'Hamstrings' },
        ],
      },
    ],
  },
];

// ─── Progressive Overload Helper ─────────────────────────────────────────────

const LOWER_BODY = ['Quads', 'Hamstrings', 'Glutes', 'Calves'];

function effectiveWeight(s: ExerciseSet): number {
  return (s.loadMode ?? 'weight') === 'plates' ? s.weight * 2 + 20 : s.weight;
}

function suggestSets(exerciseName: string, muscleGroup: string, lastSets: ExerciseSet[]): ExerciseSet[] {
  if (!lastSets.length) return [{ id: uuid(), weight: 0, reps: 0, completed: false, loadMode: 'weight' }];

  const usable = lastSets.filter(s => s.weight > 0 && s.reps > 0);
  if (!usable.length) return lastSets.map(s => ({ ...s, id: uuid(), completed: false }));

  const allCompleted = usable.every(s => s.completed === true);
  const increment = LOWER_BODY.includes(muscleGroup) ? 5 : 2.5;
  const topSet = usable.reduce((best, s) => (s.weight > best.weight ? s : best), usable[0]);
  const suggestedWeight = allCompleted
    ? topSet.weight + increment
    : topSet.weight;

  return usable.map(s => ({
    id: uuid(),
    weight: suggestedWeight,
    reps: s.reps,
    completed: false,
    loadMode: s.loadMode ?? 'weight',
  }));
}

// ─── Store ────────────────────────────────────────────────────────────────────

interface GymState {
  splits: Split[];
  sessions: WorkoutSession[];
  prs: PersonalRecord[];
  activeSession: WorkoutSession | null;
  customExercises: CustomExercise[];
  lastSetsCache: Record<string, ExerciseSet[]>;

  // Splits
  addSplit: (split: Split) => void;
  deleteSplit: (id: string) => void;

  // Custom exercises
  addCustomExercise: (name: string, muscleGroup: string) => void;
  deleteCustomExercise: (id: string) => void;

  // Session
  startSession: (split: Split, day: SplitDay) => void;
  addExerciseToSession: (exercise: WorkoutExercise) => void;
  addSetToExercise: (exerciseId: string) => void;
  insertSetInExercise: (exerciseId: string, set: ExerciseSet, index: number) => void;
  updateSet: (exerciseId: string, setId: string, data: Partial<ExerciseSet>) => void;
  removeSet: (exerciseId: string, setId: string) => void;
  toggleSetComplete: (exerciseId: string, setId: string) => void;
  updateExerciseNote: (exerciseId: string, note: string) => void;
  removeExerciseFromSession: (exerciseId: string) => void;
  reorderExercises: (from: number, to: number) => void;
  endSession: () => void;
  discardSession: () => void;

  // Persist
  load: () => void;
  _save: () => void;
}

export const useGymStore = create<GymState>((set, get) => ({
  splits: [],
  sessions: [],
  prs: [],
  activeSession: null,
  customExercises: [],
  lastSetsCache: {},

  addSplit: (split) => {
    set(s => ({ splits: [...s.splits, split] }));
    get()._save();
  },

  deleteSplit: (id) => {
    set(s => ({ splits: s.splits.filter(sp => sp.id !== id) }));
    get()._save();
  },

  addCustomExercise: (name, muscleGroup) => {
    const ex: CustomExercise = {
      id: uuid(),
      name: name.trim(),
      muscleGroup,
      createdAt: new Date().toISOString(),
    };
    set(s => ({ customExercises: [...s.customExercises, ex] }));
    get()._save();
  },

  deleteCustomExercise: (id) => {
    set(s => ({ customExercises: s.customExercises.filter(e => e.id !== id) }));
    get()._save();
  },

  startSession: (split, day) => {
    const latestSetsByExercise = get().lastSetsCache;

    const session: WorkoutSession = {
      id: uuid(),
      splitId: split.id,
      splitName: split.name,
      dayName: day.name,
      exercises: day.exercises.map(ex => ({
        id: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: suggestSets(ex.name, ex.muscleGroup, latestSetsByExercise[ex.name] ?? []),
        note: '',
      })),
      startedAt: new Date().toISOString(),
      endedAt: null,
      durationSeconds: 0,
      totalVolume: 0,
    };
    set({ activeSession: session });
  },

  addExerciseToSession: (exercise) => {
    set(s => {
      if (!s.activeSession) return s;
      return { activeSession: { ...s.activeSession, exercises: [...s.activeSession.exercises, exercise] } };
    });
  },

  addSetToExercise: (exerciseId) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex =>
            ex.id === exerciseId
              ? {
                  ...ex,
                  sets: [
                    ...ex.sets,
                    {
                      id: uuid(),
                      weight: ex.sets[ex.sets.length - 1]?.weight ?? 0,
                      reps: ex.sets[ex.sets.length - 1]?.reps ?? 0,
                      completed: false,
                      loadMode: ex.sets[ex.sets.length - 1]?.loadMode ?? 'weight',
                    },
                  ],
                }
              : ex
          ),
        },
      };
    });
  },

  insertSetInExercise: (exerciseId, setToInsert, index) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex => {
            if (ex.id !== exerciseId) return ex;
            const sets = [...ex.sets];
            const safeIndex = Math.max(0, Math.min(index, sets.length));
            sets.splice(safeIndex, 0, { ...setToInsert });
            return { ...ex, sets };
          }),
        },
      };
    });
  },

  updateSet: (exerciseId, setId, data) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.map(st => st.id === setId ? { ...st, ...data } : st) }
              : ex
          ),
        },
      };
    });
  },

  removeSet: (exerciseId, setId) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.filter(st => st.id !== setId) }
              : ex
          ),
        },
      };
    });
  },

  toggleSetComplete: (exerciseId, setId) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex =>
            ex.id === exerciseId
              ? { ...ex, sets: ex.sets.map(st => st.id === setId ? { ...st, completed: !st.completed } : st) }
              : ex
          ),
        },
      };
    });
  },

  updateExerciseNote: (exerciseId, note) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.map(ex =>
            ex.id === exerciseId ? { ...ex, note } : ex
          ),
        },
      };
    });
  },

  removeExerciseFromSession: (exerciseId) => {
    set(s => {
      if (!s.activeSession) return s;
      return {
        activeSession: {
          ...s.activeSession,
          exercises: s.activeSession.exercises.filter(ex => ex.id !== exerciseId),
        },
      };
    });
  },

  reorderExercises: (from, to) => {
    set(s => {
      if (!s.activeSession) return s;
      const exs = [...s.activeSession.exercises];
      const [moved] = exs.splice(from, 1);
      exs.splice(to, 0, moved);
      return { activeSession: { ...s.activeSession, exercises: exs } };
    });
  },

  endSession: () => {
    const { activeSession, prs } = get();
    if (!activeSession) return;

    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - new Date(activeSession.startedAt).getTime()) / 1000);
    const totalVolume = activeSession.exercises.reduce((acc, ex) =>
      acc + ex.sets
        .filter(s => effectiveWeight(s) > 0 && s.reps > 0)
        .reduce((a, s) => a + effectiveWeight(s) * s.reps, 0), 0
    );

    const existingBest = prs.reduce((map, pr) => {
      map.set(pr.exerciseName, Math.max(map.get(pr.exerciseName) ?? 0, pr.e1rm));
      return map;
    }, new Map<string, number>());

    const completed: WorkoutSession = {
      ...activeSession,
      endedAt: now.toISOString(),
      durationSeconds,
      totalVolume,
    };

    const newPrs: PersonalRecord[] = [];
    for (const exercise of completed.exercises) {
      const topSet = exercise.sets
        .filter(s => effectiveWeight(s) > 0 && s.reps > 0)
        .reduce<{ weight: number; reps: number; e1rm: number } | null>((best, s) => {
          const cappedReps = Math.min(s.reps, 10);
          const normalizedWeight = effectiveWeight(s);
          const e1rm = Math.round((normalizedWeight * (1 + cappedReps / 30)) * 10) / 10;
          return !best || e1rm > best.e1rm ? { weight: normalizedWeight, reps: s.reps, e1rm } : best;
        }, null);

      if (!topSet) continue;
      const bestBefore = existingBest.get(exercise.name) ?? 0;
      if (topSet.e1rm > bestBefore) {
        newPrs.push({
          id: uuid(),
          exerciseName: exercise.name,
          weight: topSet.weight,
          reps: topSet.reps,
          e1rm: topSet.e1rm,
          achievedAt: now.toISOString(),
          sessionId: completed.id,
        });
        existingBest.set(exercise.name, topSet.e1rm);
      }
    }

    const cachePatch = completed.exercises.reduce<Record<string, ExerciseSet[]>>((acc, exercise) => {
      const usable = exercise.sets.filter(s => s.reps > 0 && effectiveWeight(s) > 0);
      if (usable.length) acc[exercise.name] = usable.map(s => ({ ...s }));
      return acc;
    }, {});

    set(s => ({
      sessions: [completed, ...s.sessions],
      prs: [...newPrs, ...s.prs],
      lastSetsCache: { ...s.lastSetsCache, ...cachePatch },
      activeSession: null,
    }));
    get()._save();
  },

  discardSession: () => set({ activeSession: null }),

  load: () => {
    const raw = mmkvStorage.getString('gym');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      const normalizedSessions: WorkoutSession[] = (data.sessions ?? []).map((session: WorkoutSession) => ({
        ...session,
        exercises: (session.exercises ?? []).map(ex => ({
          ...ex,
          sets: (ex.sets ?? []).map(s => ({ ...s, loadMode: s.loadMode ?? 'weight' })),
        })),
      }));
      const loadedCache = data.lastSetsCache ?? {};
      const derivedCache = normalizedSessions.reduce<Record<string, ExerciseSet[]>>((acc, session) => {
        for (const exercise of session.exercises) {
          if (acc[exercise.name]) continue;
          const usable = exercise.sets.filter(s => s.reps > 0 && effectiveWeight(s) > 0);
          if (usable.length) acc[exercise.name] = usable.map(s => ({ ...s }));
        }
        return acc;
      }, {});
      set({
        splits: Array.isArray(data.splits) ? data.splits : [],
        sessions: normalizedSessions,
        prs: data.prs ?? [],
        customExercises: data.customExercises ?? [],
        lastSetsCache: { ...derivedCache, ...loadedCache },
      });
    } catch {
      // Corrupted data — reset to safe defaults rather than crashing
      set({ splits: [], sessions: [], prs: [], customExercises: [], lastSetsCache: {} });
    }
  },

  _save: () => {
    const { splits, sessions, prs, customExercises, lastSetsCache } = get();
    mmkvStorage.set('gym', JSON.stringify({
      splits,
      sessions,
      prs,
      customExercises,
      lastSetsCache,
    }));
  },
}));