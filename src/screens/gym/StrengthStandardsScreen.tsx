import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme/ThemeContext';
import { useGymStore } from '../../store/gymStore';
import { useUserStore } from '../../store/userStore';
import { F } from '../../theme/fonts';
import { PAGE_PADDING_H, CARD_RADIUS, CARD_GAP } from '../../theme/spacing';
import AnimatedPressable from '../../components/animations/AnimatedPressable';

// ─── Strength Standards (multipliers × bodyweight) ───────────────────────────
// Source: based on Symmetric Strength / ExRx.net relative strength standards
// Values are e1RM / bodyweight ratios

interface Standard {
  exercise: string;
  muscleGroup: string;
  // BW multipliers: [beginner, novice, intermediate, advanced, elite]
  male: [number, number, number, number, number];
  female: [number, number, number, number, number];
}

const STANDARDS: Standard[] = [
  {
    exercise: 'Bench Press',
    muscleGroup: 'Chest',
    male: [0.5, 0.75, 1.0, 1.25, 1.5],
    female: [0.25, 0.5, 0.75, 1.0, 1.25],
  },
  {
    exercise: 'Squat',
    muscleGroup: 'Quads',
    male: [0.75, 1.0, 1.25, 1.5, 2.0],
    female: [0.5, 0.75, 1.0, 1.25, 1.5],
  },
  {
    exercise: 'Deadlift',
    muscleGroup: 'Back',
    male: [1.0, 1.25, 1.5, 2.0, 2.5],
    female: [0.5, 0.75, 1.0, 1.5, 2.0],
  },
  {
    exercise: 'Overhead Press',
    muscleGroup: 'Shoulders',
    male: [0.35, 0.5, 0.65, 0.8, 1.0],
    female: [0.2, 0.3, 0.45, 0.6, 0.75],
  },
  {
    exercise: 'Barbell Row',
    muscleGroup: 'Back',
    male: [0.5, 0.65, 0.85, 1.1, 1.3],
    female: [0.25, 0.4, 0.6, 0.8, 1.0],
  },
  {
    exercise: 'Romanian Deadlift',
    muscleGroup: 'Hamstrings',
    male: [0.5, 0.75, 1.0, 1.4, 1.75],
    female: [0.3, 0.5, 0.75, 1.0, 1.3],
  },
  {
    exercise: 'Barbell Curl',
    muscleGroup: 'Biceps',
    male: [0.25, 0.4, 0.55, 0.7, 0.85],
    female: [0.15, 0.25, 0.35, 0.5, 0.65],
  },
  {
    exercise: 'Incline Bench Press',
    muscleGroup: 'Chest',
    male: [0.4, 0.6, 0.8, 1.0, 1.25],
    female: [0.2, 0.35, 0.55, 0.75, 1.0],
  },
];

const LEVELS = ['Beginner', 'Novice', 'Inter.', 'Advanced', 'Elite'] as const;
type Level = typeof LEVELS[number];

const LEVEL_COLORS: Record<Level, string> = {
  Beginner: '#4CAF50',
  Novice: '#8BC34A',
  'Inter.': '#FFC107',
  Advanced: '#FF9800',
  Elite: '#F44336',
};

// ─── Compute user level for a given exercise ──────────────────────────────────

function getUserLevel(
  e1rm: number,
  bw: number,
  standard: Standard,
  isMale: boolean,
): { level: Level | null; progress: number; nextTarget: number | null } {
  if (bw <= 0 || e1rm <= 0) return { level: null, progress: 0, nextTarget: null };
  const ratios = isMale ? standard.male : standard.female;
  const ratio = e1rm / bw;

  let levelIdx = -1;
  for (let i = ratios.length - 1; i >= 0; i--) {
    if (ratio >= ratios[i]) { levelIdx = i; break; }
  }

  const level = levelIdx >= 0 ? LEVELS[levelIdx] : null;
  const nextIdx = levelIdx + 1;
  const nextTarget = nextIdx < ratios.length ? ratios[nextIdx] * bw : null;
  const prevTarget = levelIdx >= 0 ? ratios[levelIdx] * bw : 0;
  const progress = nextTarget
    ? Math.min((e1rm - prevTarget) / (nextTarget - prevTarget), 1)
    : 1;

  return { level, progress, nextTarget };
}

// ─── Standard Row ─────────────────────────────────────────────────────────────

