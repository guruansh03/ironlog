import React, { memo, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { useTheme } from '../../../theme/useTheme';

interface SparkBarProps {
  data?: number[];
  width?: number;
  height?: number;
  skeleton?: boolean;
  color?: string;
  mutedColor?: string;
}

function SparkBar({ data = [], width = 70, height = 50, skeleton = false, color, mutedColor }: SparkBarProps) {
  const { colors: c } = useTheme();
  const values = data.length > 1 ? data.slice(-7) : [0.2, 0.3, 0.4, 0.5, 0.42, 0.6, 0.7];
  const max = Math.max(...values, 1);
  const barCount = values.length;
  const gap = 4;
  const barWidth = (width - gap * (barCount - 1)) / barCount;

  if (skeleton) {
    return (
      <View style={[styles.wrap, { width, height, alignItems: 'flex-end', gap: 6 }]}> 
        {[0, 1, 2].map((key) => (
          <View key={key} style={{ width: barWidth * 1.6, height: height * 0.3, borderRadius: 4, backgroundColor: c.donutTrack }} />
        ))}
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { width, height, gap }]}> 
      {values.map((value, index) => {
        const normalized = value / max;
        const isCurrent = index === values.length - 1;
        return (
          <AnimatedBar
            key={`${index}-${value}`}
            index={index}
            targetHeight={Math.max(10, normalized * height)}
            width={barWidth}
            color={isCurrent ? color ?? c.chartStroke : mutedColor ?? c.textLabel}
            opacity={isCurrent ? 1 : 0.5}
          />
        );
      })}
    </View>
  );
}

function AnimatedBar({
  index,
  targetHeight,
  width,
  color,
  opacity,
}: {
  index: number;
  targetHeight: number;
  width: number;
  color: string;
  opacity: number;
}) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withDelay(index * 60, withTiming(1, { duration: 420 }));
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: targetHeight * progress.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          borderRadius: 4,
          backgroundColor: color,
          opacity,
          minHeight: 10,
        },
        animatedStyle,
      ]}
    />
  );
}

export default memo(SparkBar);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
});
