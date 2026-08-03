import { mmkvStorage } from '../store/mmkv';
import { format, subDays } from 'date-fns';
import { DEFAULT_FOOD_DATABASE } from './nutritionFoodDatabase';

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function e1rm(weight: number, reps: number) {
  return Math.round((weight * (1 + reps / 30)) * 10) / 10;
}

function makeSet(weight: number, reps: number, weekIndex: number) {
  const progressiveWeight = weight + Math.floor(weekIndex / 4) * 2.5;
  const setWeight = Math.max(0, progressiveWeight + randomBetween(-5, 5));
  const setReps = Math.max(3, reps + randomBetween(-2, 2));
  return { id: id(), weight: setWeight, reps: setReps, completed: true };
}

function makeExercise(name: string, muscle: string, weight: number, reps: number, weekIndex: number, sets = 4) {
  return {
    id: id(),
    name,
    muscleGroup: muscle,
    sets: Array.from({ length: sets }, () => makeSet(weight, reps, weekIndex)),
    note: randomBetween(0, 8) === 0 ? 'Felt strong. Keep same cue next time.' : '',
  };
}

const demoSplit = {
  id: 'hybrid-5-day',
  name: 'Hybrid 5-Day',
  isCustom: true,
  days: [
    {
      id: 'push', name: 'Push',
      exercises: [
        { id: 'bp', name: 'Bench Press', muscleGroup: 'Chest' },
        { id: 'ohp', name: 'Overhead Press', muscleGroup: 'Shoulders' },
        { id: 'inc', name: 'Incline DB Press', muscleGroup: 'Chest' },
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
        { id: 'face', name: 'Face Pull', muscleGroup: 'Back' },
      ],
    },
    {
      id: 'legs', name: 'Legs',
      exercises: [
        { id: 'sq', name: 'Squat', muscleGroup: 'Quads' },
        { id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'Hamstrings' },
        { id: 'lp', name: 'Leg Press', muscleGroup: 'Quads' },
        { id: 'legcurl', name: 'Leg Curl', muscleGroup: 'Hamstrings' },
        { id: 'calf', name: 'Calf Raise', muscleGroup: 'Calves' },
      ],
    },
  ],
};

const DAY_PATTERNS = [
  { splitDay: demoSplit.days[0], exercises: [
    { name: 'Bench Press', muscle: 'Chest', weight: 80, reps: 8 },
    { name: 'Overhead Press', muscle: 'Shoulders', weight: 55, reps: 8 },
    { name: 'Incline DB Press', muscle: 'Chest', weight: 30, reps: 10 },
    { name: 'Tricep Pushdown', muscle: 'Triceps', weight: 25, reps: 12 },
    { name: 'Lateral Raise', muscle: 'Shoulders', weight: 12, reps: 15 },
  ]},
  { splitDay: demoSplit.days[1], exercises: [
    { name: 'Deadlift', muscle: 'Back', weight: 120, reps: 5 },
    { name: 'Barbell Row', muscle: 'Back', weight: 70, reps: 8 },
    { name: 'Pull-up', muscle: 'Back', weight: 0, reps: 8 },
    { name: 'Barbell Curl', muscle: 'Biceps', weight: 40, reps: 10 },
    { name: 'Face Pull', muscle: 'Back', weight: 20, reps: 15 },
  ]},
  { splitDay: demoSplit.days[2], exercises: [
    { name: 'Squat', muscle: 'Quads', weight: 100, reps: 6 },
    { name: 'Romanian Deadlift', muscle: 'Hamstrings', weight: 80, reps: 10 },
    { name: 'Leg Press', muscle: 'Quads', weight: 150, reps: 12 },
    { name: 'Leg Curl', muscle: 'Hamstrings', weight: 40, reps: 12 },
    { name: 'Calf Raise', muscle: 'Calves', weight: 60, reps: 20 },
  ]},
];

