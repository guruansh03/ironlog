// ─── WeekStrip ───────────────────────────────────────────────────────────────
// 7 day pills, active = accentBtn pill + white text, dot indicator 4×4

import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

interface Props {
  activeIndex: number; // 0 = Monday, 6 = Sunday
  dotIndices?: number[]; // indices that have a dot
  onDayPress?: (index: number) => void;
  style?: ViewStyle;
}

export default function WeekStrip({ activeIndex, dotIndices = [], onDayPress, style }: Props) {
  const { theme: t } = useAppTheme();

  return (
    <View style={[styles.row, style]}>
      {DAY_LETTERS.map((letter, i) => {
        const isActive = i === activeIndex;
        const hasDot = dotIndices.includes(i);
        return (
          <Pressable
            key={i}
            onPress={() => onDayPress?.(i)}
            style={[
              styles.pill,
              {
                backgroundColor: isActive ? t.accentBtn : 'transparent',
              },
            ]}
          >
            <Text
              style={[
                styles.letter,
                {
                  color: isActive ? '#FFFFFF' : t.ink3,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {letter}
            </Text>
            {hasDot && (
              <View
                style={[
                  styles.dot,
                  { backgroundColor: isActive ? '#FFFFFF' : t.accent },
                ]}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  pill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  letter: {
    fontFamily: F.medium,
    fontSize: 13,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
