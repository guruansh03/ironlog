import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useAppTheme } from '../../theme/ThemeContext';

interface Props {
  size?: number;
  strokeWidth?: number;
  progress: number;
  color?: string;
  trackColor?: string;
  innerColor?: string;
}

/**
 * Circular progress ring.
 * Web: uses conic-gradient CSS.
 * Native: uses rotated half-circle clips.
 */
export default function ProgressRing({
  size = 56,
  strokeWidth = 5,
  progress,
  color = '#1A1A1A',
  trackColor = '#DDDDE0',
  innerColor,
}: Props) {
  const { theme: t } = useAppTheme();
  const p = Math.min(1, Math.max(0, progress));
  const inner = size - strokeWidth * 2;
  const centerBg = innerColor ?? t.surface;

  if (Platform.OS === 'web') {
    // Web: use conic-gradient (reliable and clean)
    const deg = Math.round(p * 360);
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            background: `conic-gradient(${color} ${deg}deg, ${trackColor} ${deg}deg)`,
          } as any,
          styles.webRing,
        ]}
      >
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: centerBg,
          }}
        />
      </View>
    );
  }

  // Native fallback: rotated half-circles
  const halfSize = size / 2;
  const rightDeg = p <= 0.5 ? p * 360 : 180;
  const leftDeg = p > 0.5 ? (p - 0.5) * 360 : 0;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Track */}
      <View style={{
        position: 'absolute', width: size, height: size,
        borderRadius: halfSize, borderWidth: strokeWidth, borderColor: trackColor,
      }} />

      {/* Right half */}
      <View style={{
        position: 'absolute', width: halfSize, height: size,
        left: halfSize, overflow: 'hidden',
      }}>
        <View style={{
          width: size, height: size, borderRadius: halfSize,
          borderWidth: strokeWidth, borderColor: color,
          position: 'absolute', left: -halfSize,
          borderTopColor: 'transparent', borderRightColor: 'transparent',
          transform: [{ rotate: `${rightDeg}deg` }],
        }} />
      </View>

      {/* Left half */}
      <View style={{
        position: 'absolute', width: halfSize, height: size,
        left: 0, overflow: 'hidden',
      }}>
        <View style={{
          width: size, height: size, borderRadius: halfSize,
          borderWidth: strokeWidth, borderColor: color,
          position: 'absolute', left: 0,
          borderTopColor: 'transparent', borderRightColor: 'transparent',
          transform: [{ rotate: `${leftDeg}deg` }],
        }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  webRing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
