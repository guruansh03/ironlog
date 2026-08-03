// ─── Predefined Exercise & Muscle Data ────────────────────────────────────────

export const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps',
  'Quads', 'Hamstrings', 'Glutes', 'Calves', 'Core', 'Abs', 'Forearms', 'Traps', 'Other',
] as const;

export type MuscleGroup = typeof MUSCLE_GROUPS[number];

export interface ExerciseOption {
  name: string;
  muscleGroup: MuscleGroup;
}

export const EXERCISE_LIBRARY: ExerciseOption[] = [
  // Chest
  { name: 'Bench Press', muscleGroup: 'Chest' },
  { name: 'Incline Bench Press', muscleGroup: 'Chest' },
  { name: 'Decline Bench Press', muscleGroup: 'Chest' },
  { name: 'Dumbbell Fly', muscleGroup: 'Chest' },
  { name: 'Cable Fly', muscleGroup: 'Chest' },
  { name: 'Machine Fly', muscleGroup: 'Chest' },
  { name: 'Incline Machine Press', muscleGroup: 'Chest' },
  { name: 'Chest Press Machine', muscleGroup: 'Chest' },
  { name: 'Single Arm Cable Fly', muscleGroup: 'Chest' },
  { name: 'Single Arm Dumbbell Press', muscleGroup: 'Chest' },
  { name: 'Push-up', muscleGroup: 'Chest' },
  { name: 'Chest Dip', muscleGroup: 'Chest' },
  { name: 'Pec Deck', muscleGroup: 'Chest' },

  // Back
  { name: 'Deadlift', muscleGroup: 'Back' },
  { name: 'Barbell Row', muscleGroup: 'Back' },
  { name: 'T-Bar Row', muscleGroup: 'Back' },
  { name: 'Lat Pulldown', muscleGroup: 'Back' },
  { name: 'Pull-up', muscleGroup: 'Back' },
  { name: 'Chin-up', muscleGroup: 'Back' },
  { name: 'Cable Row', muscleGroup: 'Back' },
  { name: 'Seated Cable Row', muscleGroup: 'Back' },
  { name: 'Chest Supported Row Machine', muscleGroup: 'Back' },
  { name: 'Single Arm Lat Pulldown', muscleGroup: 'Back' },
  { name: 'Single Arm Cable Row', muscleGroup: 'Back' },
  { name: 'Dumbbell Row', muscleGroup: 'Back' },
  { name: 'Single Arm Dumbbell Row', muscleGroup: 'Back' },
  { name: 'Face Pull', muscleGroup: 'Back' },

  // Shoulders
  { name: 'Overhead Press', muscleGroup: 'Shoulders' },
  { name: 'Dumbbell Shoulder Press', muscleGroup: 'Shoulders' },
  { name: 'Machine Shoulder Press', muscleGroup: 'Shoulders' },
  { name: 'Lateral Raise', muscleGroup: 'Shoulders' },
  { name: 'Machine Lateral Raise', muscleGroup: 'Shoulders' },
  { name: 'Single Arm Lateral Raise', muscleGroup: 'Shoulders' },
  { name: 'Front Raise', muscleGroup: 'Shoulders' },
  { name: 'Single Arm Front Raise', muscleGroup: 'Shoulders' },
  { name: 'Rear Delt Fly', muscleGroup: 'Shoulders' },
  { name: 'Reverse Pec Deck', muscleGroup: 'Shoulders' },
  { name: 'Arnold Press', muscleGroup: 'Shoulders' },
  { name: 'Upright Row', muscleGroup: 'Shoulders' },

  // Biceps
  { name: 'Barbell Curl', muscleGroup: 'Biceps' },
  { name: 'Dumbbell Curl', muscleGroup: 'Biceps' },
  { name: 'Hammer Curl', muscleGroup: 'Biceps' },
  { name: 'Preacher Curl', muscleGroup: 'Biceps' },
  { name: 'Single Arm Preacher Curl', muscleGroup: 'Biceps' },
  { name: 'Cable Curl', muscleGroup: 'Biceps' },
  { name: 'Single Arm Cable Curl', muscleGroup: 'Biceps' },
  { name: 'Concentration Curl', muscleGroup: 'Biceps' },
  { name: 'Incline Curl', muscleGroup: 'Biceps' },

  // Triceps
  { name: 'Tricep Pushdown', muscleGroup: 'Triceps' },
  { name: 'Skull Crusher', muscleGroup: 'Triceps' },
  { name: 'Close Grip Bench', muscleGroup: 'Triceps' },
  { name: 'Overhead Tricep Extension', muscleGroup: 'Triceps' },
  { name: 'Single Arm Overhead Tricep Extension', muscleGroup: 'Triceps' },
  { name: 'Single Arm Tricep Pushdown', muscleGroup: 'Triceps' },
  { name: 'Cable Tricep Extension', muscleGroup: 'Triceps' },
  { name: 'Tricep Dip', muscleGroup: 'Triceps' },
  { name: 'Tricep Kickback', muscleGroup: 'Triceps' },

  // Quads
  { name: 'Squat', muscleGroup: 'Quads' },
  { name: 'Front Squat', muscleGroup: 'Quads' },
  { name: 'Leg Press', muscleGroup: 'Quads' },
  { name: 'Smith Machine Squat', muscleGroup: 'Quads' },
  { name: 'Hack Squat Machine', muscleGroup: 'Quads' },
  { name: 'Leg Extension', muscleGroup: 'Quads' },
  { name: 'Single Leg Extension', muscleGroup: 'Quads' },
  { name: 'Hack Squat', muscleGroup: 'Quads' },
  { name: 'Bulgarian Split Squat', muscleGroup: 'Quads' },
  { name: 'Lunge', muscleGroup: 'Quads' },

  // Hamstrings
  { name: 'Romanian Deadlift', muscleGroup: 'Hamstrings' },
  { name: 'Leg Curl', muscleGroup: 'Hamstrings' },
  { name: 'Seated Leg Curl', muscleGroup: 'Hamstrings' },
  { name: 'Lying Leg Curl', muscleGroup: 'Hamstrings' },
  { name: 'Single Leg Curl', muscleGroup: 'Hamstrings' },
  { name: 'Stiff Leg Deadlift', muscleGroup: 'Hamstrings' },
  { name: 'Good Morning', muscleGroup: 'Hamstrings' },
  { name: 'Nordic Curl', muscleGroup: 'Hamstrings' },

  // Glutes
  { name: 'Hip Thrust', muscleGroup: 'Glutes' },
  { name: 'Smith Machine Hip Thrust', muscleGroup: 'Glutes' },
  { name: 'Glute Bridge', muscleGroup: 'Glutes' },
  { name: 'Cable Kickback', muscleGroup: 'Glutes' },
  { name: 'Single Leg Glute Bridge', muscleGroup: 'Glutes' },

  // Calves
  { name: 'Calf Raise', muscleGroup: 'Calves' },
  { name: 'Seated Calf Raise', muscleGroup: 'Calves' },
  { name: 'Single Leg Calf Raise', muscleGroup: 'Calves' },
  { name: 'Calf Press on Leg Press', muscleGroup: 'Calves' },

  // Core
  { name: 'Plank', muscleGroup: 'Core' },
  { name: 'Hanging Leg Raise', muscleGroup: 'Core' },
  { name: 'Cable Crunch', muscleGroup: 'Core' },
  { name: 'Ab Wheel', muscleGroup: 'Core' },
  { name: 'Russian Twist', muscleGroup: 'Core' },

  // Abs (legacy naming support)
  { name: 'Leg Raise', muscleGroup: 'Abs' },
  { name: 'Bench Crunch', muscleGroup: 'Abs' },
  { name: 'Machine Crunch', muscleGroup: 'Abs' },
  { name: 'Cable Reverse Crunch', muscleGroup: 'Abs' },

  // Forearms
  { name: 'Wrist Curl', muscleGroup: 'Forearms' },
  { name: 'Reverse Wrist Curl', muscleGroup: 'Forearms' },
  { name: 'Farmer Walk', muscleGroup: 'Forearms' },

  // Traps
  { name: 'Shrug', muscleGroup: 'Traps' },
  { name: 'Barbell Shrug', muscleGroup: 'Traps' },
];

export function getExercisesByMuscle(muscle: MuscleGroup): ExerciseOption[] {
  return EXERCISE_LIBRARY.filter((e) => e.muscleGroup === muscle);
}
