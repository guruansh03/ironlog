import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Svg, {
  Path,
  Circle,
  Ellipse,
  Rect,
  G,
} from 'react-native-svg';
import { subDays, parseISO, isAfter } from 'date-fns';

import { useAppTheme } from '../../theme/ThemeContext';
import { useGymStore } from '../../store/gymStore';
import { F } from '../../theme/fonts';
import { PAGE_PADDING_H, CARD_RADIUS, CARD_GAP } from '../../theme/spacing';
import AnimatedPressable from '../../components/animations/AnimatedPressable';

const { width: SW } = Dimensions.get('window');
const CARD_W = SW - PAGE_PADDING_H * 2;

// ─── Muscle → SVG region mapping ─────────────────────────────────────────────
// Front & back body drawn as simplified SVG paths at 200×400 viewBox

type MuscleKey =
  | 'Chest' | 'Shoulders' | 'Biceps' | 'Forearms' | 'Abs' | 'Quads' | 'Calves'
  | 'Back' | 'Triceps' | 'Traps' | 'Glutes' | 'Hamstrings';

// Maps gymStore muscleGroup strings to canonical keys
const ALIAS: Record<string, MuscleKey> = {
  Chest: 'Chest',
  Shoulders: 'Shoulders',
  Biceps: 'Biceps',
  Triceps: 'Triceps',
  Forearms: 'Forearms',
  Abs: 'Abs',
  Core: 'Abs',
  Quads: 'Quads',
  Calves: 'Calves',
  Back: 'Back',
  Traps: 'Traps',
  Glutes: 'Glutes',
  Hamstrings: 'Hamstrings',
};