function StandardRow({
  standard,
  e1rm,
  bw,
  unit,
  accent,
  cardColor,
  borderColor,
  textColor,
  mutedColor,
}: {
  standard: Standard;
  e1rm: number | null;
  bw: number;
  unit: 'kg' | 'lbs';
  accent: string;
  cardColor: string;
  borderColor: string;
  textColor: string;
  mutedColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const { level, progress, nextTarget } = e1rm
    ? getUserLevel(e1rm, bw, standard, true)
    : { level: null, progress: 0, nextTarget: null };

  const levelColor = level ? LEVEL_COLORS[level] : mutedColor;

  return (
    <Pressable
      onPress={() => setExpanded(v => !v)}
      style={[rowStyles.card, { backgroundColor: cardColor, borderColor }]}
    >
      <View style={rowStyles.main}>
        <View style={{ flex: 1 }}>
          <Text style={[rowStyles.muscle, { color: mutedColor }]}>{standard.muscleGroup.toUpperCase()}</Text>
          <Text style={[rowStyles.name, { color: textColor }]}>{standard.exercise}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 3 }}>
          {e1rm ? (
            <>
              <Text style={[rowStyles.e1rm, { color: textColor }]}>
                {Math.round(e1rm)} {unit}
              </Text>
              <View style={[rowStyles.levelBadge, { backgroundColor: levelColor + '28' }]}>
                <Text style={[rowStyles.levelText, { color: levelColor }]}>
                  {level ?? 'Below Beginner'}
                </Text>
              </View>
            </>
          ) : (
            <Text style={[rowStyles.noData, { color: mutedColor }]}>No data</Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={mutedColor}
          style={{ marginLeft: 8 }}
        />
      </View>

      {/* Progress bar */}
      {e1rm && (
        <View style={rowStyles.progressWrap}>
          <View style={[rowStyles.progressTrack, { borderColor }]}>
            <View
              style={[
                rowStyles.progressFill,
                { width: `${progress * 100}%`, backgroundColor: levelColor },
              ]}
            />
            {/* Level markers */}
            {[0.25, 0.5, 0.75].map((pos) => (
              <View
                key={pos}
                style={[rowStyles.marker, { left: `${pos * 100}%` as any, borderColor }]}
              />
            ))}
          </View>
          {nextTarget && (
            <Text style={[rowStyles.nextTarget, { color: mutedColor }]}>
              Next: {Math.round(nextTarget)} {unit}
            </Text>
          )}
        </View>
      )}

      {/* Expanded table */}
      {expanded && (
        <View style={[rowStyles.table, { borderTopColor: borderColor }]}>
          <View style={rowStyles.tableHeader}>
            {LEVELS.map(l => (
              <Text key={l} style={[rowStyles.tableHd, { color: LEVEL_COLORS[l] }]}>{l}</Text>
            ))}
          </View>
          <View style={rowStyles.tableRow}>
            {standard.male.map((r, i) => {
              const kg = Math.round(r * bw);
              const isActive = level === LEVELS[i];
              return (
                <Text
                  key={i}
                  style={[
                    rowStyles.tableCell,
                    { color: textColor },
                    isActive && { color: LEVEL_COLORS[LEVELS[i]], fontFamily: F.bold },
                  ]}
                >
                  {bw > 0 ? `${kg}${unit}` : `${r}×BW`}
                </Text>
              );
            })}
          </View>
        </View>
      )}
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    borderWidth: 0.5,
    padding: 14,
    gap: 10,
  },
  main: { flexDirection: 'row', alignItems: 'center' },
  muscle: { fontFamily: F.semibold, fontSize: 10, letterSpacing: 0.4, marginBottom: 2 },
  name: { fontFamily: F.semibold, fontSize: 15 },
  e1rm: { fontFamily: F.bold, fontSize: 16, letterSpacing: -0.3 },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  levelText: { fontFamily: F.semibold, fontSize: 11 },
  noData: { fontFamily: F.medium, fontSize: 13 },
  progressWrap: { gap: 4 },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(120,120,120,0.15)',
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: { height: 8, borderRadius: 4 },
  marker: {
    position: 'absolute',
    width: 1,
    height: '100%',
    borderWidth: 0.5,
    top: 0,
  },
  nextTarget: { fontFamily: F.medium, fontSize: 11, textAlign: 'right' },
  table: { borderTopWidth: 0.5, paddingTop: 10, gap: 6 },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between' },
  tableHd: { fontFamily: F.semibold, fontSize: 10, flex: 1, textAlign: 'center' },
  tableCell: { fontFamily: F.medium, fontSize: 12, flex: 1, textAlign: 'center' },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function StrengthStandardsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme: t } = useAppTheme();
  const { prs, sessions } = useGymStore();
  const { user } = useUserStore();
  const unit = user.unit;
  const accent = t.accent;

  // Estimate bodyweight from weightStore (use gym PRs as proxy bw=80 default if no weight)
  // We'll let user know bw is needed, use a default of 80kg
  const BW_KG = 80; // TODO: pull from weightStore when hooked up

  // Compute best e1RM per exercise from PRs
  const bestE1rm = useMemo(() => {
    const map: Record<string, number> = {};
    for (const pr of prs) {
      if (!map[pr.exerciseName] || pr.e1rm > map[pr.exerciseName]) {
        map[pr.exerciseName] = pr.e1rm;
      }
    }
    // Also compute from sessions for exercises without PRs recorded
    for (const session of sessions) {
      for (const ex of session.exercises) {
        for (const s of ex.sets) {
          if (s.weight > 0 && s.reps > 0) {
            const e1rm = Math.round((s.weight * (1 + s.reps / 30)) * 10) / 10;
            if (!map[ex.name] || e1rm > map[ex.name]) {
              map[ex.name] = e1rm;
            }
          }
        }
      }
    }
    return map;
  }, [prs, sessions]);

  const c = {
    bg: t.bg,
    card: t.surface,
    border: t.border,
    text: t.ink,
    muted: t.ink3,
  };

  // Summary stats
  const coveredExercises = STANDARDS.filter(s => bestE1rm[s.exercise] != null);
  const levels = coveredExercises.map(s => getUserLevel(bestE1rm[s.exercise]!, BW_KG, s, true).level);
  const topLevel = levels.reduce<Level | null>((best, l) => {
    if (!l) return best;
    const score = LEVELS.indexOf(l as Level);
    const bestScore = best ? LEVELS.indexOf(best as Level) : -1;
    return score > bestScore ? l as Level : best;
  }, null);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
          <Text style={[styles.headerTitle, { color: c.text }]}>Strength Standards</Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator
      >
        {/* Summary card */}
        <View style={[styles.summaryCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: c.text }]}>{coveredExercises.length}</Text>
              <Text style={[styles.summaryLbl, { color: c.muted }]}>Exercises Tracked</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: c.border }]} />
            <View style={styles.summaryItem}>
              {topLevel ? (
                <>
                  <Text style={[styles.summaryVal, { color: LEVEL_COLORS[topLevel] }]}>{topLevel}</Text>
                  <Text style={[styles.summaryLbl, { color: c.muted }]}>Best Level</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.summaryVal, { color: c.muted }]}>—</Text>
                  <Text style={[styles.summaryLbl, { color: c.muted }]}>Best Level</Text>
                </>
              )}
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: c.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryVal, { color: c.text }]}>{BW_KG} kg</Text>
              <Text style={[styles.summaryLbl, { color: c.muted }]}>Body Weight</Text>
            </View>
          </View>
          <Text style={[styles.bwNote, { color: c.muted }]}>
            Standards based on 80 kg bodyweight · tap row to expand
          </Text>
        </View>

        {/* Level legend */}
        <View style={styles.legendRow}>
          {LEVELS.map(l => (
            <View key={l} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: LEVEL_COLORS[l] }]} />
              <Text style={[styles.legendLabel, { color: c.muted }]}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Standards */}
        {STANDARDS.map(standard => (
          <StandardRow
            key={standard.exercise}
            standard={standard}
            e1rm={bestE1rm[standard.exercise] ?? null}
            bw={BW_KG}
            unit={unit}
            accent={accent}
            cardColor={c.card}
            borderColor={c.border}
            textColor={c.text}
            mutedColor={c.muted}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  headerTitle: { fontFamily: F.bold, fontSize: 17 },
  scroll: { paddingHorizontal: PAGE_PADDING_H, gap: CARD_GAP },
  summaryCard: {
    borderRadius: CARD_RADIUS,
    borderWidth: 0.5,
    padding: 16,
    gap: 10,
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center', gap: 2 },
  summaryVal: { fontFamily: F.bold, fontSize: 20, letterSpacing: -0.3 },
  summaryLbl: { fontFamily: F.regular, fontSize: 11 },
  summaryDivider: { width: 1, height: 36 },
  bwNote: { fontFamily: F.regular, fontSize: 11, textAlign: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontFamily: F.medium, fontSize: 11 },
});

