import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { generateId as uuid } from '../../utils/generateId';

import { useTheme } from '../../theme/useTheme';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';
import { useGymStore, WorkoutExercise, ExerciseSet } from '../../store/gymStore';
import { RootStackParams } from '../../navigation/RootNavigator';
import { useWorkoutTimer } from '../../hooks/useWorkoutTimer';
import ScrollPicker from '../../components/ui/ScrollPicker';
import DropdownPicker from '../../components/ui/DropdownPicker';
import { MUSCLE_GROUPS, EXERCISE_LIBRARY } from '../../utils/exerciseData';
import AnimatedPressable from '../../components/animations/AnimatedPressable';
import { CARD_PADDING, CARD_RADIUS, PAGE_PADDING_H } from '../../theme/spacing';
import { mmkvStorage } from '../../store/mmkv';

type RouteT = RouteProp<RootStackParams, 'ActiveWorkoutScreen'>;
type NavT = StackNavigationProp<RootStackParams, 'ActiveWorkoutScreen'>;

const WEIGHTS = Array.from({ length: 121 }, (_, i) => i * 2.5);
const PLATES = Array.from({ length: 61 }, (_, i) => Number((i * 0.5).toFixed(1)));
const REPS = Array.from({ length: 50 }, (_, i) => i + 1);
const RPE_VALUES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const ROW_HEIGHT = 46;

function nearestValue(values: number[], target: number) {
  if (!values.length) return target;
  return values.reduce((prev, curr) =>
    Math.abs(curr - target) < Math.abs(prev - target) ? curr : prev, values[0]);
}

// ─── Progressive Overload Delta ───────────────────────
function OverloadDelta({ exerciseName, currentWeight }: { exerciseName: string; currentWeight: number }) {
  const { lastSetsCache } = useGymStore();
  const lastSets = lastSetsCache[exerciseName];
  if (!lastSets?.length || currentWeight <= 0) return null;
  const lastTopWeight = Math.max(...lastSets.map(s => s.weight));
  if (lastTopWeight <= 0) return null;
  const delta = currentWeight - lastTopWeight;
  if (delta === 0) return null;
  return (
    <Text style={{ fontSize: 9, fontFamily: F.bold, color: delta > 0 ? '#22c55e' : '#ef4444', marginLeft: 2 }}>
      {delta > 0 ? '↑' : '↓'}{Math.abs(delta)}
    </Text>
  );
}

// ─── Swipeable Set Row ────────────────────────────────
function SwipeableSetRow({ set, index, onToggle, onOpenPicker, onRemove, onRpe, colors: c, exerciseName }: any) {
  const translateX = useSharedValue(0);
  const deleteWidth = 64;
  const completeWidth = 64;

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .onUpdate(e => {
      // Right swipe = complete, left swipe = delete
      if (e.translationX > 0) {
        translateX.value = Math.min(completeWidth + 20, e.translationX);
      } else {
        translateX.value = Math.max(-deleteWidth - 20, e.translationX);
      }
    })
    .onEnd(e => {
      if (e.translationX > completeWidth * 0.6) {
        // Swipe right → toggle complete
        translateX.value = withTiming(0, { duration: 200 });
        runOnJS(onToggle)();
      } else if (e.translationX < -deleteWidth * 0.6) {
        translateX.value = withTiming(-deleteWidth, { duration: 150 }, () => {
          runOnJS(onRemove)();
        });
      } else {
        translateX.value = withSpring(0, { damping: 20 });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const loadMode = set.loadMode ?? 'weight';

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* Complete reveal (right swipe) */}
      <View style={[styles.swipeCompleteBg, { backgroundColor: '#22c55e' }]}>
        <Ionicons name="checkmark-circle" size={16} color="#fff" />
      </View>
      {/* Delete reveal (left swipe) */}
      <View style={[styles.swipeDeleteBg, { backgroundColor: '#ef4444' }]}>
        <Ionicons name="trash" size={16} color="#fff" />
      </View>

      <GestureDetector gesture={pan}>
        <Animated.View style={[
          styles.setRowLive,
          { borderTopColor: c.cardAlt },
          set.completed && { backgroundColor: c.cardAlt },
          rowStyle,
        ]}>
          <View style={[styles.setNumBadge, { backgroundColor: set.completed ? c.text : c.cardAlt }]}>
            <Text style={{ fontSize: 11, fontFamily: F.bold, color: set.completed ? c.bg : c.textMuted }}>
              {index + 1}
            </Text>
          </View>

          <TouchableOpacity style={styles.setInput} onPress={onOpenPicker} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[styles.setInputText, { color: set.weight > 0 ? c.text : c.textLabel }]}>
                {set.weight > 0 ? `${set.weight}${loadMode === 'plates' ? ' pl' : ' kg'}` : '—'}
              </Text>
              {exerciseName && <OverloadDelta exerciseName={exerciseName} currentWeight={set.weight} />}
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.setInput} onPress={onOpenPicker} activeOpacity={0.7}>
            <Text style={[styles.setInputText, { color: set.reps > 0 ? c.text : c.textLabel }]}>
              {set.reps > 0 ? `${set.reps}` : '—'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.rpeBadge]} onPress={onRpe} activeOpacity={0.7}>
            <Text style={[styles.rpeBadgeText, { color: set.rpe ? c.text : c.textLabel }]}>
              {set.rpe ?? '—'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onToggle}
            style={[styles.setCheckBtn, { backgroundColor: set.completed ? c.text : c.card, borderColor: set.completed ? c.text : c.border }]}
          >
            <Ionicons name="checkmark" size={12} color={set.completed ? c.bg : c.textLabel} />
          </TouchableOpacity>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

