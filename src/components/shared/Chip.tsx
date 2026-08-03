// ─── Chip ────────────────────────────────────────────────────────────────────
// active: chipActiveBg + white text; inactive: surface + ink3 + border

import React from 'react';
import { Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';

interface Props {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function Chip({ label, active, onPress, style }: Props) {
  const { theme: t } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? t.chipActiveBg : t.surface,
          borderColor: active ? 'transparent' : t.border,
        },
        style,
      ]}
    >
      <Text style={[styles.label, { color: active ? '#FFFFFF' : t.ink3 }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    paddingVertical: 5.5,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  label: {
    fontFamily: F.medium,
    fontSize: 12.5,
  },
});
