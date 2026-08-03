import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { STATUS } from '../../theme/tokens';

type Variant = keyof typeof STATUS;

interface Props {
  variant: Variant;
  label: string;
}

export default function StatusPill({ variant, label }: Props) {
  const s = STATUS[variant];
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <Text style={styles.icon}>{s.icon}</Text>
      <Text style={[styles.label, { color: s.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  icon: { fontSize: 11 },
  label: { fontSize: 11, fontWeight: '600' },
});
