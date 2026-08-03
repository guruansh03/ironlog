import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, FlatList, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, subMonths, subYears, subDays } from 'date-fns';

import { useAppTheme } from '../../theme/ThemeContext';
import { typography } from '../../theme/fonts';
import { useGymStore } from '../../store/gymStore';
import { useWeightStore } from '../../store/weightStore';
import { useWorkoutStreaks } from '../../hooks/useWorkoutStreaks';
import MiniLineChart from '../../components/ui/MiniLineChart';
import AnimatedPressable from '../../components/animations/AnimatedPressable';
import FadeInView from '../../components/animations/FadeInView';
import { CARD_GAP, CARD_PADDING, CARD_RADIUS, PAGE_PADDING_H } from '../../theme/spacing';
import { calculateMuscleRecovery, getRecoveryColor, getRecoveryLabel } from '../../utils/muscleRecovery';

type RangeKey = '1M' | '3M' | '6M' | '1Y' | 'ALL';

function cutoffForRange(range: RangeKey) {
  const now = new Date();
  if (range === '1M') return subMonths(now, 1);
  if (range === '3M') return subMonths(now, 3);
  if (range === '6M') return subMonths(now, 6);
  if (range === '1Y') return subYears(now, 1);
  return new Date('1970-01-01');
}

function e1rm(weight: number, reps: number) {
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
}

