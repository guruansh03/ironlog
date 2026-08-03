// ─── SectionHeader ───────────────────────────────────────────────────────────
// 11px/600/ink3, uppercase, letterSpacing 0.08em

import React from 'react';
import { Text, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';

interface Props {
  label: string;
  style?: ViewStyle;
}

export default function SectionHeader({ label, style }: Props) {
  const { theme } = useAppTheme();
  return (
    <Text style={[styles.text, { color: theme.ink3 }, style]}>{label}</Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 9,
  },
});
