import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '../theme/useTheme';
import { FONT, RADIUS } from '../theme/tokens';
import { useGymStore } from '../store/gymStore';
import MiniLineChart from '../components/ui/MiniLineChart';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import FadeInView from '../components/animations/FadeInView';
import { CARD_GAP, CARD_PADDING, CARD_RADIUS, PAGE_PADDING_H } from '../theme/spacing';

export default function LifetimeStatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors: c, neu } = useTheme();
  const { sessions } = useGymStore();

  const [muscleGroup, setMuscleGroup] = useState('All');

  const muscles = useMemo(() => ['All', ...Array.from(new Set(sessions.flatMap((s) => s.exercises.map((e) => e.muscleGroup))))], [sessions]);

  const filtered = useMemo(() => {
    return sessions.filter((session) => {
      if (muscleGroup === 'All') return true;
      return session.exercises.some((e) => e.muscleGroup === muscleGroup);
    });
  }, [sessions, muscleGroup]);

  const totals = useMemo(() => {
    let totalVolume = 0;
    let totalSets = 0;

    filtered.forEach((session) => {
      totalVolume += session.totalVolume;
      session.exercises.forEach((exercise) => {
        totalSets += exercise.sets.filter((set) => set.completed).length;
      });
    });

    return {
      workouts: filtered.length,
      volume: Math.round(totalVolume),
      sets: totalSets,
      avgVolumePerSession: filtered.length ? Math.round(totalVolume / filtered.length) : 0,
      avgSetsPerSession: filtered.length ? Math.round(totalSets / filtered.length) : 0,
    };
  }, [filtered]);

  const perExercise = useMemo(() => {
    const map = new Map<string, { name: string; values: number[] }>();

    filtered
      .slice()
      .reverse()
      .forEach((session) => {
        session.exercises.forEach((exercise) => {
          const key = exercise.name;
          const vol = exercise.sets
            .filter((set) => set.completed)
            .reduce((sum, set) => sum + set.reps * set.weight, 0);
          if (!map.has(key)) map.set(key, { name: key, values: [] });
          map.get(key)!.values.push(vol);
        });
      });

    return Array.from(map.values()).sort((a, b) => b.values.reduce((s, v) => s + v, 0) - a.values.reduce((s, v) => s + v, 0));
  }, [filtered]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.title, { color: c.text }]}>Lifetime Stats</Text>
      </View>

      <FadeInView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator> 
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {muscles.map((item) => (
            <AnimatedPressable
              key={item}
              style={[styles.filter, neu.darkShadowSm, { backgroundColor: item === muscleGroup ? c.text : c.card }]}
              onPress={() => setMuscleGroup(item)}
            >
              <Text style={{ color: item === muscleGroup ? c.bg : c.text, fontWeight: '700', fontSize: 12 }}>{item}</Text>
            </AnimatedPressable>
          ))}
        </ScrollView>

        <View style={styles.totalsRow}>
          <TotalCard label="Volume" value={`${Math.round(totals.volume / 1000)} Tons`} colors={c} neu={neu} />
          <TotalCard label="Sets" value={totals.sets.toString()} colors={c} neu={neu} />
        </View>

        <View style={styles.totalsRow}>
          <TotalCard label="Avg Vol/Session" value={`${totals.avgVolumePerSession} kg`} colors={c} neu={neu} />
          <TotalCard label="Avg Sets/Session" value={totals.avgSetsPerSession.toString()} colors={c} neu={neu} />
          <TotalCard
            label="Performance"
            value={totals.avgSetsPerSession > 0 ? `${Math.round(totals.avgVolumePerSession / Math.max(1, totals.avgSetsPerSession))} kg/set` : '0'}
            colors={c}
            neu={neu}
          />
        </View>

        {perExercise.map((exercise) => (
          <View key={exercise.name} style={[styles.exerciseCard, neu.darkShadow, { backgroundColor: c.card }]}> 
            <Text style={[styles.exerciseName, { color: c.text }]}>{exercise.name}</Text>
            <Text style={[styles.exerciseMeta, { color: c.textMuted }]}>
              Total {Math.round(exercise.values.reduce((sum, value) => sum + value, 0))} kg
            </Text>
            <View style={[styles.exerciseBarTrack, { backgroundColor: '#EEEEEC' }]}>
              <View
                style={[
                  styles.exerciseBarFill,
                  {
                    width: `${
                      (exercise.values.reduce((sum, value) => sum + value, 0) /
                        Math.max(
                          1,
                          ...perExercise.map((item) => item.values.reduce((s, v) => s + v, 0))
                        )) *
                      100
                    }%`,
                    backgroundColor: c.bg === '#111111' ? '#FFFFFF' : '#111111',
                  },
                ]}
              />
            </View>
            <MiniLineChart data={exercise.values.slice(-20)} width={320} height={74} color="#76C4FF" area />
          </View>
        ))}
      </ScrollView>
      </FadeInView>
    </View>
  );
}

function TotalCard({ label, value, colors, neu }: any) {
  return (
    <View style={[styles.totalCard, neu.darkShadow, { backgroundColor: colors.card }]}> 
      <Text style={[styles.totalValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.totalLabel, { color: colors.textMuted }]}>{label}</Text>
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
  title: { fontSize: FONT.lg, fontWeight: '800' },
  scroll: { paddingHorizontal: PAGE_PADDING_H, gap: CARD_GAP },
  filter: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  totalsRow: { flexDirection: 'row', gap: 8 },
  totalCard: { flex: 1, borderRadius: 16, paddingVertical: CARD_PADDING, alignItems: 'center' },
  totalValue: { fontSize: 20, fontWeight: '700' },
  totalLabel: { marginTop: 4, fontSize: 11 },
  exerciseCard: { borderRadius: CARD_RADIUS, padding: CARD_PADDING, gap: 8 },
  exerciseName: { fontSize: 15, fontWeight: '800' },
  exerciseMeta: { fontSize: 12 },
  exerciseBarTrack: { height: 4, borderRadius: 2, overflow: 'hidden' },
  exerciseBarFill: { height: 4, borderRadius: 2 },
});