// ─── Drag Handle + Exercise Card ─────────────────────
function DraggableExerciseCard({
  ex, index, totalCount, isCollapsed, onCollapse, onNotePress,
  onAddSet, onToggleSet, onOpenPicker, onRemoveSet, onRpePress,
  onMoveUp, onMoveDown, colors: c,
}: any) {
  const completedCount = ex.sets.filter((s: ExerciseSet) => s.completed).length;
  const allDone = completedCount === ex.sets.length && ex.sets.length > 0;

  return (
    <View style={[styles.exCard, { backgroundColor: c.card, borderColor: allDone ? c.text : c.border }]}>
        {/* Exercise header */}
        <View style={styles.exHeader}>
          {/* Drag arrows (up/down) */}
          <View style={styles.dragHandle}>
            <TouchableOpacity
              onPress={onMoveUp}
              disabled={index === 0}
              style={[styles.arrowBtn, index === 0 && { opacity: 0.2 }]}
            >
              <Ionicons name="chevron-up" size={12} color={c.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onMoveDown}
              disabled={index === totalCount - 1}
              style={[styles.arrowBtn, index === totalCount - 1 && { opacity: 0.2 }]}
            >
              <Ionicons name="chevron-down" size={12} color={c.textMuted} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={{ flex: 1 }} onPress={onCollapse} activeOpacity={0.7}>
            <View style={[styles.muscleTag, { backgroundColor: c.cardAlt }]}>
              <Text style={[styles.muscleText, { color: c.textMuted }]}>{ex.muscleGroup}</Text>
            </View>
            <View style={styles.exNameRow}>
              <Text style={[styles.exName, { color: c.text }]}>{ex.name}</Text>
              {allDone && <Ionicons name="checkmark-circle" size={16} color={c.text} style={{ marginLeft: 6 }} />}
              <Ionicons
                name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                size={14} color={c.textMuted}
                style={{ marginLeft: 'auto' }}
              />
            </View>
            {isCollapsed && (
              <Text style={[styles.collapsedSummary, { color: c.textMuted }]}>
                {completedCount}/{ex.sets.length} sets done
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onNotePress}
            style={[styles.menuBtn, { backgroundColor: c.cardAlt, borderColor: c.border }]}
          >
            <Ionicons name="ellipsis-vertical" size={14} color={c.textMuted} />
          </TouchableOpacity>
        </View>

        {!isCollapsed && (
          <>
            <View style={[styles.setTableHeader, { borderTopColor: c.cardAlt }]}>
              <Text style={[styles.colLabel, { width: 36, color: c.textLabel }]}>Set</Text>
              <Text style={[styles.colLabel, { flex: 1, textAlign: 'center', color: c.textLabel }]}>Load</Text>
              <Text style={[styles.colLabel, { flex: 1, textAlign: 'center', color: c.textLabel }]}>Reps</Text>
              <Text style={[styles.colLabel, { width: 36, textAlign: 'center', color: c.textLabel }]}>RPE</Text>
              <View style={{ width: 32 }} />
            </View>

            {ex.sets.map((set: ExerciseSet, si: number) => (
              <SwipeableSetRow
                key={set.id}
                set={set}
                index={si}
                exerciseName={ex.name}
                onToggle={() => onToggleSet(set.id)}
                onOpenPicker={() => onOpenPicker(set)}
                onRemove={() => onRemoveSet(set.id, si)}
                onRpe={() => onRpePress(set.id)}
                colors={c}
              />
            ))}

            <TouchableOpacity
              style={[styles.addSetRow, { borderTopColor: c.cardAlt }]}
              onPress={onAddSet}
              activeOpacity={0.7}
            >
              <View style={[styles.addSetIcon, { backgroundColor: c.cardAlt }]}>
                <Ionicons name="add" size={12} color={c.textMuted} />
              </View>
              <Text style={[styles.addSetLabel, { color: c.textMuted }]}>Add Set</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
  );
}

// ─── Pulsing dot ─────────────────────────────────────
function PulsingDot() {
  const opacity = useSharedValue(1);
  opacity.value = withRepeat(
    withSequence(withTiming(0.3, { duration: 750 }), withTiming(1, { duration: 750 })),
    -1, false
  );
  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[styles.timerDot, style]} />;
}

// ─── Main Screen ─────────────────────────────────────
export default function WorkoutScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavT>();
  const route = useRoute<RouteT>();
  const { colors: c, isDark } = useTheme();

  const {
    splits, activeSession,
    startSession, addExerciseToSession,
    addSetToExercise, insertSetInExercise, updateSet, removeSet,
    toggleSetComplete, updateExerciseNote,
    endSession, discardSession,
    removeExerciseFromSession, reorderExercises,
    customExercises,
  } = useGymStore();

  const { formatted, reset: resetTimer } = useWorkoutTimer(!!activeSession, activeSession?.startedAt);

  const [noteModal, setNoteModal] = useState<{ exerciseId: string; note: string } | null>(null);
  const [addExModal, setAddExModal] = useState(false);
  const [newExName, setNewExName] = useState('');
  const [newExMuscle, setNewExMuscle] = useState('');
  const [pickerModal, setPickerModal] = useState<{
    exerciseId: string; setId: string; weight: number; reps: number; loadMode: 'weight' | 'plates';
  } | null>(null);
  const [rpeModal, setRpeModal] = useState<{ exerciseId: string } | null>(null);
  const [collapsedExercises, setCollapsedExercises] = useState<Set<string>>(new Set());
  const [deletedSet, setDeletedSet] = useState<{ exerciseId: string; set: ExerciseSet; index: number } | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const split = splits.find((s) => s.id === route.params.splitId);
    const day = split?.days.find((d) => d.id === route.params.dayId);
    if (split && day && !activeSession) {
      startSession(split, day);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  function toggleCollapse(exerciseId: string) {
    setCollapsedExercises(prev => {
      const next = new Set(prev);
      if (next.has(exerciseId)) {
        next.delete(exerciseId);
      } else {
        next.add(exerciseId);
      }
      return next;
    });
  }

  function handleToggleSet(exerciseId: string, setId: string) {
    const ex = activeSession?.exercises.find(e => e.id === exerciseId);
    const set = ex?.sets.find(s => s.id === setId);
    const wasCompleted = set?.completed ?? false;
    toggleSetComplete(exerciseId, setId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!wasCompleted && ex) {
      // Count how many will be completed after this toggle
      const completedAfter = ex.sets.filter(s => s.id === setId ? true : s.completed).length;
      const allDone = completedAfter === ex.sets.length;
      if (allDone) {
        setTimeout(() => setRpeModal({ exerciseId }), 300);
      }
    }
  }

  function handleMoveUp(index: number) {
    if (index === 0) return;
    reorderExercises(index, index - 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleMoveDown(index: number) {
    if (!activeSession || index === activeSession.exercises.length - 1) return;
    reorderExercises(index, index + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleRemoveSetWithUndo(exerciseId: string, setId: string, index: number) {
    const exercise = activeSession?.exercises.find(e => e.id === exerciseId);
    const setToDelete = exercise?.sets.find(s => s.id === setId);
    if (!setToDelete) return;

    removeSet(exerciseId, setId);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setDeletedSet({ exerciseId, set: { ...setToDelete }, index });
    undoTimerRef.current = setTimeout(() => {
      setDeletedSet(null);
      undoTimerRef.current = null;
    }, 3000);
  }

  function handleUndoRemoveSet() {
    if (!deletedSet) return;
    insertSetInExercise(deletedSet.exerciseId, deletedSet.set, deletedSet.index);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
    setDeletedSet(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleFinish() {
    if (Platform.OS === 'web') {
      const save = window.confirm('Save this workout?');
      if (save) {
        endSession();
        resetTimer();
        const sessionId = useGymStore.getState().sessions[0]?.id;
        if (sessionId) navigation.replace('WorkoutSummaryScreen', { sessionId });
        else navigation.goBack();
      } else {
        discardSession();
        resetTimer();
        navigation.goBack();
      }
      return;
    }
    Alert.alert('Finish Workout', 'Save this session?', [
      { text: 'Discard', style: 'destructive', onPress: () => { discardSession(); resetTimer(); navigation.goBack(); } },
      {
        text: 'Save', onPress: () => {
          endSession();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          resetTimer();
          const sessionId = useGymStore.getState().sessions[0]?.id;
          if (sessionId) navigation.replace('WorkoutSummaryScreen', { sessionId });
          else navigation.goBack();
        },
      },
    ]);
  }

  const allExerciseOptions = [
    ...EXERCISE_LIBRARY.map(e => e.name),
    ...customExercises.map(e => e.name),
  ];

  function handleSelectExerciseName(name: string) {
    setNewExName(name);
    const found = EXERCISE_LIBRARY.find(e => e.name === name)
      ?? customExercises.find(e => e.name === name);
    if (found) setNewExMuscle(found.muscleGroup);
  }

  function handleAddExercise() {
    if (!newExName.trim()) return;
    const ex: WorkoutExercise = {
      id: uuid(),
      name: newExName.trim(),
      muscleGroup: newExMuscle.trim() || 'Other',
      sets: [{ id: uuid(), weight: 0, reps: 0, completed: false, loadMode: 'weight' }],
      note: '',
    };
    addExerciseToSession(ex);
    setNewExName('');
    setNewExMuscle('');
    setAddExModal(false);
  }

  if (!activeSession) return null;

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleFinish} style={[styles.closeBtn, { backgroundColor: c.card, borderColor: c.border }]}>
          <Ionicons name="chevron-back" size={16} color={c.textMuted} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: c.text }]}>
            {activeSession.splitName} · {activeSession.dayName}
          </Text>
          <View style={[styles.timerBadge, { backgroundColor: c.card, borderColor: c.border }]}>
            <PulsingDot />
            <Text style={[styles.timerText, { color: c.text }]}>{formatted()}</Text>
          </View>
        </View>
        <TouchableOpacity style={[styles.doneBtn, { backgroundColor: c.text }]} onPress={handleFinish}>
          <Text style={[styles.doneBtnText, { color: c.bg }]}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* Exercise List */}
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {activeSession.exercises.map((ex, index) => (
          <DraggableExerciseCard
            key={ex.id}
            ex={ex}
            index={index}
            totalCount={activeSession.exercises.length}
            isCollapsed={collapsedExercises.has(ex.id)}
            onCollapse={() => toggleCollapse(ex.id)}
            onNotePress={() => setNoteModal({ exerciseId: ex.id, note: ex.note })}
            onAddSet={() => addSetToExercise(ex.id)}
            onToggleSet={(setId: string) => handleToggleSet(ex.id, setId)}
            onOpenPicker={(set: ExerciseSet) => setPickerModal({
              exerciseId: ex.id, setId: set.id,
              weight: set.weight, reps: set.reps,
              loadMode: set.loadMode ?? 'weight',
            })}
            onRemoveSet={(setId: string, setIndex: number) => handleRemoveSetWithUndo(ex.id, setId, setIndex)}
            onRpePress={(setId: string) => setRpeModal({ exerciseId: ex.id })}
            onMoveUp={() => handleMoveUp(index)}
            onMoveDown={() => handleMoveDown(index)}
            colors={c}
          />
        ))}

        <TouchableOpacity
          style={[styles.addExBtn, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => setAddExModal(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={c.textMuted} />
          <Text style={[styles.addExText, { color: c.textMuted }]}>Add Exercise</Text>
        </TouchableOpacity>
      </ScrollView>

      {deletedSet ? (
        <View style={[styles.undoBar, { backgroundColor: c.card, borderColor: c.border }]}> 
          <Text style={[styles.undoText, { color: c.text }]}>Set deleted</Text>
          <TouchableOpacity onPress={handleUndoRemoveSet} style={[styles.undoBtn, { backgroundColor: c.text }]}> 
            <Text style={[styles.undoBtnText, { color: c.bg }]}>Undo</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Note Modal */}
      <Modal visible={!!noteModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bg }]}>
            <View style={[styles.modalHandle, { backgroundColor: c.cardAlt }]} />
            <Text style={[styles.modalTitle, { color: c.text }]}>Exercise Note</Text>
            <TextInput
              style={[styles.noteInput, { backgroundColor: c.card, color: c.text }]}
              value={noteModal?.note ?? ''}
              onChangeText={(t) => setNoteModal((m) => m ? { ...m, note: t } : m)}
              placeholder="Add note..."
              placeholderTextColor={c.textMuted}
              multiline
              autoFocus
            />
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setNoteModal(null)} style={[styles.modalBtn, { backgroundColor: c.card }]}>
                <Text style={{ color: c.textMuted, fontFamily: F.semibold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: c.text, flex: 1 }]}
                onPress={() => {
                  if (noteModal) updateExerciseNote(noteModal.exerciseId, noteModal.note);
                  setNoteModal(null);
                }}
              >
                <Text style={{ color: c.bg, fontFamily: F.bold, textAlign: 'center' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Add Exercise Modal */}
      <Modal visible={addExModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: c.bg }]}>
            <View style={[styles.modalHandle, { backgroundColor: c.cardAlt }]} />
            <Text style={[styles.modalTitle, { color: c.text }]}>Add Exercise</Text>
            <DropdownPicker
              label="Exercise"
              value={newExName}
              options={allExerciseOptions}
              onSelect={handleSelectExerciseName}
              placeholder="Select exercise"
              searchable
              icon="barbell-outline"
            />
            <View style={{ marginTop: 10 }}>
              <DropdownPicker
                label="Muscle Group"
                value={newExMuscle}
                options={[...MUSCLE_GROUPS]}
                onSelect={setNewExMuscle}
                placeholder="Select muscle group"
                icon="body-outline"
              />
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setAddExModal(false)} style={[styles.modalBtn, { backgroundColor: c.card }]}>
                <Text style={{ color: c.textMuted, fontFamily: F.semibold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.text }]} onPress={handleAddExercise}>
                <Text style={{ color: c.bg, fontFamily: F.bold }}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Picker Modal */}
      <Modal visible={!!pickerModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.pickerCard, { backgroundColor: c.bg }]}>
            <View style={[styles.modalHandle, { backgroundColor: c.cardAlt }]} />
            <Text style={[styles.modalTitle, { color: c.text }]}>Set Load & Reps</Text>
            <View style={styles.loadModeRow}>
              {(['weight', 'plates'] as const).map((mode) => {
                const active = pickerModal?.loadMode === mode;
                return (
                  <AnimatedPressable
                    key={mode}
                    onPress={() => setPickerModal((m) => {
                      if (!m) return m;
                      const values = mode === 'plates' ? PLATES : WEIGHTS;
                      return { ...m, loadMode: mode, weight: nearestValue(values, m.weight) };
                    })}
                    style={[styles.loadModeBtn, { backgroundColor: active ? c.text : c.card }]}
                  >
                    <Text style={[styles.loadModeText, { color: active ? c.bg : c.textMuted }]}>
                      {mode === 'weight' ? 'Weight' : 'Plates'}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
            <View style={styles.pickersRow}>
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerLabel, { color: c.textMuted }]}>
                  {pickerModal?.loadMode === 'plates' ? 'Plates' : 'Weight (kg)'}
                </Text>
                <ScrollPicker
                  values={pickerModal?.loadMode === 'plates' ? PLATES : WEIGHTS}
                  selectedValue={pickerModal?.weight ?? 0}
                  onValueChange={(v) => setPickerModal((m) => m ? { ...m, weight: v } : m)}
                  width={110} itemHeight={44}
                />
              </View>
              <View style={[styles.pickerDivider, { backgroundColor: c.cardAlt }]} />
              <View style={styles.pickerCol}>
                <Text style={[styles.pickerLabel, { color: c.textMuted }]}>Reps</Text>
                <ScrollPicker
                  values={REPS}
                  selectedValue={pickerModal?.reps ?? 1}
                  onValueChange={(v) => setPickerModal((m) => m ? { ...m, reps: v } : m)}
                  width={90} itemHeight={44}
                />
              </View>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity onPress={() => setPickerModal(null)} style={[styles.modalBtn, { backgroundColor: c.card }]}>
                <Text style={{ color: c.textMuted, fontFamily: F.semibold }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: c.text, flex: 1 }]}
                onPress={() => {
                  if (pickerModal) {
                    updateSet(pickerModal.exerciseId, pickerModal.setId, {
                      weight: pickerModal.weight,
                      reps: pickerModal.reps,
                      loadMode: pickerModal.loadMode,
                    });
                  }
                  setPickerModal(null);
                }}
              >
                <Text style={{ color: c.bg, fontFamily: F.bold, textAlign: 'center' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* RPE Modal */}
      <Modal visible={!!rpeModal} transparent animationType="fade">
        <View style={styles.rpeOverlay}>
          <View style={[styles.rpeCard, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Text style={[styles.rpeTitle, { color: c.text }]}>Rate Effort (RPE)</Text>
            <Text style={[styles.rpeSub, { color: c.textMuted }]}>
              {activeSession?.exercises.find(e => e.id === rpeModal?.exerciseId)?.name ?? 'Exercise'}
            </Text>
            <View style={styles.rpeGrid}>
              {RPE_VALUES.map(val => {
                const ex = activeSession?.exercises.find(e => e.id === rpeModal?.exerciseId);
                const currentRpe = ex?.sets[ex.sets.length - 1]?.rpe;
                const active = currentRpe === val;
                const color = val >= 9.5 ? '#ef4444' : val >= 8.5 ? '#f97316' : val >= 7.5 ? '#eab308' : '#6FCF97';
                return (
                  <TouchableOpacity
                    key={val}
                    style={[styles.rpeChip, { backgroundColor: active ? color : c.card, borderColor: active ? color : c.border }]}
                    onPress={() => {
                      if (rpeModal) {
                        const ex = activeSession?.exercises.find(e => e.id === rpeModal.exerciseId);
                        // Apply RPE only to the last set (the one most recently completed)
                        const lastSet = ex?.sets[ex.sets.length - 1];
                        if (lastSet) updateSet(rpeModal.exerciseId, lastSet.id, { rpe: val });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setRpeModal(null);
                    }}
                  >
                    <Text style={[styles.rpeChipText, { color: active ? '#fff' : c.text }]}>{val}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity onPress={() => setRpeModal(null)} style={styles.rpeSkip}>
              <Text style={[styles.rpeSkipText, { color: c.textMuted }]}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: PAGE_PADDING_H, paddingBottom: 16, gap: 10,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', borderWidth: 0.5,
  },
  headerCenter: { flex: 1, alignItems: 'center', gap: 4 },
  headerTitle: { fontFamily: F.semibold, fontSize: 15, letterSpacing: -0.3 },
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, borderWidth: 0.5,
  },
  timerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22c55e' },
  timerText: { fontFamily: F.mono, fontSize: 12 },
  doneBtn: { borderRadius: 22, paddingHorizontal: 18, paddingVertical: 8 },
  doneBtnText: { fontFamily: F.semibold, fontSize: 14 },
  scroll: { paddingHorizontal: PAGE_PADDING_H, gap: 10, paddingTop: 4 },

  // Exercise card
  exCard: { borderRadius: CARD_RADIUS, borderWidth: 0.5, overflow: 'hidden' },
  exHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: CARD_PADDING, paddingTop: 10, paddingBottom: 10,
  },
  dragHandle: {
    width: 22, alignItems: 'center', justifyContent: 'center', gap: 0, marginRight: 6,
  },
  arrowBtn: {
    width: 22, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  exNameRow: { flexDirection: 'row', alignItems: 'center' },
  muscleTag: {
    alignSelf: 'flex-start', borderRadius: 6,
    paddingHorizontal: 7, paddingVertical: 2, marginBottom: 3,
  },
  muscleText: { fontFamily: F.semibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  exName: { fontFamily: F.bold, fontSize: 15.5, letterSpacing: -0.3 },
  collapsedSummary: { fontFamily: F.regular, fontSize: 12, marginTop: 2 },
  menuBtn: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 0.5,
  },

  // Set table
  setTableHeader: {
    flexDirection: 'row', borderTopWidth: 0.5,
    paddingHorizontal: CARD_PADDING, paddingVertical: 6, gap: 8,
  },
  colLabel: { fontFamily: F.semibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'center' },

  // Set row
  swipeDeleteBg: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 64, alignItems: 'center', justifyContent: 'center',
  },
  swipeCompleteBg: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: 64, alignItems: 'center', justifyContent: 'center',
  },
  setRowLive: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: CARD_PADDING, paddingVertical: 7,
    borderTopWidth: 0.5, gap: 8,
    backgroundColor: 'transparent',
  },
  setNumBadge: {
    width: 22, height: 22, borderRadius: 7,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  setInput: { flex: 1, borderRadius: 9, paddingVertical: 6, alignItems: 'center' },
  setInputText: { fontFamily: F.semibold, fontSize: 13 },
  rpeBadge: { width: 36, alignItems: 'center', justifyContent: 'center' },
  rpeBadgeText: { fontFamily: F.semibold, fontSize: 12 },
  setCheckBtn: {
    width: 28, height: 28, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5,
  },
  addSetRow: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: CARD_PADDING, paddingVertical: 10, borderTopWidth: 0.5,
  },
  addSetIcon: { width: 22, height: 22, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  addSetLabel: { fontFamily: F.medium, fontSize: 13 },

  // Add exercise
  addExBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 14, borderRadius: CARD_RADIUS,
    borderWidth: 1.5, borderStyle: 'dashed', marginTop: 4,
  },
  addExText: { fontFamily: F.semibold, fontSize: 13.5 },

  undoBar: {
    position: 'absolute',
    left: PAGE_PADDING_H,
    right: PAGE_PADDING_H,
    bottom: 24,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  undoText: { fontFamily: F.medium, fontSize: 13 },
  undoBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  undoBtnText: { fontFamily: F.semibold, fontSize: 12 },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, gap: 16 },
  pickerCard: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  modalHandle: { width: 32, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 4 },
  modalTitle: { fontFamily: F.bold, fontSize: 18 },
  noteInput: { borderRadius: CARD_RADIUS, padding: 12, fontSize: 15, minHeight: 80, textAlignVertical: 'top' },
  modalBtns: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center' },
  pickersRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, marginVertical: 16 },
  pickerDivider: { width: 1, height: 160 },
  pickerCol: { alignItems: 'center', gap: 8 },
  pickerLabel: { fontFamily: F.semibold, fontSize: 12 },
  loadModeRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 4 },
  loadModeBtn: { borderRadius: 11, paddingHorizontal: 12, paddingVertical: 8 },
  loadModeText: { fontFamily: F.semibold, fontSize: 12 },

  // RPE
  rpeOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  rpeCard: {
    width: '100%', borderRadius: 24, borderWidth: 1,
    padding: 24, gap: 12, alignItems: 'center',
  },
  rpeTitle: { fontFamily: F.bold, fontSize: 20, letterSpacing: -0.3 },
  rpeSub: { fontFamily: F.regular, fontSize: 14 },
  rpeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginTop: 8 },
  rpeChip: {
    width: 56, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  rpeChipText: { fontFamily: F.bold, fontSize: 14 },
  rpeSkip: { paddingVertical: 8, paddingHorizontal: 20 },
  rpeSkipText: { fontFamily: F.medium, fontSize: 14 },
});

