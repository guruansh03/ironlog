// ─── SplitCard ───────────────────────────────────────────────────────────────
// icon+name+subtitle+chevron; day-pills row, next day = accent

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';

interface DayPill {
  name: string;
  isNext?: boolean;
  isDone?: boolean;
}

interface Props {
  icon?: string;
  name: string;
  subtitle?: string;
  days?: DayPill[];
  onPress?: () => void;
  style?: ViewStyle;
}

export default function SplitCard({ icon, name, subtitle, days, onPress, style }: Props) {
  const { theme: t } = useAppTheme();

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }, t.shadowTile as any, style]}
    >
      <View style={styles.top}>
        <View style={[styles.iconWrap, { backgroundColor: t.surface2 }]}>
          <Ionicons name={(icon || 'calendar') as any} size={16} color={t.ink3} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.name, { color: t.ink }]}>{name}</Text>
          {subtitle ? <Text style={[styles.sub, { color: t.ink3 }]}>{subtitle}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={14} color={t.ink4} />
      </View>

      {days && days.length > 0 && (
        <View style={[styles.daysRow, { borderTopColor: t.surface2 }]}>
          {days.map((d, i) => (
            <View key={i} style={[styles.dayPill, { backgroundColor: t.surface2 }]}>
              <Text style={[styles.dayName, { color: t.ink3 }]}>{d.name}</Text>
              <Text
                style={[
                  styles.dayStatus,
                  { color: d.isNext ? t.accent : t.ink3 },
                ]}
              >
                {d.isDone ? '✓' : d.isNext ? 'Next' : '—'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 10,
    borderWidth: 1,
  },
  top: {
    padding: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textCol: { flex: 1 },
  name: { fontFamily: F.semibold, fontSize: 14 },
  sub: { fontFamily: F.regular, fontSize: 11.5, marginTop: 1 },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    paddingBottom: 13,
    borderTopWidth: 1,
  },
  dayPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 4,
    borderRadius: 9,
  },
  dayName: { fontFamily: F.regular, fontSize: 10, marginBottom: 3 },
  dayStatus: { fontFamily: F.semibold, fontSize: 12 },
});
