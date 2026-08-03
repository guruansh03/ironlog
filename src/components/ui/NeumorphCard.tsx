import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  size?: 'sm' | 'md' | 'lg';
  pressed?: boolean;
}

export default function NeumorphCard({ children, style, size = 'md', pressed }: Props) {
  const { colors: c, neu } = useTheme();
  
  const shadowDark = size === 'sm' ? neu.darkShadowSm : neu.darkShadow;
  const radius = size === 'sm' ? RADIUS.md : size === 'lg' ? RADIUS.xl : RADIUS.lg;

  return (
    <View style={[
      styles.card,
      { borderRadius: radius, backgroundColor: c.card },
      !pressed && shadowDark,
      pressed && neu.insetShadow,
      style,
    ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
  },
});
