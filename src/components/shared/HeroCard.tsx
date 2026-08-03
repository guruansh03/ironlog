// ─── HeroCard ────────────────────────────────────────────────────────────────
// LinearGradient heroBg, decorative circle TR, tag/name/stats layout.

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';
import { getReadableTextColor } from '../../theme/contrast';

interface Stat {
  value: string;
  label: string;
}

interface Props {
  tag?: string;
  name: string;
  date?: string;
  stats: Stat[];
  style?: ViewStyle;
}

export default function HeroCard({ tag, name, date, stats, style }: Props) {
  const { theme: t } = useAppTheme();
  const heroText = getReadableTextColor(t.heroBg[0]);
  const heroMuted = heroText === '#FFFFFF' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)';
  const heroSoft = heroText === '#FFFFFF' ? 'rgba(255,255,255,0.38)' : 'rgba(0,0,0,0.38)';
  const decoTint = heroText === '#FFFFFF' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';

  return (
    <LinearGradient
      colors={t.heroBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {/* Decorative circle TR */}
      <View style={[styles.decoCircle, { backgroundColor: decoTint }]} />

      {tag ? <Text style={[styles.tag, { color: heroMuted }]}>{tag}</Text> : null}
      <Text style={[styles.name, { color: heroText }]}>{name}</Text>
      {date ? <Text style={[styles.date, { color: heroSoft }]}>{date}</Text> : null}

      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <View key={i} style={styles.statCol}>
            <Text style={[styles.statVal, { color: heroText }]}>{s.value}</Text>
            <Text style={[styles.statLbl, { color: heroSoft }]}>{s.label}</Text>
          </View>
        ))}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 16,
    paddingHorizontal: 18,
    paddingBottom: 18,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  decoCircle: {
    position: 'absolute',
    right: -30,
    top: -30,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  tag: {
    fontFamily: F.semibold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  name: {
    fontFamily: F.bold,
    fontSize: 19,
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  date: {
    fontFamily: F.regular,
    fontSize: 11.5,
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statCol: {},
  statVal: {
    fontFamily: F.mono,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  statLbl: {
    fontFamily: F.regular,
    fontSize: 10,
    marginTop: 2,
  },
});
