// ─── GradientTile ────────────────────────────────────────────────────────────
// Home dashboard tile with LinearGradient bg, grain overlay, radial highlight,
// sparkline SVG position BR, scale(0.96) press animation.

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useAppTheme } from '../../theme/ThemeContext';
import { Theme } from '../../theme/themes';

interface TileProps {
  gradient: [string, string];
  fg: string;
  fg2: string;
  onPress?: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}

const AnimPressable = Animated.createAnimatedComponent(Pressable);

export default function GradientTile({ gradient, fg, fg2, onPress, children, style }: TileProps) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = useCallback(() => {
    scale.value = withSpring(0.96, { damping: 20, stiffness: 300 });
  }, []);

  const onPressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 20, stiffness: 300 });
  }, []);

  return (
    <AnimPressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.outer, animStyle, style]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Radial highlight TL */}
        <View style={styles.radialHighlight} />
        {children}
      </LinearGradient>
    </AnimPressable>
  );
}

const styles = StyleSheet.create({
  outer: {
    width: '48.5%',
    minHeight: 135,
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: 14,
    paddingBottom: 13,
    position: 'relative',
  },
  radialHighlight: {
    position: 'absolute',
    top: -20,
    left: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
});
