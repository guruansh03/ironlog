import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';
import Svg, { Path, Rect, Line, Text as SvgText } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
  ZoomIn,
  FadeOut,
} from 'react-native-reanimated';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import { getReadableTextColor } from '../theme/contrast';
import { Habit, HabitType, getValueOn, isCompletedOn, getCompletionTime, useHabitStore } from '../store/habitStore';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import StaggerItem from '../components/animations/StaggerItem';
import { HabitsScreenSkeleton } from '../components/ui/SkeletonLoader';
import NavBar from '../components/shared/NavBar';
import PopupSheet from '../components/shared/PopupSheet';

type AppHabitType = 'yesno' | 'numeric';

function makeDays(days: number) {
  return Array.from({ length: days }, (_, index) =>
    format(subDays(new Date(), days - index - 1), 'yyyy-MM-dd')
  );
}

// ─── Draggable Habit Row Wrapper ──────────────────────
function DraggableHabitRow({
  habit, index, totalCount, date, expanded, onExpand, onAction, onDelete, days30,
  onMoveUp, onMoveDown,
}: {
  habit: Habit; index: number; totalCount: number; date: string;
  expanded: boolean; onExpand: () => void; onAction: () => void;
  onDelete: () => void; days30: string[];
  onMoveUp: () => void; onMoveDown: () => void;
}) {
  const { theme: t } = useAppTheme();

  return (
    <View style={styles.draggableRow}>
      <View style={styles.reorderHandle}>
            <Pressable
              onPress={onMoveUp}
              disabled={index === 0}
              style={[styles.reorderBtn, index === 0 && { opacity: 0.2 }]}
              hitSlop={8}
            >
              <Ionicons name="chevron-up" size={12} color={t.ink4} />
            </Pressable>
            <Pressable
              onPress={onMoveDown}
              disabled={index === totalCount - 1}
              style={[styles.reorderBtn, index === totalCount - 1 && { opacity: 0.2 }]}
              hitSlop={8}
            >
              <Ionicons name="chevron-down" size={12} color={t.ink4} />
            </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        <HabitRow
          habit={habit}
          date={date}
          expanded={expanded}
          onExpand={onExpand}
          onAction={onAction}
          onDelete={onDelete}
          days30={days30}
        />
      </View>
    </View>
  );
}

