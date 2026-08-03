import { format, subDays } from 'date-fns';
import type { WorkoutSession } from '../store/gymStore';
import type { Habit } from '../store/habitStore';
import type { NutritionGoal, NutritionMealEntry } from '../store/nutritionStore';
import type { WeightEntry } from '../store/weightStore';
import { isCompletedOn } from '../store/habitStore';

function lastNDates(days: number) {
  return Array.from({ length: days }, (_, index) =>
    format(subDays(new Date(), days - index - 1), 'yyyy-MM-dd')
  );
}

export interface WeeklyAdherenceSummary {
  workoutsCompleted: number;
  workoutGoal: number;
  habitCompletionRate: number;
  calorieGoalHitDays: number;
  proteinGoalHitDays: number;
  trackedNutritionDays: number;
  weightDelta: number | null;
  headline: string;
  insight: string;
}

export function getWeeklyAdherenceSummary(args: {
  sessions: WorkoutSession[];
  habits: Habit[];
  entries: NutritionMealEntry[];
  goal: NutritionGoal;
  weightEntries: WeightEntry[];
}): WeeklyAdherenceSummary {
  const { sessions, habits, entries, goal, weightEntries } = args;
  const days = lastNDates(7);
  const workoutGoal = Math.max(3, Math.ceil(days.length / 2));

  const workoutsCompleted = sessions.filter((session) =>
    days.some((day) => session.startedAt.startsWith(day))
  ).length;

  const activeHabits = habits.filter((habit) => habit.type === 'yesno' || habit.type === 'numeric');
  const possibleHabitChecks = activeHabits.length * days.length;
  const completedHabitChecks = days.reduce((sum, day) => {
    return sum + activeHabits.filter((habit) => isCompletedOn(habit, day)).length;
  }, 0);
  const habitCompletionRate = possibleHabitChecks > 0
    ? Math.round((completedHabitChecks / possibleHabitChecks) * 100)
    : 0;

  const nutritionByDate = new Map<string, { calories: number; protein: number }>();
  entries.forEach((entry) => {
    if (!days.includes(entry.date)) return;
    const current = nutritionByDate.get(entry.date) ?? { calories: 0, protein: 0 };
    current.calories += entry.calories;
    current.protein += entry.protein;
    nutritionByDate.set(entry.date, current);
  });

  const trackedNutritionDays = nutritionByDate.size;
  const calorieGoalHitDays = [...nutritionByDate.values()].filter(({ calories }) =>
    goal.calories > 0 && Math.abs(calories - goal.calories) <= goal.calories * 0.1
  ).length;
  const proteinGoalHitDays = [...nutritionByDate.values()].filter(({ protein }) =>
    goal.protein > 0 && protein >= goal.protein
  ).length;

  const weeklyWeights = weightEntries.filter((entry) => days.includes(entry.date));
  const firstWeight = weeklyWeights[0]?.value;
  const lastWeight = weeklyWeights[weeklyWeights.length - 1]?.value;
  const weightDelta = typeof firstWeight === 'number' && typeof lastWeight === 'number'
    ? Number((lastWeight - firstWeight).toFixed(1))
    : null;

  const adherenceSignals = [
    workoutsCompleted >= workoutGoal ? 1 : 0,
    habitCompletionRate >= 70 ? 1 : 0,
    calorieGoalHitDays >= 4 ? 1 : 0,
    proteinGoalHitDays >= 4 ? 1 : 0,
  ];
  const score = adherenceSignals.reduce((sum, signal) => sum + signal, 0);

  const headline = score >= 3
    ? 'Strong week'
    : score === 2
      ? 'Steady progress'
      : 'Reset and rebuild';

  let insight = `${workoutsCompleted}/${workoutGoal} workouts and ${habitCompletionRate}% habit consistency.`;
  if (trackedNutritionDays === 0) {
    insight += ' Nutrition tracking was quiet this week.';
  } else {
    insight += ` Calories were on target ${calorieGoalHitDays}/${trackedNutritionDays} tracked days.`;
  }
  if (weightDelta !== null) {
    insight += ` Weight ${weightDelta > 0 ? '+' : ''}${weightDelta} this week.`;
  }

  return {
    workoutsCompleted,
    workoutGoal,
    habitCompletionRate,
    calorieGoalHitDays,
    proteinGoalHitDays,
    trackedNutritionDays,
    weightDelta,
    headline,
    insight,
  };
}
