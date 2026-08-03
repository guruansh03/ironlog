import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { useHabitStore } from '../store/habitStore';
import { useGymStore } from '../store/gymStore';
import { useNotesStore } from '../store/notesStore';
import { useWeightStore } from '../store/weightStore';
import { useStepsStore } from '../store/stepsStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useMeasurementsStore } from '../store/measurementsStore';
import { mmkvStorage } from '../store/mmkv';
import TabNavigator from './TabNavigator';
import HabitStatsScreen from '../screens/HabitStatsScreen';
import NoteEditorScreen from '../screens/NoteEditorScreen';
import WeeklyReviewScreen from '../screens/WeeklyReviewScreen';
import WeightLogScreen from '../screens/WeightLogScreen';
import AddHabitScreen from '../screens/AddHabitScreen';
// Phase 4
import MuscleHeatmapScreen from '../screens/gym/MuscleHeatmapScreen';
import StrengthStandardsScreen from '../screens/gym/StrengthStandardsScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import SpotifyScreen from '../screens/SpotifyScreen';
import WorkoutScreen from '../screens/gym/WorkoutScreen';
import CreateSplitScreen from '../screens/gym/CreateSplitScreen';
import WorkoutSummaryScreen from '../screens/gym/WorkoutSummaryScreen';
import WorkoutHistoryScreen from '../screens/gym/WorkoutHistoryScreen';
import GymStatsScreen from '../screens/gym/GymStatsScreen';
import LifetimeStatsScreen from '../screens/LifetimeStatsScreen';
import MeasurementsScreen from '../screens/MeasurementsScreen';
import MealCameraScreen from '../screens/nutrition/MealCameraScreen';
import { runMigrations } from '../utils/migration';

export type RootStackParams = {
  MainTabs: undefined;
  ActiveWorkoutScreen: { splitId: string; dayId: string };
  WorkoutPlannerScreen: { mode?: 'planner' | 'custom' } | undefined;
  WorkoutSummaryScreen: { sessionId: string };
  HistoryScreen: undefined;
  HabitDetailScreen: undefined;
  AddHabitScreen: undefined;
  NoteEditorScreen: { noteId?: string } | undefined;
  WeeklyReviewScreen: undefined;
  WeightLogScreen: undefined;
  GymStatsScreen: undefined;
  LifetimeStatsScreen: undefined;
  MeasurementsScreen: undefined;
  SpotifyScreen: undefined;
  // Phase 4
  MuscleHeatmapScreen: undefined;
  StrengthStandardsScreen: undefined;
  OnboardingScreen: undefined;
  // New Features
  MealCameraScreen: undefined;
};

const Stack = createStackNavigator<RootStackParams>();


const STEPS_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

function OnboardingWrapper({ navigation }: any) {
  return <OnboardingScreen onComplete={() => navigation.replace('MainTabs')} />;
}

export default function RootNavigator() {
  const { load: loadHabits } = useHabitStore();
  const { load: loadGym } = useGymStore();
  const { load: loadNotes } = useNotesStore();
  const { load: loadWeight } = useWeightStore();
  const { load: loadNutrition } = useNutritionStore();
  const { load: loadMeasurements } = useMeasurementsStore();
  const { load: loadSteps, syncLast30Days } = useStepsStore();

  useEffect(() => {
    // Deferred — schedule after first frame to avoid blocking the JS thread on boot
    // Load all stores asynchronously so splash screen can hide immediately
    requestAnimationFrame(() => {
      runMigrations();
      loadHabits();
      loadGym();
      loadWeight();
      loadNutrition();
      loadNotes();
      loadMeasurements();
      loadSteps();

      // Only sync steps data if last sync was >6 hours ago (prevents battery drain on every launch)
      const lastSyncRaw = mmkvStorage.getString('steps_last_sync');
      const lastSync = lastSyncRaw ? Number(lastSyncRaw) : 0;
      const isStale = Date.now() - lastSync > STEPS_SYNC_INTERVAL_MS;
      if (isStale) {
        syncLast30Days(lastSync === 0)
          .then(() => {
            mmkvStorage.set('steps_last_sync', String(Date.now()));
          })
          .catch(() => undefined);
      }
    });
  }, []);


  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
      }}
      initialRouteName="MainTabs"
    >
      <Stack.Screen name="OnboardingScreen" component={OnboardingWrapper} />
      <Stack.Screen name="MainTabs" component={TabNavigator} />
      <Stack.Screen name="ActiveWorkoutScreen" component={WorkoutScreen} />
      <Stack.Screen name="WorkoutPlannerScreen" component={CreateSplitScreen} />
      <Stack.Screen name="WorkoutSummaryScreen" component={WorkoutSummaryScreen} />
      <Stack.Screen name="HistoryScreen" component={WorkoutHistoryScreen} />
      <Stack.Screen name="HabitDetailScreen" component={HabitStatsScreen} />
      <Stack.Screen
        name="AddHabitScreen"
        component={AddHabitScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="NoteEditorScreen" component={NoteEditorScreen} />
      <Stack.Screen name="WeeklyReviewScreen" component={WeeklyReviewScreen} />
      <Stack.Screen
        name="WeightLogScreen"
        component={WeightLogScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen name="GymStatsScreen" component={GymStatsScreen} />
      <Stack.Screen name="LifetimeStatsScreen" component={LifetimeStatsScreen} />
      <Stack.Screen name="MeasurementsScreen" component={MeasurementsScreen} />
      <Stack.Screen name="SpotifyScreen" component={SpotifyScreen} />
      {/* Phase 4 */}
      <Stack.Screen name="MuscleHeatmapScreen" component={MuscleHeatmapScreen} />
      <Stack.Screen name="StrengthStandardsScreen" component={StrengthStandardsScreen} />
      {/* New Features */}
      <Stack.Screen name="MealCameraScreen" component={MealCameraScreen} options={{ presentation: 'modal' }} />
    </Stack.Navigator>
  );
}


