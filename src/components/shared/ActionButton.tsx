// ─── ActionButton ────────────────────────────────────────────────────────────
// surface bg, rounded-13, shadow, icon + label 13.5/600/ink

import React, { useCallback } from 'react';
import { Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';

const AnimPressable = Animated.createAnimatedComponent(Pressable);

interface Props {
  icon?: string;
  label: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export default function ActionButton({ icon, label, onPress, style }: Props) {
  const { theme } = useAppTheme();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, { damping: 20, stiffness: 300 }); }}
      onPressOut={() => { scale.value = withSpring(1, { damping: 20, stiffness: 300 }); }}
      style={[
        styles.btn,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
        },
        theme.shadowTile as any,
        animStyle,
        style,
      ]}
    >
      {icon ? (
        <Ionicons name={icon as any} size={16} color={theme.ink} style={{ marginRight: 8 }} />
      ) : null}
      <Text style={[styles.label, { color: theme.ink }]}>{label}</Text>
    </AnimPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 13,
    padding: 12,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 10,
  },
  label: {
    fontFamily: F.semibold,
    fontSize: 13.5,
  },
});