export default function HabitsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t, isDark } = useAppTheme();
  const { habits, addHabit, deleteHabit, toggleToday, setValueToday, reorderHabits } = useHabitStore() as any;

  const isReady = true;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<AppHabitType>('yesno');
  const [selectedDayIdx, setSelectedDayIdx] = useState(6);

  const [numericModal, setNumericModal] = useState<{ habitId: string; current: number; date: string } | null>(null);
  const [numericInput, setNumericInput] = useState('');
  const onAccent = getReadableTextColor(t.accentBtn);

  const days7 = makeDays(7);
  const days30 = makeDays(30);
  const selectedDate = days7[selectedDayIdx];

  const toggleOnDate = useCallback(
    (habitId: string, date: string) => {
      const store = useHabitStore.getState() as any;
      if (store._toggleOnDate) {
        store._toggleOnDate(habitId, date);
      } else {
        store.toggleToday(habitId);
      }
    },
    []
  );

  const setValueOnDate = useCallback(
    (habitId: string, value: number, date: string) => {
      const store = useHabitStore.getState() as any;
      if (store._setValueOnDate) {
        store._setValueOnDate(habitId, value, date);
      } else {
        store.setValueToday(habitId, value);
      }
    },
    []
  );

  const saveHabit = useCallback(() => {
    if (!newName.trim()) return;
    addHabit(newName.trim(), '✅', newType as HabitType);
    setNewName('');
    setNewType('yesno');
    setShowAdd(false);
  }, [addHabit, newName, newType]);

  const weekData = useMemo(
    () =>
      days7.map((day, index) => ({
        id: day,
        letter: format(new Date(day + 'T12:00:00'), 'EEEEE'),
        num: format(new Date(day + 'T12:00:00'), 'd'),
        filled: habits.length > 0 && habits.every((h: Habit) => isCompletedOn(h, day)),
        isSelected: index === selectedDayIdx,
        isToday: index === 6,
        isPast: index < 6,
      })),
    [days7, habits, selectedDayIdx]
  );

  const saveNumeric = useCallback(() => {
    if (!numericModal) return;
    const val = parseFloat(numericInput);
    if (!isNaN(val) && val >= 0) {
      setValueOnDate(numericModal.habitId, val, numericModal.date);
    }
    setNumericModal(null);
    setNumericInput('');
  }, [numericInput, numericModal, setValueOnDate]);

  const handleHabitAction = useCallback(
    (habit: Habit) => {
      if (habit.type === 'yesno') {
        toggleOnDate(habit.id, selectedDate);
        const newStreak = habit.streak + 1;
        const MILESTONES = [3, 7, 14, 30, 50, 100];
        if (MILESTONES.includes(newStreak)) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      } else {
        const current = getValueOn(habit, selectedDate);
        setNumericInput(current > 0 ? String(current) : '');
        setNumericModal({ habitId: habit.id, current, date: selectedDate });
      }
    },
    [selectedDate, toggleOnDate]
  );

  const handleDeleteHabit = useCallback(
    (id: string) => {
      if (Platform.OS === 'web') {
        if (window.confirm('Delete this habit?')) deleteHabit(id);
      } else {
        Alert.alert('Delete Habit', 'Remove this habit?', [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => deleteHabit(id) },
        ]);
      }
    },
    [deleteHabit]
  );

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return;
    reorderHabits(index, index - 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [reorderHabits]);

  const handleMoveDown = useCallback((index: number) => {
    if (index === habits.length - 1) return;
    reorderHabits(index, index + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [reorderHabits, habits.length]);

  const renderHeader = useCallback(
    () => (
      <>
        <NavBar
          title="Habits"
          subtitle={format(new Date(selectedDate + 'T12:00:00'), 'EEE, MMM d')}
          right={
            <AnimatedPressable
              style={[styles.plusBtn, { backgroundColor: t.accentBtn }]}
              hitSlop={12}
              onPress={() => navigation.navigate('AddHabitScreen')}
            >
              <Ionicons name="add" size={16} color={onAccent} />
            </AnimatedPressable>
          }
          noPadTop
        />

        {/* Week strip */}
        <View style={[styles.weekStrip, { backgroundColor: t.surface, borderColor: t.border }]}>
          {weekData.map((day, i) => (
            <AnimatedPressable
              key={day.id}
              onPress={() => setSelectedDayIdx(i)}
              style={[
                styles.weekDay,
                day.isSelected && { backgroundColor: t.accentBtn, borderRadius: 10 },
              ]}
            >
              <Text
                style={[
                  styles.weekDayLetter,
                  { color: day.isSelected ? onAccent : t.ink4, fontFamily: F.semibold },
                ]}
              >
                {day.letter}
              </Text>
              <Text
                style={[
                  styles.weekDayNum,
                  {
                    color: day.isSelected ? onAccent : day.isPast ? t.ink2 : t.ink4,
                    fontFamily: F.bold,
                  },
                ]}
              >
                {day.num}
              </Text>
              {day.filled && (
                <View
                  style={[
                    styles.weekDot,
                    { backgroundColor: day.isSelected ? 'rgba(255,255,255,0.5)' : t.habitDotDone },
                  ]}
                />
              )}
            </AnimatedPressable>
          ))}
        </View>
      </>
    ),
    [t, insets.top, weekData, selectedDate]
  );

  const renderHabit = useCallback(
    ({ item, index }: { item: Habit; index: number }) => (
      <StaggerItem index={index}>
        <DraggableHabitRow
          habit={item}
          index={index}
          totalCount={habits.length}
          date={selectedDate}
          expanded={expandedId === item.id}
          onExpand={() => setExpandedId(expandedId === item.id ? null : item.id)}
          onAction={() => handleHabitAction(item)}
          onDelete={() => handleDeleteHabit(item.id)}
          days30={days30}
          onMoveUp={() => handleMoveUp(index)}
          onMoveDown={() => handleMoveDown(index)}
        />
      </StaggerItem>
    ),
    [days30, expandedId, handleHabitAction, handleDeleteHabit, selectedDate, habits.length, handleMoveUp, handleMoveDown]
  );

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {!isReady ? (
        <View style={{ paddingTop: insets.top + 8 }}>
          <HabitsScreenSkeleton />
        </View>
      ) : (
      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{
          paddingHorizontal: 15,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 100,
          gap: 8,
        }}
        showsVerticalScrollIndicator
      />
      )}

      {/* Add Habit Sheet */}
      <PopupSheet visible={showAdd} onClose={() => setShowAdd(false)}>
        <Text style={[styles.modalTitle, { color: t.ink }]}>New Habit</Text>
        <TextInput
          style={[styles.input, { backgroundColor: t.surface2, color: t.ink, borderColor: t.border }]}
          placeholder="Habit name"
          placeholderTextColor={t.ink4}
          value={newName}
          onChangeText={setNewName}
          autoFocus
        />
        <View style={styles.typeRow}>
          {(['yesno', 'numeric'] as AppHabitType[]).map((key) => (
            <AnimatedPressable
              key={key}
              style={[
                styles.typeBtn,
                {
                  backgroundColor: newType === key ? t.accentBtn : t.surface,
                  borderColor: newType === key ? 'transparent' : t.border,
                },
              ]}
              onPress={() => setNewType(key)}
            >
              <Ionicons
                name={key === 'yesno' ? 'checkmark-circle-outline' : 'calculator-outline'}
                size={14}
                color={newType === key ? onAccent : t.ink3}
                style={{ marginBottom: 3 }}
              />
              <Text style={{ color: newType === key ? onAccent : t.ink, fontSize: 12, fontFamily: F.semibold }}>
                {key === 'yesno' ? 'Yes / No' : 'Numeric'}
              </Text>
              <Text style={{ color: newType === key ? onAccent : t.ink3, fontSize: 10, marginTop: 1, fontFamily: F.regular }}>
                {key === 'yesno' ? 'Toggle done' : 'Count / amount'}
              </Text>
            </AnimatedPressable>
          ))}
        </View>
        <AnimatedPressable
          style={[styles.saveBtn, { backgroundColor: t.accentBtn }]}
          onPress={saveHabit}
        >
          <Text style={[styles.saveTxt, { color: onAccent }]}>Create</Text>
        </AnimatedPressable>
      </PopupSheet>

      {/* Numeric modal */}
      <PopupSheet visible={!!numericModal} onClose={() => setNumericModal(null)} maxHeight={300}>
        <Text style={[styles.modalTitle, { color: t.ink }]}>Enter Value</Text>
        <TextInput
          style={[styles.numInput, { backgroundColor: t.surface2, color: t.ink, borderColor: t.border }]}
          value={numericInput}
          onChangeText={setNumericInput}
          placeholder="0"
          placeholderTextColor={t.ink4}
          keyboardType="decimal-pad"
          autoFocus
          onSubmitEditing={saveNumeric}
        />
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
          <AnimatedPressable
            style={[styles.typeBtn, { backgroundColor: t.surface2, borderColor: t.border }]}
            onPress={() => setNumericModal(null)}
          >
            <Text style={{ color: t.ink, fontFamily: F.semibold, fontSize: 14 }}>Cancel</Text>
          </AnimatedPressable>
          <AnimatedPressable
            style={[styles.saveBtn, { backgroundColor: t.accentBtn, flex: 2 }]}
            onPress={saveNumeric}
          >
            <Text style={[styles.saveTxt, { color: onAccent }]}>Save</Text>
          </AnimatedPressable>
        </View>
      </PopupSheet>
    </View>
  );
}

