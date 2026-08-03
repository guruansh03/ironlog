import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { MotiView } from 'moti';
import { Ionicons } from '@expo/vector-icons';
import { generateId as uuid } from '../../utils/generateId';

import { FONT, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { F } from '../../theme/fonts';
import { useGymStore, Split, SplitDay } from '../../store/gymStore';
import { RootStackParams } from '../../navigation/RootNavigator';
import DropdownPicker from '../../components/ui/DropdownPicker';
import { MUSCLE_GROUPS, EXERCISE_LIBRARY } from '../../utils/exerciseData';
import AnimatedPressable from '../../components/animations/AnimatedPressable';

type RouteT = RouteProp<RootStackParams, 'WorkoutPlannerScreen'>;

export default function CreateSplitScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const { colors: c, neu } = useTheme();
  const { addSplit } = useGymStore();
  const plannerMode = route.params?.mode === 'planner';

  const [splitName, setSplitName] = useState('');
  const [days, setDays] = useState<SplitDay[]>([
    { id: uuid(), name: '', exercises: [] },
  ]);

  const allExerciseNames = useMemo(
    () => EXERCISE_LIBRARY.map((e) => e.name),
    []
  );

  const exerciseNamesByMuscle = useMemo(
    () =>
      EXERCISE_LIBRARY.reduce<Record<string, string[]>>((acc, exercise) => {
        if (!acc[exercise.muscleGroup]) {
          acc[exercise.muscleGroup] = [];
        }
        acc[exercise.muscleGroup].push(exercise.name);
        return acc;
      }, {}),
    []
  );

  function applyCustomFourDaySplit() {
    setSplitName('My Custom 4-Day Split');
    setDays([
      {
        id: uuid(),
        name: 'Chest + Shoulders + Forearms',
        exercises: [
          { id: uuid(), name: 'Machine Fly', muscleGroup: 'Chest' },
          { id: uuid(), name: 'Incline Bench Press', muscleGroup: 'Chest' },
          { id: uuid(), name: 'Machine Shoulder Press', muscleGroup: 'Shoulders' },
          { id: uuid(), name: 'Lateral Raises', muscleGroup: 'Shoulders' },
          { id: uuid(), name: 'Reverse Cable Curls', muscleGroup: 'Forearms' },
        ],
      },
      {
        id: uuid(),
        name: 'Back',
        exercises: [
          { id: uuid(), name: 'Pull-Ups', muscleGroup: 'Back' },
          { id: uuid(), name: 'Lat Pulldowns', muscleGroup: 'Back' },
          { id: uuid(), name: 'Seated Cable Rows', muscleGroup: 'Back' },
          { id: uuid(), name: 'T-Bar Rows', muscleGroup: 'Back' },
          { id: uuid(), name: 'Shrugs', muscleGroup: 'Traps' },
          { id: uuid(), name: 'Rear Delt Fly', muscleGroup: 'Shoulders' },
        ],
      },
      {
        id: uuid(),
        name: 'Arms',
        exercises: [
          { id: uuid(), name: 'Tricep Pushdowns', muscleGroup: 'Triceps' },
          { id: uuid(), name: 'Skull Crushers', muscleGroup: 'Triceps' },
          { id: uuid(), name: 'Single Arm Tricep Cable', muscleGroup: 'Triceps' },
          { id: uuid(), name: 'Single Arm Preacher Curl', muscleGroup: 'Biceps' },
          { id: uuid(), name: 'Hammer Curls', muscleGroup: 'Biceps' },
          { id: uuid(), name: 'Reverse Cable Curls', muscleGroup: 'Forearms' },
        ],
      },
      {
        id: uuid(),
        name: 'Legs + Abs',
        exercises: [
          { id: uuid(), name: 'Smith Machine Squats', muscleGroup: 'Quads' },
          { id: uuid(), name: 'Hamstring Curls', muscleGroup: 'Hamstrings' },
          { id: uuid(), name: 'Calf Raises', muscleGroup: 'Calves' },
          { id: uuid(), name: 'Cable Extensions', muscleGroup: 'Quads' },
          { id: uuid(), name: 'Leg Raises', muscleGroup: 'Abs' },
          { id: uuid(), name: 'Bench Crunches', muscleGroup: 'Abs' },
        ],
      },
    ]);
  }

  function addDay() {
    setDays((d) => [...d, { id: uuid(), name: '', exercises: [] }]);
  }

  function removeDay(dayId: string) {
    setDays((d) => d.filter((day) => day.id !== dayId));
  }

  function updateDayName(dayId: string, name: string) {
    setDays((d) => d.map((day) => day.id === dayId ? { ...day, name } : day));
  }

  function addExercise(dayId: string) {
    setDays((d) =>
      d.map((day) =>
        day.id === dayId
          ? { ...day, exercises: [...day.exercises, { id: uuid(), name: '', muscleGroup: '' }] }
          : day
      )
    );
  }

  function updateExercise(dayId: string, exId: string, field: 'name' | 'muscleGroup', value: string) {
    setDays((d) =>
      d.map((day) =>
        day.id === dayId
          ? {
              ...day,
              exercises: day.exercises.map((ex) => {
                if (ex.id !== exId) return ex;
                const updated = { ...ex, [field]: value };
                // Auto-fill muscle group when selecting exercise
                if (field === 'name') {
                  const found = EXERCISE_LIBRARY.find((e) => e.name === value);
                  if (found) {
                    updated.muscleGroup = found.muscleGroup;
                  }
                }
                if (field === 'muscleGroup' && updated.name) {
                  const stillValidForMuscle = EXERCISE_LIBRARY.some(
                    (e) => e.name === updated.name && e.muscleGroup === value
                  );
                  if (!stillValidForMuscle) {
                    updated.name = '';
                  }
                }
                return updated;
              }),
            }
          : day
      )
    );
  }

  function removeExercise(dayId: string, exId: string) {
    setDays((d) =>
      d.map((day) =>
        day.id === dayId
          ? { ...day, exercises: day.exercises.filter((ex) => ex.id !== exId) }
          : day
      )
    );
  }

  async function handleSave() {
    if (!splitName.trim()) {
      Alert.alert('Name required', 'Give your split a name.');
      return;
    }
    const validDays = days.filter((d) => d.name.trim());
    if (validDays.length === 0) {
      Alert.alert('Days required', 'Add at least one named day.');
      return;
    }
    const split: Split = {
      id: uuid(),
      name: splitName.trim(),
      isCustom: true,
      days: validDays.map((d) => ({
        ...d,
        exercises: d.exercises.filter((e) => e.name.trim()),
      })),
    };
    await addSplit(split);
    navigation.goBack();
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: c.bg }]}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>
          {plannerMode ? 'Workout Planner' : 'Create Custom Split'}
        </Text>
        <AnimatedPressable
          style={[styles.saveBtn, { backgroundColor: c.text }]}
          onPress={handleSave}
        >
          <Text style={[styles.saveBtnText, { color: c.bg }]}>Save</Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {/* Split name */}
        <TextInput
          style={[styles.splitInput, neu.insetShadow, { backgroundColor: c.cardAlt, color: c.text }]}
          value={splitName}
          onChangeText={setSplitName}
          placeholder={plannerMode ? 'Plan name (e.g. Lean Bulk Phase)' : 'Split name (e.g. PPL, Upper/Lower)'}
          placeholderTextColor={c.textMuted}
        />

        <AnimatedPressable
          style={[styles.templateBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={applyCustomFourDaySplit}
        >
          <Ionicons name="sparkles-outline" size={16} color={c.text} />
          <Text style={[styles.templateText, { color: c.text }]}>
            {plannerMode ? 'Use Recommended 4-Day Plan' : 'Use My Custom 4-Day Split'}
          </Text>
        </AnimatedPressable>

        {/* Days */}
        {days.map((day, di) => (
          <MotiView
            key={day.id}
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ delay: di * 40 }}
            style={[styles.dayCard, neu.darkShadow, { backgroundColor: c.card }]}
          >
            {/* Day name row */}
            <View style={styles.dayNameRow}>
              <View style={[styles.dayNum, neu.darkShadowSm, { backgroundColor: c.card }]}>
                <Text style={[styles.dayNumText, { color: c.text }]}>{di + 1}</Text>
              </View>
              <TextInput
                style={[styles.dayNameInput, neu.insetShadow, { backgroundColor: c.cardAlt, color: c.text }]}
                value={day.name}
                onChangeText={(v) => updateDayName(day.id, v)}
                placeholder="Day name (e.g. Push)"
                placeholderTextColor={c.textMuted}
              />
              {days.length > 1 && (
                <AnimatedPressable onPress={() => removeDay(day.id)}>
                  <Ionicons name="close-circle" size={20} color={c.danger} />
                </AnimatedPressable>
              )}
            </View>

            {/* Exercises */}
            {day.exercises.map((ex) => (
              <View key={ex.id} style={[styles.exRow, { borderTopColor: c.cardAlt }]}>
                <View style={styles.exDropdowns}>
                  <View style={{ flex: 2 }}>
                    <DropdownPicker
                      label="Exercise"
                      value={ex.name}
                      options={
                        ex.muscleGroup
                          ? (exerciseNamesByMuscle[ex.muscleGroup] ?? allExerciseNames)
                          : allExerciseNames
                      }
                      onSelect={(v) => updateExercise(day.id, ex.id, 'name', v)}
                      placeholder="Exercise"
                      searchable
                      icon="barbell-outline"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <DropdownPicker
                      label="Muscle Group"
                      value={ex.muscleGroup}
                      options={[...MUSCLE_GROUPS]}
                      onSelect={(v) => updateExercise(day.id, ex.id, 'muscleGroup', v)}
                      placeholder="Muscle"
                      icon="body-outline"
                    />
                  </View>
                </View>
                <AnimatedPressable onPress={() => removeExercise(day.id, ex.id)} style={styles.removeExBtn}>
                  <Ionicons name="remove-circle" size={20} color={c.danger} />
                </AnimatedPressable>
              </View>
            ))}

            {/* Add exercise */}
            <AnimatedPressable
              style={[styles.addExBtn, { borderTopColor: c.cardAlt }]}
              onPress={() => addExercise(day.id)}
            >
              <Ionicons name="add-circle-outline" size={16} color={c.text} />
              <Text style={[styles.addExText, { color: c.text }]}>Add Exercise</Text>
            </AnimatedPressable>
          </MotiView>
        ))}

        {/* Add day */}
        <AnimatedPressable
          style={[styles.addDayBtn, neu.darkShadowSm, { backgroundColor: c.card }]}
          onPress={addDay}
        >
          <Ionicons name="add-circle-outline" size={20} color={c.text} />
          <Text style={[styles.addDayText, { color: c.text }]}>Add Day</Text>
        </AnimatedPressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontSize: 17, fontFamily: F.bold },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20 },
  saveBtnText: { fontFamily: F.bold, fontSize: 14 },
  scroll: { padding: 16, gap: 14 },
  splitInput: {
    borderRadius: RADIUS.md,
    padding: 14,
    fontSize: 16,
    fontFamily: F.semibold,
  },
  dayCard: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  templateBtn: {
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  templateText: {
    fontSize: 13,
    fontFamily: F.bold,
  },
  dayNameRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  dayNum: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  dayNumText: { fontSize: 13, fontFamily: F.bold },
  dayNameInput: {
    flex: 1, borderRadius: 10, padding: 8,
    fontSize: 14, fontFamily: F.semibold,
  },
  exRow: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 8,
  },
  exDropdowns: {
    flexDirection: 'row',
    gap: 8,
  },
  removeExBtn: {
    alignSelf: 'flex-end',
    padding: 2,
  },
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 10,
    borderTopWidth: 1,
  },
  addExText: { fontSize: 13, fontFamily: F.semibold },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 16,
    borderRadius: RADIUS.lg,
  },
  addDayText: { fontSize: FONT.base, fontFamily: F.bold },
});