function heatColor(freq: number, max: number, accent: string): string {
  if (freq === 0) return 'rgba(120,120,120,0.18)';
  const t = max > 0 ? Math.min(freq / max, 1) : 0;
  // interpolate from accent at 25% opacity → accent at 95% opacity
  const alpha = 0.22 + t * 0.73;
  // parse hex accent
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// ─── Front body SVG ──────────────────────────────────────────────────────────

function FrontBody({ freqMap, max, accent }: { freqMap: Partial<Record<MuscleKey, number>>; max: number; accent: string }) {
  const c = (m: MuscleKey) => heatColor(freqMap[m] ?? 0, max, accent);
  return (
    <Svg width="140" height="290" viewBox="0 0 140 290">
      {/* Head */}
      <Circle cx="70" cy="20" r="16" fill="rgba(150,150,150,0.25)" stroke="rgba(150,150,150,0.4)" strokeWidth="1" />
      {/* Neck */}
      <Rect x="63" y="34" width="14" height="12" rx="4" fill="rgba(150,150,150,0.2)" />
      {/* Traps (front) */}
      <Path d="M54 44 Q70 50 86 44 L90 56 Q70 62 50 56 Z" fill={c('Traps')} />
      {/* Shoulders */}
      <Ellipse cx="43" cy="62" rx="14" ry="12" fill={c('Shoulders')} />
      <Ellipse cx="97" cy="62" rx="14" ry="12" fill={c('Shoulders')} />
      {/* Chest */}
      <Path d="M54 56 Q70 60 86 56 L88 84 Q70 90 52 84 Z" fill={c('Chest')} />
      {/* Abs */}
      <Path d="M56 84 Q70 88 84 84 L82 138 Q70 142 58 138 Z" fill={c('Abs')} />
      {/* Biceps */}
      <Path d="M30 68 Q24 68 22 82 Q20 94 26 98 L34 98 Q38 90 36 76 Z" fill={c('Biceps')} />
      <Path d="M110 68 Q116 68 118 82 Q120 94 114 98 L106 98 Q102 90 104 76 Z" fill={c('Biceps')} />
      {/* Forearms */}
      <Path d="M22 100 Q20 116 22 130 L30 130 Q32 116 34 100 Z" fill={c('Forearms')} />
      <Path d="M118 100 Q120 116 118 130 L110 130 Q108 116 106 100 Z" fill={c('Forearms')} />
      {/* Quads */}
      <Path d="M56 142 Q52 142 50 160 Q48 178 52 200 L66 200 Q68 178 68 160 Q68 142 62 142 Z" fill={c('Quads')} />
      <Path d="M84 142 Q88 142 90 160 Q92 178 88 200 L74 200 Q72 178 72 160 Q72 142 78 142 Z" fill={c('Quads')} />
      {/* Calves (front shin) */}
      <Path d="M52 202 Q50 220 52 246 L64 246 Q66 220 66 202 Z" fill={c('Calves')} />
      <Path d="M88 202 Q90 220 88 246 L76 246 Q74 220 74 202 Z" fill={c('Calves')} />
      {/* Body outline */}
      <Path
        d="M54 44 Q38 48 30 56 L22 68 L18 100 L22 132 L30 146 L50 142 L56 142 L58 138 L82 138 L84 142 L90 142 L110 146 L118 132 L122 100 L118 68 L110 56 Q102 48 86 44 Q70 50 54 44 Z"
        fill="none"
        stroke="rgba(150,150,150,0.3)"
        strokeWidth="1"
      />
      {/* Legs outline */}
      <Path d="M50 142 L50 200 L66 200 L68 142 Z" fill="none" stroke="rgba(150,150,150,0.25)" strokeWidth="0.8" />
      <Path d="M72 142 L74 200 L90 200 L90 142 Z" fill="none" stroke="rgba(150,150,150,0.25)" strokeWidth="0.8" />
      <Path d="M50 200 L52 248 L64 248 L66 200 Z" fill="none" stroke="rgba(150,150,150,0.25)" strokeWidth="0.8" />
      <Path d="M74 200 L76 248 L88 248 L90 200 Z" fill="none" stroke="rgba(150,150,150,0.25)" strokeWidth="0.8" />
    </Svg>
  );
}

// ─── Back body SVG ───────────────────────────────────────────────────────────

function BackBody({ freqMap, max, accent }: { freqMap: Partial<Record<MuscleKey, number>>; max: number; accent: string }) {
  const c = (m: MuscleKey) => heatColor(freqMap[m] ?? 0, max, accent);
  return (
    <Svg width="140" height="290" viewBox="0 0 140 290">
      {/* Head */}
      <Circle cx="70" cy="20" r="16" fill="rgba(150,150,150,0.25)" stroke="rgba(150,150,150,0.4)" strokeWidth="1" />
      {/* Neck */}
      <Rect x="63" y="34" width="14" height="12" rx="4" fill="rgba(150,150,150,0.2)" />
      {/* Traps */}
      <Path d="M54 44 Q70 52 86 44 L94 60 Q70 68 46 60 Z" fill={c('Traps')} />
      {/* Shoulders (rear delt) */}
      <Ellipse cx="42" cy="66" rx="14" ry="11" fill={c('Shoulders')} />
      <Ellipse cx="98" cy="66" rx="14" ry="11" fill={c('Shoulders')} />
      {/* Back (lats + mid) */}
      <Path d="M54 60 Q70 64 86 60 L92 100 Q70 108 48 100 Z" fill={c('Back')} />
      <Path d="M52 100 Q70 106 88 100 L86 138 Q70 142 54 138 Z" fill={c('Back')} />
      {/* Triceps */}
      <Path d="M28 68 Q22 70 20 84 Q18 96 24 100 L32 100 Q36 92 34 78 Z" fill={c('Triceps')} />
      <Path d="M112 68 Q118 70 120 84 Q122 96 116 100 L108 100 Q104 92 106 78 Z" fill={c('Triceps')} />
      {/* Forearms back */}
      <Path d="M20 102 Q18 116 20 130 L28 130 Q30 116 32 102 Z" fill={c('Forearms')} />
      <Path d="M120 102 Q122 116 120 130 L112 130 Q110 116 108 102 Z" fill={c('Forearms')} />
      {/* Glutes */}
      <Path d="M54 138 Q52 142 50 160 L70 162 L90 160 Q88 142 86 138 Q70 144 54 138 Z" fill={c('Glutes')} />
      {/* Hamstrings */}
      <Path d="M50 162 Q48 180 52 200 L66 200 Q68 180 68 162 Z" fill={c('Hamstrings')} />
      <Path d="M72 162 Q72 180 74 200 L88 200 Q92 180 90 162 Z" fill={c('Hamstrings')} />
      {/* Calves */}
      <Path d="M52 202 Q50 222 54 246 L64 246 Q66 222 66 202 Z" fill={c('Calves')} />
      <Path d="M88 202 Q90 222 86 246 L76 246 Q74 222 74 202 Z" fill={c('Calves')} />
      {/* Outlines */}
      <Path
        d="M54 44 Q38 50 28 58 L20 70 L16 102 L20 132 L30 148 L50 142 L54 138 L86 138 L90 142 L110 148 L120 132 L124 102 L120 70 L112 58 Q102 50 86 44 Q70 52 54 44 Z"
        fill="none"
        stroke="rgba(150,150,150,0.3)"
        strokeWidth="1"
      />
    </Svg>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend({ accent }: { accent: string }) {
  const steps = [0, 0.25, 0.5, 0.75, 1];
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  return (
    <View style={legendStyles.row}>
      <Text style={legendStyles.label}>Low</Text>
      {steps.map((t) => (
        <View
          key={t}
          style={[
            legendStyles.swatch,
            { backgroundColor: t === 0 ? 'rgba(120,120,120,0.18)' : `rgba(${r},${g},${b},${0.22 + t * 0.73})` },
          ]}
        />
      ))}
      <Text style={legendStyles.label}>High</Text>
    </View>
  );
}
const legendStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 10 },
  swatch: { width: 22, height: 14, borderRadius: 4 },
  label: { fontFamily: F.medium, fontSize: 11, color: 'rgba(120,120,120,0.9)' },
});

