import React, { memo, useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

type StaggerItemProps = {
  index: number;
  children: React.ReactNode;
  style?: any;
};

function StaggerItem({ index, children, style }: StaggerItemProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    const cappedIndex = Math.min(index, 6);
    progress.value = withDelay(
      cappedIndex * 50,
      withTiming(1, {
        duration: 280,
        easing: Easing.out(Easing.quad),
      })
    );
  }, [index, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 10 * (1 - progress.value) }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}

export default memo(StaggerItem);