// ─── Habit Row ─────────────────────────────────────────
const HabitRow = memo(function HabitRow({
  habit, date, expanded, onExpand, onAction, onDelete, days30,
}: {
  habit: Habit; date: string; expanded: boolean;
  onExpand: () => void; onAction: () => void; onDelete: () => void; days30: string[];
}) {
  const { theme: t } = useAppTheme();
  const done = isCompletedOn(habit, date);
  const valueOnDate = getValueOn(habit, date);
  const completionTime = getCompletionTime(habit, date);
  const onAccent = getReadableTextColor(t.accent);

  const values30 = useMemo(
    () =>
      days30.map((day) => {
        if (habit.type === 'yesno') return isCompletedOn(habit, day) ? 1 : 0;
        return getValueOn(habit, day) > 0 ? 1 : 0;
      }),
    [days30, habit]
  );
  const monthBoundaries = useMemo(() => {
    const boundaries: Array<{ index: number; label: string }> = [];
    for (let i = 1; i < days30.length; i += 1) {
      const prev = new Date(days30[i - 1] + 'T12:00:00');
      const curr = new Date(days30[i] + 'T12:00:00');
      if (prev.getMonth() !== curr.getMonth() || prev.getFullYear() !== curr.getFullYear()) {
        boundaries.push({ index: i, label: format(curr, 'MMM') });
      }
    }
    return boundaries;
  }, [days30]);

  const expandHeight = useSharedValue(0);
  useEffect(() => {
    expandHeight.value = withTiming(expanded ? 1 : 0, { duration: 280 });
  }, [expanded]);

  const expandStyle = useAnimatedStyle(() => ({
    height: 132 * expandHeight.value,
    opacity: expandHeight.value,
  }));

  return (
    <View style={[habitStyles.card, { backgroundColor: t.surface, borderColor: t.border }, t.shadowTile as any]}>
      <View style={habitStyles.main}>
        <View style={habitStyles.actionSlot}>
          <HabitActionButton
            done={done}
            value={valueOnDate}
            type={habit.type}
            onPress={onAction}
            onAccent={onAccent}
          />
        </View>

        <View style={[habitStyles.iconBadge, { backgroundColor: t.surface2, borderColor: t.border }]}>
          {/^[a-z0-9-]+$/i.test(habit.icon) ? (
            <Ionicons name={habit.icon as any} size={13} color={t.ink2} />
          ) : (
            <Text style={habitStyles.iconEmoji}>{habit.icon}</Text>
          )}
        </View>

        <AnimatedPressable style={{ flex: 1 }} onPress={onExpand}>
          <Text style={[habitStyles.name, { color: t.ink }]}>{habit.name}</Text>
          <Text style={[habitStyles.streak, { color: t.ink3 }]}>
            {habit.type === 'numeric'
              ? `${valueOnDate > 0 ? valueOnDate : '—'} today · 🔥 ${habit.streak}`
              : `🔥 ${habit.streak} streak`}
            {habit.bestStreak > 0 && habit.bestStreak > habit.streak ? ` · 🏆 ${habit.bestStreak}` : ''}
          </Text>
          {completionTime && (
            <Text style={[habitStyles.timeTag, { color: t.ink4 }]}>
              ✓ at {completionTime}
            </Text>
          )}
          {habit.category && habit.category !== 'General' && (
            <View style={[habitStyles.categoryTag, { backgroundColor: t.surface2 }]}>
              <Text style={{ fontFamily: F.semibold, fontSize: 9, color: t.ink4, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                {habit.category}
              </Text>
            </View>
          )}
        </AnimatedPressable>

        <AnimatedPressable onPress={onDelete} style={habitStyles.deleteBtn}>
          <Ionicons name="trash-outline" size={13} color={t.ink4} />
        </AnimatedPressable>
        <AnimatedPressable onPress={onExpand}>
          <Ionicons name={expanded ? 'chevron-down' : 'chevron-forward'} size={14} color={t.ink4} />
        </AnimatedPressable>
      </View>

      <Animated.View style={[habitStyles.expandWrap, expandStyle]}>
        <View style={[habitStyles.expandPanel, { borderTopColor: t.surface2 }]}>
          <View style={habitStyles.expandCols}>
            <View style={habitStyles.expandCol}>
              <Text style={[habitStyles.expandLabel, { color: t.ink4 }]}>CONSISTENCY (30d)</Text>
              <View style={habitStyles.graphWrap}>
                <Heatmap values={values30} monthBoundaries={monthBoundaries} />
              </View>
            </View>
            <View style={habitStyles.expandCol}>
              <Text style={[habitStyles.expandLabel, { color: t.ink4 }]}>TREND</Text>
              <View style={habitStyles.graphWrap}>
                <TrendLine values={values30} />
              </View>
            </View>
          </View>
        </View>
      </Animated.View>
    </View>
  );
});

// ─── Action Button with completion animation ──────────
const HabitActionButton = memo(function HabitActionButton({
  done, value, type, onPress, onAccent,
}: {
  done: boolean; value: number; type: HabitType; onPress: () => void; onAccent: string;
}) {
  const { theme: t } = useAppTheme();
  const scale = useSharedValue(1);
  const bgFlash = useSharedValue(0);

  const press = useCallback(() => {
    // Scale bounce
    scale.value = withSequence(withSpring(1.25, { damping: 6 }), withSpring(1, { damping: 12 }));
    // Color flash
    bgFlash.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 400 })
    );
    onPress();
  }, [onPress, scale, bgFlash]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  if (type === 'yesno') {
    return (
      <AnimatedPressable
        onPress={press}
        hitSlop={12}
        style={[
          habitStyles.checkCircle,
          animatedStyle,
          {
            backgroundColor: done ? t.accent : 'transparent',
            borderColor: done ? t.accent : t.surface3,
          },
        ]}
      >
        {done && (
          <Animated.View entering={ZoomIn.duration(200)}>
            <Ionicons name="checkmark" size={15} color={onAccent} />
          </Animated.View>
        )}
      </AnimatedPressable>
    );
  }

  return (
    <AnimatedPressable
      onPress={press}
      hitSlop={12}
      style={[
        habitStyles.numBadge,
        animatedStyle,
        {
          backgroundColor: done ? t.accent : t.surface2,
          borderColor: done ? t.accent : t.border,
        },
      ]}
    >
      <Text style={{ fontSize: 13, fontFamily: F.bold, color: done ? onAccent : t.ink3 }}>
        {value > 0 ? value : '—'}
      </Text>
    </AnimatedPressable>
  );
});