// ─── Muscle Rank List ─────────────────────────────────────────────────────────

function MuscleRankRow({ rank, name, sets, max, accent, textColor, mutedColor }: {
  rank: number; name: string; sets: number; max: number; accent: string; textColor: string; mutedColor: string;
}) {
  const r = parseInt(accent.slice(1, 3), 16);
  const g = parseInt(accent.slice(3, 5), 16);
  const b = parseInt(accent.slice(5, 7), 16);
  const t = max > 0 ? sets / max : 0;
  const bar = Math.max(t * 100, 4);
  return (
    <View style={rankStyles.row}>
      <Text style={[rankStyles.rank, { color: mutedColor }]}>#{rank}</Text>
      <View style={{ flex: 1 }}>
        <View style={rankStyles.nameRow}>
          <Text style={[rankStyles.name, { color: textColor }]}>{name}</Text>
          <Text style={[rankStyles.sets, { color: mutedColor }]}>{sets} sets</Text>
        </View>
        <View style={rankStyles.track}>
          <View style={[rankStyles.bar, { width: `${bar}%`, backgroundColor: `rgba(${r},${g},${b},${0.4 + t * 0.55})` }]} />
        </View>
      </View>
    </View>
  );
}
const rankStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  rank: { fontFamily: F.bold, fontSize: 12, color: 'rgba(120,120,120,0.7)', minWidth: 24 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontFamily: F.semibold, fontSize: 13.5 },
  sets: { fontFamily: F.medium, fontSize: 12, color: 'rgba(120,120,120,0.8)' },
  track: { height: 6, backgroundColor: 'rgba(120,120,120,0.15)', borderRadius: 3, overflow: 'hidden' },
  bar: { height: 6, borderRadius: 3 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PERIODS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: 'All', days: 9999 },
];

