// ─── HistoryCard ─────────────────────────────────────────────────────────────
// surface bg, icon+name+date+chevron top; 3-stat row (DM Mono val, 10/ink3 label)

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';

const AnimPressable = Animated.createAnimatedComponent(Pressable);

interface Stat {
  value: string;
  label: string;
}

interface Props {
  icon?: string;
  name: string;
  date: string;
  stats: Stat[];
  onPress?: () => void;
  style?: ViewStyle;
}

export default function HistoryCard({ icon, name, date, stats, onPress, style }: Props) {
  const { theme: t } = useAppTheme();
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 300 }); }}
      style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, t.shadowTile as any, animStyle, style]}
    >
      {/* Top: icon + name + date + chevron */}
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: t.surface2 }]}>
          <Ionicons name={(icon || 'barbell') as any} size={16} color={t.ink3} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.name, { color: t.ink }]}>{name}</Text>
          <Text style={[styles.date, { color: t.ink3 }]}>{date}</Text>
        </View>
        <Ionicons name="chevron-forward" size={14} color={t.ink4} />
      </View>

      {/* Bottom: stats row */}
      {stats.length > 0 && (
        <View style={[styles.statsRow, { borderTopColor: t.surface2 }]}>
          {stats.map((s, i) => (
            <View key={i} style={styles.statCol}>
              <Text style={[styles.statVal, { color: t.ink }]}>{s.value}</Text>
              <Text style={[styles.statLbl, { color: t.ink3 }]}>{s.label}</Text>
            </View>
          ))}
        </View>
      )}
    </AnimPressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 8,
    borderWidth: 1,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCol: {
    flex: 1,
  },
  name: {
    fontFamily: F.semibold,
    fontSize: 14,
  },
  date: {
    fontFamily: F.regular,
    fontSize: 11.5,
    marginTop: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderTopWidth: 1,
  },
  statCol: {
    alignItems: 'center',
  },
  statVal: {
    fontFamily: F.mono,
    fontSize: 14,
    fontWeight: '700',
  },
  statLbl: {
    fontFamily: F.regular,
    fontSize: 10,
    marginTop: 2,
  },
});
