// ─── NavBar ──────────────────────────────────────────────────────────────────
// Top nav: title 30/700/ink, optional subtitle 13/400/ink3, right slot

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';

interface NavBarProps {
  title: string;
  subtitle?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  style?: ViewStyle;
  noPadTop?: boolean;
}

export default function NavBar({ title, subtitle, left, right, style, noPadTop }: NavBarProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();

  return (
    <View style={[styles.root, { paddingTop: noPadTop ? 0 : insets.top + 10 }, style]}>
      <View style={styles.row}>
        {left ? <View style={styles.leftSlot}>{left}</View> : null}
        <View style={styles.textCol}>
          <Text
            style={[styles.title, { color: theme.ink }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.72}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.ink3 }]}>{subtitle}</Text>
          ) : null}
        </View>
        {right ? <View style={styles.rightSlot}>{right}</View> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSlot: {
    marginRight: 12,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 30,
    letterSpacing: -0.7,
    lineHeight: 34,
    flexShrink: 1,
  },
  subtitle: {
    fontFamily: F.regular,
    fontSize: 13,
    marginTop: 2,
  },
  rightSlot: {
    marginLeft: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
});