// ─── Heatmap ──────────────────────────────────────────
function Heatmap({ values, monthBoundaries }: { values: number[]; monthBoundaries?: Array<{ index: number; label: string }> }) {
  const { theme: t } = useAppTheme();
  const cell = 10;
  const gap = 4;
  const cols = 6;
  const rows = 5;
  const width = cols * (cell + gap) - gap;
  const height = rows * (cell + gap) - gap;
  return (
    <Svg width={width} height={height + 11}>
      {values.slice(0, cols * rows).map((v, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        return (
          <Rect
            key={i}
            x={col * (cell + gap)}
            y={row * (cell + gap)}
            width={cell}
            height={cell}
            rx={2}
            fill={v > 0 ? t.accent : t.surface3}
          />
        );
      })}
      {(monthBoundaries ?? []).map((b) => {
        const col = b.index % cols;
        const x = col * (cell + gap) - gap / 2;
        if (x <= 0 || x >= width) return null;
        return (
          <React.Fragment key={`m-${b.index}`}>
            <Line x1={x} y1={0} x2={x} y2={height} stroke={t.ink4} strokeWidth={0.7} strokeOpacity={0.45} />
            <SvgText x={Math.min(width - 16, x + 2)} y={height + 9} fill={t.ink4} fontSize={6.8} fontWeight="600">
              {b.label}
            </SvgText>
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ─── Trend Line ───────────────────────────────────────
function TrendLine({ values }: { values: number[] }) {
  const { theme: t } = useAppTheme();
  const width = 120;
  const height = 48;
  const data = values.slice(-7);
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 1);
  const range = max - min || 1;

  const points = data.map((v, i) => ({
    x: (i / Math.max(1, data.length - 1)) * width,
    y: height - ((v - min) / range) * (height * 0.8) - height * 0.1,
  }));

  const d = points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${path} C ${cpX} ${prev.y}, ${cpX} ${point.y}, ${point.x} ${point.y}`;
  }, '');

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={t.accent} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const habitStyles = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  main: {
    flexDirection: 'row', alignItems: 'center',
    gap: 12, padding: 14, paddingVertical: 13, minHeight: 54,
  },
  actionSlot: { width: 42, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  checkCircle: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 2,
  },
  numBadge: {
    width: 42, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1,
  },
  iconBadge: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, flexShrink: 0,
  },
  iconEmoji: { fontSize: 14, lineHeight: 16 },
  name: { fontFamily: F.semibold, fontSize: 14.5, marginBottom: 2 },
  streak: { fontFamily: F.regular, fontSize: 11.5 },
  deleteBtn: { padding: 4 },
  expandWrap: { overflow: 'hidden' },
  expandPanel: { paddingTop: 12, paddingHorizontal: 14, paddingBottom: 14, borderTopWidth: 0.5 },
  expandCols: { flexDirection: 'row', gap: 12 },
  expandCol: { flex: 1, gap: 8 },
  graphWrap: { minHeight: 52, justifyContent: 'center', alignItems: 'center' },
  expandLabel: { fontFamily: F.semibold, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  timeTag: { fontFamily: F.regular, fontSize: 10, marginTop: 1 },
  categoryTag: {
    alignSelf: 'flex-start', borderRadius: 4,
    paddingHorizontal: 5, paddingVertical: 1.5, marginTop: 3,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  draggableRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  reorderHandle: {
    width: 20, alignItems: 'center', justifyContent: 'center',
    gap: 2, opacity: 0.5,
  },
  reorderBtn: {
    width: 20, height: 18, alignItems: 'center', justifyContent: 'center',
  },
  plusBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },
  weekStrip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 16, padding: 6, marginBottom: 4, borderWidth: 1,
  },
  weekDay: { flex: 1, alignItems: 'center', padding: 6, paddingHorizontal: 4 },
  weekDayLetter: { fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 4 },
  weekDayNum: { fontSize: 14, lineHeight: 14 },
  weekDot: { width: 4, height: 4, borderRadius: 2, marginTop: 3 },
  modalTitle: { fontFamily: F.bold, fontSize: 20, marginBottom: 10 },
  input: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: F.regular, fontSize: 14, marginBottom: 10,
  },
  numInput: {
    borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: F.bold, fontSize: 28, textAlign: 'center', marginBottom: 8,
  },
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  typeBtn: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8, gap: 2,
  },
  saveBtn: { marginTop: 4, borderRadius: 12, alignItems: 'center', paddingVertical: 14 },
  saveTxt: { fontFamily: F.bold, fontSize: 14 },
});

