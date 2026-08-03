import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/useTheme';
import { typography } from '../../theme/fonts';

interface Props {
  title: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
}

export default function ScreenHeader({ title, right, left }: Props) {
  const insets = useSafeAreaInsets();
  const { colors: c } = useTheme();

  return (
    <View
      style={[
        styles.header,
        { paddingTop: insets.top + 12, backgroundColor: c.headerBg },
      ]}
    >
      {left ? <View style={styles.side}>{left}</View> : <View style={styles.side} />}
      <Text style={[styles.title, { color: c.text }]}>{title}</Text>
      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  title: {
    ...typography.screenTitle,
    letterSpacing: -0.3,
  },
  side: { minWidth: 40, alignItems: 'flex-end' },
});