function generateSessions() {
  const sessions = [];
  const prs: any[] = [];
  const bestE1rm: Record<string, number> = {};

  for (let weekIndex = 11; weekIndex >= 0; weekIndex--) {
    const baseDay = 7 * weekIndex;
    const daysInWeek = weekIndex === 0
      ? [0, 2, 4]
      : [randomBetween(0, 1), randomBetween(2, 3), randomBetween(4, 6)];

    for (let di = 0; di < Math.min(3, daysInWeek.length); di++) {
      if (randomBetween(0, 9) === 0) continue; // ~10% skip

      const daysAgo = baseDay + daysInWeek[di];
      const date = subDays(new Date(), daysAgo);
      const pattern = DAY_PATTERNS[di % DAY_PATTERNS.length];
      const startedAt = new Date(date);
      startedAt.setHours(randomBetween(6, 20), randomBetween(0, 59), 0, 0);
      const duration = randomBetween(45, 90) * 60;

      const exercises = pattern.exercises.map(ex => makeExercise(ex.name, ex.muscle, ex.weight, ex.reps, weekIndex));
      let totalVolume = 0;

      for (const ex of exercises) {
        for (const set of ex.sets) {
          if (set.weight > 0 && set.reps > 0) totalVolume += set.weight * set.reps;
          const e = e1rm(set.weight, set.reps);
          if (!bestE1rm[ex.name] || e > bestE1rm[ex.name]) {
            bestE1rm[ex.name] = e;
            prs.push({
              id: id(), exerciseName: ex.name, weight: set.weight,
              reps: set.reps, e1rm: e,
              achievedAt: startedAt.toISOString(), sessionId: '',
            });
          }
        }
      }

      sessions.push({
        id: id(),
        splitId: demoSplit.id,
        splitName: demoSplit.name,
        dayName: pattern.splitDay.name,
        exercises,
        startedAt: startedAt.toISOString(),
        endedAt: new Date(startedAt.getTime() + duration * 1000).toISOString(),
        durationSeconds: duration,
        totalVolume,
      });
    }
  }

  return { sessions: sessions.reverse(), prs };
}

function generateHabits() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const habits = [
    { name: 'Morning Workout', icon: '🏋️', type: 'yesno', color: '#6C63FF' },
    { name: 'Water Intake', icon: '💧', type: 'numeric', target: 8, unit: 'glasses', color: '#43CBFF' },
    { name: 'Read', icon: '📚', type: 'yesno', color: '#F7971E' },
    { name: 'Meditate', icon: '🧘', type: 'yesno', color: '#6FCF97' },
    { name: 'Sleep 8h', icon: '😴', type: 'yesno', color: '#BB6BD9' },
  ];

  return habits.map((h, hi) => {
    const completions: string[] = [];
    for (let i = 89; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const chance = randomBetween(0, 9);
      if (chance > 2) {
        if (h.type === 'yesno') completions.push(date);
        else completions.push(`${date}|${randomBetween(4, h.target ?? 8)}`);
      }
    }
    return {
      id: id(), name: h.name, icon: h.icon, color: h.color,
      type: h.type, target: h.target, unit: h.unit,
      completions, streak: randomBetween(3, 21), bestStreak: randomBetween(14, 60),
      order: hi, createdAt: subDays(new Date(), 90).toISOString(),
    };
  });
}

function generateWeights() {
  const weights = [];
  let w = 78;
  for (let i = 89; i >= 0; i--) {
    if (randomBetween(0, 2) === 0) continue;
    w = Math.max(60, Math.min(120, w + (Math.random() - 0.52) * 0.4));
    weights.push({
      id: id(),
      date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
      value: Number(w.toFixed(1)),
      createdAt: new Date(subDays(new Date(), i)).toISOString(),
    });
  }
  return weights;
}

function generateNotes() {
  return [
    {
      id: id(), title: 'Pre-workout cues', type: 'note', pinned: true,
      body: 'Bench: retract scapula, stay tight\nSquat: brace hard, knees out\nDeadlift: lat spread, hinge don\'t squat',
      completedItems: [], createdAt: subDays(new Date(), 14).toISOString(), updatedAt: subDays(new Date(), 3).toISOString(),
    },
    {
      id: id(), title: 'Weekly goals', type: 'todo', pinned: false,
      body: '- Hit 4 sessions\n- Sleep before midnight\n- Creatine daily\n- Meal prep Sunday',
      completedItems: [0, 2], createdAt: subDays(new Date(), 7).toISOString(), updatedAt: subDays(new Date(), 1).toISOString(),
    },
  ];
}

