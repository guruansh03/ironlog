import { mmkvStorage } from './mmkv';

const ONBOARDING_KEY = 'onboarding_complete';
const GOAL_KEY = 'user_fitness_goal';

export type FitnessGoal = 'build_muscle' | 'lose_fat' | 'stay_healthy';

export interface OnboardingState {
  isComplete: boolean;
  fitnessGoal: FitnessGoal | null;
}

export function isOnboardingComplete(): boolean {
  return mmkvStorage.getString(ONBOARDING_KEY) === 'true';
}

export function setOnboardingComplete(): void {
  mmkvStorage.set(ONBOARDING_KEY, 'true');
}

export function getFitnessGoal(): FitnessGoal | null {
  const val = mmkvStorage.getString(GOAL_KEY);
  if (val === 'build_muscle' || val === 'lose_fat' || val === 'stay_healthy') return val;
  return null;
}

export function setFitnessGoal(goal: FitnessGoal): void {
  mmkvStorage.set(GOAL_KEY, goal);
}

export function getCalorieTargetForGoal(goal: FitnessGoal): number {
  switch (goal) {
    case 'build_muscle': return 2800;
    case 'lose_fat': return 1800;
    case 'stay_healthy': return 2200;
  }
}

export function getProteinTargetForGoal(goal: FitnessGoal): number {
  switch (goal) {
    case 'build_muscle': return 180;
    case 'lose_fat': return 160;
    case 'stay_healthy': return 130;
  }
}

export const STARTER_HABITS = [
  { name: 'Drink Water', icon: '💧', type: 'numeric' as const, target: 8, unit: 'glasses', category: 'Health' },
  { name: 'Workout', icon: '🏋️', type: 'yesno' as const, category: 'Fitness' },
  { name: 'Read', icon: '📚', type: 'yesno' as const, category: 'Learning' },
  { name: 'Meditate', icon: '🧘', type: 'yesno' as const, category: 'Mindfulness' },
  { name: 'Sleep 8 Hours', icon: '😴', type: 'yesno' as const, category: 'Health' },
  { name: 'Eat Clean', icon: '🥗', type: 'yesno' as const, category: 'Nutrition' },
  { name: 'Walk 10K Steps', icon: '🚶', type: 'numeric' as const, target: 10000, unit: 'steps', category: 'Fitness' },
  { name: 'Journal', icon: '📝', type: 'yesno' as const, category: 'Mindfulness' },
];
