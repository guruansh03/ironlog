import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

interface Props {
  name: string;
  size?: number;
  accent?: string;
}

export default function InitialsAvatar({ name, size = 40 }: Props) {
  const { theme: t } = useAppTheme();
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

  return (
    <View
      style={[
        styles.avatar,
        t.shadowTile,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: t.surface2,
        },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.36, color: t.ink }]}>
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '800',
    letterSpacing: 1,
  },
});