export default function GymStatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t } = useAppTheme();
  const c = {
    bg: t.bg,
    card: t.surface,
    cardAlt: t.surface2,
    border: t.border,
    text: t.ink,
    textMuted: t.ink3,
  };
  const neu = { darkShadow: t.shadowTile, darkShadowSm: t.shadowTile };
  const { sessions, prs } = useGymStore();
  const { entries: bodyweightEntries } = useWeightStore();
  const streaks = useWorkoutStreaks(sessions);

  const [range, setRange] = useState<RangeKey>('ALL');
  const [selectedExercise, setSelectedExercise] = useState<string>('');
  const [targetWeight, setTargetWeight] = useState('');
  const exerciseListRef = React.useRef<FlatList<string>>(null);
  const exerciseScrollX = React.useRef(0);

  const exerciseNames = useMemo(() => {
    const names = new Set<string>();
    sessions.forEach((session) => {
      session.exercises.forEach((exercise) => names.add(exercise.name));
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [sessions]);

  const effectiveExercise = selectedExercise || exerciseNames[0] || '';

  const filteredSessions = useMemo(() => {
    const cutoff = cutoffForRange(range);
    return sessions
      .filter((session) => new Date(session.startedAt) >= cutoff)
      .filter((session) => session.exercises.some((exercise) => exercise.name === effectiveExercise))
      .slice()
      .reverse();
  }, [sessions, range, effectiveExercise]);

  const volumeSeries = useMemo(() => {
    return filteredSessions.map((session) => {
      const exercise = session.exercises.find((item) => item.name === effectiveExercise);
      if (!exercise) return 0;
      return exercise.sets
        .filter((set) => set.weight > 0 && set.reps > 0 && (set.loadMode ?? 'weight') === 'weight')
        .reduce((sum, set) => sum + set.weight * set.reps, 0);
    });
  }, [filteredSessions, effectiveExercise]);

  const e1rmSeries = useMemo(() => {
    return filteredSessions.map((session) => {
      const exercise = session.exercises.find((item) => item.name === effectiveExercise);
      if (!exercise) return 0;
      const best = exercise.sets
        .filter((set) => (set.loadMode ?? 'weight') === 'weight')
        .reduce((top, set) => Math.max(top, e1rm(set.weight, set.reps)), 0);
      return best;
    });
  }, [filteredSessions, effectiveExercise]);

  const statCurrent = e1rmSeries.length ? e1rmSeries[e1rmSeries.length - 1] : 0;
  const statAllTime = e1rmSeries.length ? Math.max(...e1rmSeries) : 0;
  const statSessions = filteredSessions.length;
  const statVolTrend = useMemo(() => {
    if (volumeSeries.length < 2) return 0;
    const half = Math.floor(volumeSeries.length / 2);
    const firstHalf = volumeSeries.slice(0, half);
    const secondHalf = volumeSeries.slice(half);
    const firstAvg = firstHalf.length ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
    const secondAvg = secondHalf.length ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
    if (firstAvg <= 0) return secondAvg > 0 ? 100 : 0;
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }, [volumeSeries]);

  const repsAtWeight = useMemo(() => {
    const weight = Number(targetWeight);
    if (!Number.isFinite(weight) || weight <= 0) return [] as Array<{ date: string; reps: number }>;

    const data: Array<{ date: string; reps: number }> = [];
    filteredSessions.forEach((session) => {
      const exercise = session.exercises.find((item) => item.name === effectiveExercise);
      if (!exercise) return;
      const exact = exercise.sets.filter(
        (set) => (set.loadMode ?? 'weight') === 'weight' && Number(set.weight.toFixed(1)) === Number(weight.toFixed(1)),
      );
      if (!exact.length) return;
      const bestReps = Math.max(...exact.map((set) => set.reps));
      data.push({ date: format(parseISO(session.startedAt), 'dd MMM'), reps: bestReps });
    });
    return data;
  }, [targetWeight, filteredSessions, effectiveExercise]);

  const bodyweightSeries = useMemo(() => {
    const cutoff = cutoffForRange(range);
    return bodyweightEntries
      .filter((entry) => {
        const date = new Date(`${entry.date}T00:00:00`);
        return date >= cutoff;
      })
      .map((entry) => entry.value);
  }, [bodyweightEntries, range]);

  const filteredPrs = useMemo(() => {
    return prs
      .filter((pr) => !effectiveExercise || pr.exerciseName === effectiveExercise)
      .slice()
      .sort((a, b) => new Date(b.achievedAt).getTime() - new Date(a.achievedAt).getTime());
  }, [prs, effectiveExercise]);

  const handleExerciseWheel = React.useCallback((event: any) => {
    if (Platform.OS !== 'web') return;
    const deltaY = event?.nativeEvent?.deltaY ?? 0;
    const deltaX = event?.nativeEvent?.deltaX ?? 0;
    const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY;
    if (!delta) return;
    event?.preventDefault?.();
    const nextOffset = Math.max(0, exerciseScrollX.current + delta);
    exerciseScrollX.current = nextOffset;
    exerciseListRef.current?.scrollToOffset({ offset: nextOffset, animated: false });
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.title, { color: c.text }]}>Progress</Text>
      </View>

      <FadeInView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator>
        <Text style={[styles.label, { color: c.textMuted }]}>Exercise</Text>
        <View style={[styles.selector, neu.darkShadowSm, { backgroundColor: c.card }]}> 
          <FlatList
            ref={exerciseListRef}
            data={exerciseNames}
            keyExtractor={(item) => item}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            scrollEventThrottle={16}
            contentContainerStyle={styles.exerciseListContent}
            onScroll={(event) => {
              exerciseScrollX.current = event.nativeEvent.contentOffset.x;
            }}
            {...(Platform.OS === 'web' ? ({ onWheel: handleExerciseWheel } as any) : {})}
            renderItem={({ item: exercise }) => (
              <AnimatedPressable
                style={[styles.exerciseChip, { backgroundColor: exercise === effectiveExercise ? c.text : c.cardAlt }]}
                onPress={() => setSelectedExercise(exercise)}
              >
                <Text style={[typography.caption, { color: exercise === effectiveExercise ? c.bg : c.text }]}> 
                  {exercise}
                </Text>
              </AnimatedPressable>
            )}
          />
        </View>

        <View style={styles.rangeRow}>
          {(['1M', '3M', '6M', '1Y', 'ALL'] as RangeKey[]).map((item) => (
            <AnimatedPressable
              key={item}
              style={[styles.rangePill, { backgroundColor: range === item ? c.text : c.cardAlt }]}
              onPress={() => setRange(item)}
            >
              <Text style={[typography.caption, { color: range === item ? c.bg : c.text }]}>{item}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <ChartCard title="Volume Per Session" colors={c} neu={neu}>
          <MiniLineChart data={volumeSeries} width={320} height={130} color="#C9A96E" area />
        </ChartCard>

        <ChartCard title="Estimated 1RM" colors={c} neu={neu}>
          <MiniLineChart data={e1rmSeries} width={320} height={130} color="#7AB7FF" />
        </ChartCard>

        <View style={styles.statsGrid}>
          <StatsBox label="Current e1RM" value={`${statCurrent} kg`} colors={c} neu={neu} />
          <StatsBox label="All-time e1RM" value={`${statAllTime} kg`} colors={c} neu={neu} />
          <StatsBox label="Sessions" value={`${statSessions}`} colors={c} neu={neu} />
          <StatsBox label="Vol. Trend" value={`${statVolTrend >= 0 ? '+' : ''}${statVolTrend.toFixed(1)}%`} colors={c} neu={neu} />
          <StatsBox label="Streak" value={`${streaks.currentStreak}d`} colors={c} neu={neu} />
          <StatsBox label="Best Streak" value={`${streaks.longestStreak}d`} colors={c} neu={neu} />
        </View>

        <View style={[styles.card, neu.darkShadow, { backgroundColor: c.card }]}> 
          <Text style={[styles.cardTitle, { color: c.textMuted }]}>Reps at Specific Weight</Text>
          <View style={styles.targetRow}>
            <TextInput
              value={targetWeight}
              onChangeText={setTargetWeight}
              placeholder="e.g. 80"
              placeholderTextColor={c.textMuted}
              keyboardType="decimal-pad"
              style={[styles.targetInput, { backgroundColor: c.cardAlt, color: c.text }]}
            />
            <Text style={{ color: c.textMuted, marginHorizontal: 8 }}>kg</Text>
          </View>
          {repsAtWeight.length ? (
            repsAtWeight.map((entry, index) => (
              <View key={`${entry.date}-${index}`} style={styles.rowItem}>
                <Text style={[typography.caption, { color: c.textMuted }]}>{entry.date}</Text>
                <Text style={[typography.cardSubtitle, { color: c.text }]}>{entry.reps} reps</Text>
              </View>
            ))
          ) : (
            <Text style={[typography.caption, { color: c.textMuted, marginTop: 8 }]}>No matching sets for this weight.</Text>
          )}
        </View>

        <ChartCard title="Bodyweight Trend" colors={c} neu={neu}>
          <MiniLineChart data={bodyweightSeries} width={320} height={110} color="#7FD08A" area />
        </ChartCard>

        {/* Training Consistency Calendar */}
        <View style={[styles.card, neu.darkShadow, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, typography.cardTitle, { color: c.text }]}>Training Calendar</Text>
          <TrainingCalendar sessions={sessions} colors={c} />
        </View>

        {/* Muscle Recovery */}
        <View style={[styles.card, neu.darkShadow, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, typography.cardTitle, { color: c.text }]}>Muscle Recovery</Text>
          <MuscleRecoveryGrid sessions={sessions} colors={c} />
        </View>

        {/* Body Recomp Dashboard */}
        <View style={[styles.card, neu.darkShadow, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, typography.cardTitle, { color: c.text }]}>Body Recomposition</Text>
          <RecompDashboard sessions={sessions} bodyweightEntries={bodyweightEntries} colors={c} range={range} />
        </View>

        {/* PR Timeline */}
        <View style={[styles.card, neu.darkShadow, { backgroundColor: c.card }]}>
          <Text style={[styles.cardTitle, { color: c.textMuted }]}>PR Timeline</Text>
          {filteredPrs.length ? (
            filteredPrs.slice(0, 10).map((record, idx) => {
              const prevE1rm = idx < filteredPrs.length - 1 ? filteredPrs[idx + 1].e1rm : 0;
              const improvement = prevE1rm > 0 ? Math.round(((record.e1rm - prevE1rm) / prevE1rm) * 100) : 0;
              return (
                <View key={record.id} style={{ flexDirection: 'row', gap: 10, marginBottom: 8 }}>
                  <View style={{ width: 2, backgroundColor: c.cardAlt, alignItems: 'center' }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.text, marginTop: 4 }} />
                  </View>
                  <View style={{ flex: 1, paddingBottom: 4 }}>
                    <Text style={[typography.cardSubtitle, { color: c.text }]}>{record.exerciseName}</Text>
                    <Text style={[typography.caption, { color: c.textMuted }]}>
                      {record.weight}kg × {record.reps} reps · e1RM {Math.round(record.e1rm)}kg
                      {improvement > 0 ? ` · ↑${improvement}%` : ''}
                    </Text>
                    <Text style={[typography.caption, { color: c.textMuted, fontSize: 10 }]}>
                      {format(new Date(record.achievedAt), 'EEE d MMM yyyy')}
                    </Text>
                  </View>
                </View>
              );
            })
          ) : (
            <Text style={[typography.caption, { color: c.textMuted }]}>No PR data yet.</Text>
          )}
        </View>
      </ScrollView>
      </FadeInView>
    </View>
  );
}

function ChartCard({ title, colors, neu, children }: any) {
  return (
    <View style={[styles.card, neu.darkShadow, { backgroundColor: colors.card }]}> 
      <Text style={[styles.cardTitle, typography.cardTitle, { color: colors.text }]}>{title}</Text>
      {children}
    </View>
  );
}

function StatsBox({ label, value, colors, neu }: any) {
  return (
    <View style={[styles.statCard, neu.darkShadowSm, { backgroundColor: colors.card }]}> 
      <Text style={[typography.cardTitle, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4 }]}>{label}</Text>
    </View>
  );
}

// ─── Training Consistency Calendar (GitHub-style) ──────────
function TrainingCalendar({ sessions, colors: c }: any) {
  const grid = useMemo(() => {
    const workoutDates = new Set(sessions.map((s: any) => format(new Date(s.startedAt), 'yyyy-MM-dd')));
    const weeks: Array<Array<{ date: string; count: number }>> = [];
    for (let w = 11; w >= 0; w--) {
      const week: Array<{ date: string; count: number }> = [];
      for (let d = 0; d < 7; d++) {
        const date = format(subDays(new Date(), w * 7 + (6 - d)), 'yyyy-MM-dd');
        week.push({ date, count: workoutDates.has(date) ? 1 : 0 });
      }
      weeks.push(week);
    }
    return weeks;
  }, [sessions]);

  return (
    <View style={{ flexDirection: 'row', gap: 2, justifyContent: 'center' }}>
      {grid.map((week, wi) => (
        <View key={wi} style={{ gap: 2 }}>
          {week.map((day) => (
            <View key={day.date} style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: day.count > 0 ? '#22c55e' : c.cardAlt, opacity: day.count > 0 ? 1 : 0.4 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

// ─── Muscle Recovery Grid ──────────────────────────────────
function MuscleRecoveryGrid({ sessions, colors: c }: any) {
  const recovery = useMemo(() => calculateMuscleRecovery(sessions), [sessions]);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {recovery.map(m => (
        <View key={m.muscleGroup} style={{ width: '31%', borderRadius: 8, padding: 8, backgroundColor: c.cardAlt }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: getRecoveryColor(m.status) }} />
            <Text style={[typography.caption, { color: c.text, fontSize: 10 }]}>{m.muscleGroup}</Text>
          </View>
          <Text style={[typography.caption, { color: c.textMuted, fontSize: 9 }]}>{getRecoveryLabel(m.status)}</Text>
          {m.totalSetsLast7Days > 0 && (
            <Text style={[typography.caption, { color: c.textMuted, fontSize: 8 }]}>{m.totalSetsLast7Days} sets/7d</Text>
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Body Recomposition Dashboard ──────────────────────────
function RecompDashboard({ sessions, bodyweightEntries, colors: c, range }: any) {
  const analysis = useMemo(() => {
    if (!bodyweightEntries?.length || !sessions?.length) return null;
    const months = range === '1M' ? 1 : range === '3M' ? 3 : 6;
    const cutoff = subMonths(new Date(), months);
    const rw = bodyweightEntries.filter((e: any) => new Date(`${e.date}T00:00:00`) >= cutoff).map((e: any) => e.value);
    const rs = sessions.filter((s: any) => new Date(s.startedAt) >= cutoff);
    const rv = rs.map((s: any) => s.totalVolume);
    if (rw.length < 2 || rv.length < 2) return null;
    const wd = rw[rw.length - 1] - rw[0];
    const half = Math.floor(rv.length / 2);
    const v1 = rv.slice(0, half).reduce((a: number, b: number) => a + b, 0) / half;
    const v2 = rv.slice(half).reduce((a: number, b: number) => a + b, 0) / (rv.length - half);
    const vd = v2 - v1;
    let status = 'Maintenance', emoji = '⚖️', sc = c.textMuted;
    if (wd <= -0.5 && vd >= 0) { status = 'Active Recomp'; emoji = '🟢'; sc = '#22c55e'; }
    else if (wd > 0.5 && vd >= 0) { status = 'Lean Bulk'; emoji = '🟡'; sc = '#f59e0b'; }
    else if (wd > 0.5 && vd < 0) { status = 'Check Diet'; emoji = '⚠️'; sc = '#ef4444'; }
    return { wd, vd, status, emoji, sc };
  }, [bodyweightEntries, sessions, range]);
  if (!analysis) return <Text style={[typography.caption, { color: c.textMuted }]}>Need more data.</Text>;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Text style={{ fontSize: 20 }}>{analysis.emoji}</Text>
      <View>
        <Text style={[typography.cardSubtitle, { color: analysis.sc }]}>{analysis.status}</Text>
        <Text style={[typography.caption, { color: c.textMuted }]}>
          Weight: {analysis.wd > 0 ? '+' : ''}{analysis.wd.toFixed(1)}kg · Volume: {analysis.vd > 0 ? '+' : ''}{Math.round(analysis.vd)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.screenTitle },
  scroll: { paddingHorizontal: PAGE_PADDING_H, gap: CARD_GAP },
  label: { ...typography.sectionLabel },
  selector: { borderRadius: CARD_RADIUS, padding: 10 },
  exerciseListContent: { gap: 8, paddingRight: 8 },
  exerciseChip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  rangeRow: { flexDirection: 'row', gap: 6 },
  rangePill: { borderRadius: 20, paddingHorizontal: 11, paddingVertical: 7 },
  card: { borderRadius: CARD_RADIUS, padding: CARD_PADDING, gap: 10 },
  cardTitle: {},
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48.8%', borderRadius: CARD_RADIUS, padding: CARD_PADDING },
  targetRow: { flexDirection: 'row', alignItems: 'center' },
  targetInput: { flex: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  rowItem: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  prRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