export default function MuscleHeatmapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme: t } = useAppTheme();
  const { sessions } = useGymStore();
  const [periodIdx, setPeriodIdx] = useState(1);
  const accent = t.accent;

  const freqData = useMemo(() => {
    const cutoff = subDays(new Date(), PERIODS[periodIdx].days);
    const filtered = sessions.filter(s => {
      if (PERIODS[periodIdx].days >= 9999) return true;
      return isAfter(parseISO(s.startedAt), cutoff);
    });

    const setCount: Partial<Record<MuscleKey, number>> = {};
    for (const session of filtered) {
      for (const ex of session.exercises) {
        const key = ALIAS[ex.muscleGroup];
        if (!key) continue;
        const validSets = ex.sets.filter(s => s.weight > 0 && s.reps > 0).length;
        setCount[key] = (setCount[key] ?? 0) + validSets;
      }
    }
    return setCount;
  }, [sessions, periodIdx]);

  const maxFreq = useMemo(() => Math.max(...Object.values(freqData).map(v => v ?? 0), 1), [freqData]);

  const rankList = useMemo(() => {
    return Object.entries(freqData)
      .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
      .slice(0, 8)
      .map(([name, sets]) => ({ name, sets: sets ?? 0 }));
  }, [freqData]);

  const c = {
    bg: t.bg,
    card: t.surface,
    border: t.border,
    text: t.ink,
    muted: t.ink3,
    chip: t.chipActiveBg,
  };

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
          <Text style={[styles.headerTitle, { color: c.text }]}>Muscle Heatmap</Text>
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator
      >
        {/* Period chips */}
        <View style={styles.chipRow}>
          {PERIODS.map((p, i) => (
            <Pressable
              key={p.label}
              onPress={() => setPeriodIdx(i)}
              style={[
                styles.chip,
                { borderColor: c.border },
                i === periodIdx && { backgroundColor: accent },
              ]}
            >
              <Text style={[styles.chipText, { color: i === periodIdx ? '#fff' : c.muted }]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Body silhouettes */}
        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={styles.bodiesRow}>
            <View style={styles.bodyCol}>
              <Text style={[styles.bodyLabel, { color: c.muted }]}>FRONT</Text>
              <FrontBody freqMap={freqData} max={maxFreq} accent={accent} />
            </View>
            <View style={styles.bodyCol}>
              <Text style={[styles.bodyLabel, { color: c.muted }]}>BACK</Text>
              <BackBody freqMap={freqData} max={maxFreq} accent={accent} />
            </View>
          </View>
          <Legend accent={accent} />
        </View>

        {/* Rank list */}
        {rankList.length > 0 ? (
          <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
            <Text style={[styles.sectionTitle, { color: c.muted }]}>MOST TRAINED</Text>
            {rankList.map((item, i) => (
              <MuscleRankRow
                key={item.name}
                rank={i + 1}
                name={item.name}
                sets={item.sets}
                max={rankList[0].sets}
                accent={accent}
                textColor={c.text}
                mutedColor={c.muted}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.card, styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
            <Ionicons name="barbell-outline" size={32} color={c.muted} />
            <Text style={[styles.emptyText, { color: c.muted }]}>No workouts in this period</Text>
          </View>
        )}
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
  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontFamily: F.semibold, fontSize: 13 },
  card: {
    borderRadius: CARD_RADIUS,
    borderWidth: 0.5,
    padding: 16,
  },
  bodiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  bodyCol: { alignItems: 'center', gap: 8 },
  bodyLabel: { fontFamily: F.semibold, fontSize: 10.5, letterSpacing: 0.5 },
  sectionTitle: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  emptyCard: { alignItems: 'center', gap: 10, paddingVertical: 32 },
  emptyText: { fontFamily: F.medium, fontSize: 14 },
});

