// ─── GymHomeScreen ───────────────────────────────────────────────────────────
// NavBar. HeroCard (last workout stats). ActionButtons. SplitCards. History.

import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';
import { useGymStore, Split } from '../../store/gymStore';
import { RootStackParams } from '../../navigation/RootNavigator';
import AnimatedPressable from '../../components/animations/AnimatedPressable';
import { GymHomeScreenSkeleton } from '../../components/ui/SkeletonLoader';
import { useWorkoutStreaks } from '../../hooks/useWorkoutStreaks';

import NavBar from '../../components/shared/NavBar';
import HeroCard from '../../components/shared/HeroCard';
import ActionButton from '../../components/shared/ActionButton';
import SectionHeader from '../../components/shared/SectionHeader';
import HistoryCard from '../../components/shared/HistoryCard';

type NavT = StackNavigationProp<RootStackParams, 'MainTabs'>;

export default function GymHomeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavT>();
  const { theme: t } = useAppTheme();
  const { splits, sessions, deleteSplit } = useGymStore();
  const [expandedSplit, setExpandedSplit] = useState<string | null>(null);
  const isReady = true;
  const lastSession = sessions[0];
  const streaks = useWorkoutStreaks(sessions);

  function handleDeleteSplit(split: Split) {
    if (!split.isCustom) {
      Alert.alert('Cannot Delete', 'Predefined splits cannot be deleted.');
      return;
    }
    Alert.alert('Delete Split', `Remove "${split.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteSplit(split.id) },
    ]);
  }

  const heroStats = lastSession
    ? [
        { value: `${Math.round(lastSession.durationSeconds / 60)}m`, label: 'Duration' },
        { value: `${Math.round(lastSession.totalVolume)}`, label: 'Volume kg' },
        {
          value: `${lastSession.exercises.reduce(
            (s, e) => s + e.sets.filter((st) => st.weight > 0 && st.reps > 0).length, 0
          )}`,
          label: 'Sets',
        },
      ]
    : [
        { value: '0m', label: 'Duration' },
        { value: '0', label: 'Volume kg' },
        { value: '0', label: 'Sets' },
      ];

  const recentSessions = sessions.slice(0, 3);

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {!isReady ? (
        <View style={{ paddingTop: insets.top + 8 }}>
          <GymHomeScreenSkeleton />
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator
      >
        {/* NavBar */}
        <NavBar
          title="Gym"
          noPadTop
          right={
            <AnimatedPressable
              style={[styles.iconBtn, { backgroundColor: t.surface, borderColor: t.border }]}
              onPress={() => navigation.navigate('HistoryScreen')}
            >
              <Ionicons name="time-outline" size={18} color={t.ink} />
            </AnimatedPressable>
          }
        />

        {/* Hero Card */}
        <HeroCard
          tag="LAST WORKOUT"
          name={lastSession ? `${lastSession.splitName} · ${lastSession.dayName}` : 'No workouts yet'}
          date={lastSession ? format(parseISO(lastSession.startedAt), 'EEEE, MMM d') : 'Start a split to begin'}
          stats={heroStats}
        />

        {streaks.currentStreak > 0 && (
          <View style={[styles.streakBar, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Ionicons name="flame" size={16} color="#ef4444" />
            <Text style={[styles.streakText, { color: t.ink }]}>
              🔥 {streaks.currentStreak} day{streaks.currentStreak !== 1 ? 's' : ''} streak
            </Text>
            <Text style={[styles.streakSub, { color: t.ink3 }]}>
              {streaks.weeklyCount} this week · {streaks.totalSessions} total
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <ActionButton
          icon="stats-chart-outline"
          label="Gym Stats"
          onPress={() => navigation.navigate('GymStatsScreen')}
        />
        <ActionButton
          icon="body-outline"
          label="Muscle Heatmap"
          onPress={() => navigation.navigate('MuscleHeatmapScreen')}
        />
        <ActionButton
          icon="trophy-outline"
          label="Strength Standards"
          onPress={() => navigation.navigate('StrengthStandardsScreen')}
        />
        <ActionButton
          icon="calendar-outline"
          label="Workout Planner"
          onPress={() => navigation.navigate('WorkoutPlannerScreen', { mode: 'planner' })}
        />

        {/* Current Split */}
        <SectionHeader label="Current Split" />

        {splits.map((split) => (
          <View
            key={split.id}
            style={[styles.splitCard, { backgroundColor: t.surface, borderColor: t.border }, t.shadowTile as any]}
          >
            {/* Split header */}
            <AnimatedPressable
              style={styles.splitTop}
              onPress={() => setExpandedSplit(expandedSplit === split.id ? null : split.id)}
            >
              <View style={[styles.splitIconWrap, { backgroundColor: t.surface2 }]}>
                <Ionicons name="barbell-outline" size={14} color={t.ink3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.splitName, { color: t.ink }]}>{split.name}</Text>
                <Text style={[styles.splitSub, { color: t.ink3 }]}>
                  {split.days.length} day{split.days.length !== 1 ? 's' : ''}{split.isCustom ? ' · Custom' : ''}
                </Text>
              </View>
              {split.isCustom && (
                <AnimatedPressable onPress={() => handleDeleteSplit(split)} style={{ padding: 4, marginRight: 4 }}>
                  <Ionicons name="trash-outline" size={16} color="#ef4444" />
                </AnimatedPressable>
              )}
              <Chevron expanded={expandedSplit === split.id} color={t.ink4} />
            </AnimatedPressable>

            {/* Days row */}
            {expandedSplit === split.id && (
              <View style={[styles.splitDays, { borderTopColor: t.surface2 }]}>
                {split.days.map((day) => (
                  <View key={day.id} style={[styles.splitDayItem, { backgroundColor: t.surface2 }]}>
                    <Text style={[styles.splitDayName, { color: t.ink3 }]}>{day.name}</Text>
                    <AnimatedPressable
                      onPress={() => navigation.navigate('ActiveWorkoutScreen', { splitId: split.id, dayId: day.id })}
                    >
                      <Text style={[styles.splitDayStart, { color: t.accent }]}>Start →</Text>
                    </AnimatedPressable>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Create Custom Split */}
        <AnimatedPressable
          style={[styles.addBtn, { borderColor: t.ink4 }]}
          onPress={() => navigation.navigate('WorkoutPlannerScreen', { mode: 'custom' })}
        >
          <Ionicons name="add-circle-outline" size={14} color={t.ink3} />
          <Text style={[styles.addBtnTxt, { color: t.ink3 }]}>Create Custom Split</Text>
        </AnimatedPressable>

        {/* Recent History */}
        {recentSessions.length > 0 && (
          <>
            <SectionHeader label="Recent" />
            {recentSessions.map((session) => (
              <HistoryCard
                key={session.id}
                icon="barbell"
                name={`${session.splitName} · ${session.dayName}`}
                date={format(parseISO(session.startedAt), 'MMM d, yyyy')}
                stats={[
                  { value: `${Math.round(session.durationSeconds / 60)}m`, label: 'Duration' },
                  { value: `${Math.round(session.totalVolume)}`, label: 'Volume' },
                  {
                    value: `${session.exercises.reduce(
                      (s, e) => s + e.sets.filter((st) => st.weight > 0 && st.reps > 0).length, 0
                    )}`,
                    label: 'Sets',
                  },
                ]}
                onPress={() => navigation.navigate('WorkoutSummaryScreen', { sessionId: session.id })}
              />
            ))}
            <ActionButton
              icon="time-outline"
              label="View All History"
              onPress={() => navigation.navigate('HistoryScreen')}
            />
          </>
        )}
      </ScrollView>
      )}
    </View>
  );
}

const Chevron = memo(function Chevron({ expanded, color }: { expanded: boolean; color: string }) {
  const rotation = useSharedValue(expanded ? 180 : 0);

  useEffect(() => {
    rotation.value = withSpring(expanded ? 180 : 0, { damping: 20, stiffness: 250 });
  }, [expanded, rotation]);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={style}>
      <Ionicons name="chevron-down" size={14} color={color} />
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 15, gap: 0 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  splitCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  splitTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    paddingHorizontal: 14,
    gap: 12,
  },
  splitIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitName: { fontFamily: F.semibold, fontSize: 14.5 },
  splitSub: { fontFamily: F.regular, fontSize: 11.5, marginTop: 1 },
  splitDays: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 13,
    paddingTop: 9,
    borderTopWidth: 1,
  },
  splitDayItem: {
    flex: 1,
    padding: 8,
    alignItems: 'center',
    gap: 6,
    borderRadius: 9,
  },
  splitDayName: { fontFamily: F.regular, fontSize: 10 },
  splitDayStart: { fontFamily: F.semibold, fontSize: 12 },
  addBtn: {
    borderRadius: 14,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 10,
  },
  addBtnTxt: { fontFamily: F.medium, fontSize: 14 },
  streakBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  streakText: { fontFamily: F.bold, fontSize: 13 },
  streakSub: { fontFamily: F.regular, fontSize: 11, marginLeft: 'auto' },
});