function generateNutrition() {
  const goal = { calories: 2200, protein: 160, carbs: 250, fats: 70, fiber: 30, waterL: 3 };
  const foods = DEFAULT_FOOD_DATABASE.slice(0, 80);
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
  const entries: Array<any> = [];
  const waterEntries: Array<any> = [];
  const recipes: Array<any> = [];

  for (let i = 20; i >= 0; i--) {
    const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
    const mealsToday = randomBetween(2, 4);
    for (let m = 0; m < mealsToday; m++) {
      const food = foods[randomBetween(0, Math.max(0, foods.length - 1))];
      if (!food) continue;
      const qty = Number((0.6 + Math.random() * 1.2).toFixed(2));
      entries.push({
        id: id(),
        date,
        mealType: mealTypes[m % mealTypes.length],
        foodName: food.name,
        source: food.source,
        state: food.state,
        quantity: qty,
        calories: Number((food.calories * qty).toFixed(1)),
        protein: Number((food.protein * qty).toFixed(1)),
        carbs: Number((food.carbs * qty).toFixed(1)),
        fats: Number((food.fats * qty).toFixed(1)),
        loggedAt: new Date(subDays(new Date(), i)).toISOString(),
      });
    }
    // Water entries
    const waterGlasses = randomBetween(4, 10);
    for (let w = 0; w < waterGlasses; w++) {
      waterEntries.push({
        id: id(),
        date,
        ml: randomBetween(200, 350),
        loggedAt: new Date(subDays(new Date(), i)).toISOString(),
      });
    }
  }

  // Demo recipe
  recipes.push({
    id: id(),
    name: 'Protein Oats',
    ingredients: [
      { foodId: foods[0]?.id ?? 'oats', foodName: foods[0]?.name ?? 'Oats', quantity: 1, calories: 150, protein: 5, carbs: 27, fats: 3 },
      { foodId: foods[1]?.id ?? 'whey', foodName: foods[1]?.name ?? 'Whey Protein', quantity: 1, calories: 120, protein: 24, carbs: 2, fats: 1 },
    ],
    servings: 1,
    totalCalories: 270,
    totalProtein: 29,
    totalCarbs: 29,
    totalFats: 4,
    createdAt: subDays(new Date(), 5).toISOString(),
  });

  return { goal, foods, entries, waterEntries, recipes };
}

function generateMeasurements() {
  const entries = [];
  const keys = ['chest', 'waist', 'arms', 'thighs'] as const;
  for (let i = 11; i >= 0; i--) {
    const date = format(subDays(new Date(), i * 7), 'yyyy-MM-dd');
    const measurements: Record<string, number> = {};
    keys.forEach((k) => {
      measurements[k] = Number((randomBetween(30, 110) + Math.random()).toFixed(1));
    });
    entries.push({
      id: id(),
      date,
      measurements,
      createdAt: new Date(subDays(new Date(), i * 7)).toISOString(),
    });
  }
  return entries;
}

function generateSteps() {
  const entries = [];
  for (let i = 29; i >= 0; i--) {
    entries.push({
      date: format(subDays(new Date(), i), 'yyyy-MM-dd'),
      count: randomBetween(3000, 14000),
      source: 'pedometer',
    });
  }
  return { entries, source: 'pedometer', message: '' };
}

export async function loadDemoData() {
  const { sessions, prs } = generateSessions();
  const habits = generateHabits();
  const weights = generateWeights();
  const notes = generateNotes();
  const nutrition = generateNutrition();
  const measurements = generateMeasurements();
  const steps = generateSteps();

  mmkvStorage.set('gym', JSON.stringify({
    splits: [demoSplit],
    sessions,
    prs,
    customExercises: [],
    lastSetsCache: {},
  }));
  mmkvStorage.set('habits', JSON.stringify(habits));
  mmkvStorage.set('weight', JSON.stringify(weights));
  mmkvStorage.set('notes', JSON.stringify(notes));
  mmkvStorage.set('nutrition', JSON.stringify({
    goal: nutrition.goal,
    foods: nutrition.foods,
    entries: nutrition.entries,
    waterEntries: nutrition.waterEntries,
    recipes: nutrition.recipes,
  }));
  mmkvStorage.set('measurements', JSON.stringify(measurements));
  mmkvStorage.set('steps', JSON.stringify(steps));
}
