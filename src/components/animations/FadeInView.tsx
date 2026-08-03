import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type FadeInViewProps = {
  children: React.ReactNode;
  style?: any;
};

export default function FadeInView({ children, style }: FadeInViewProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, {
      duration: 280,
      easing: Easing.out(Easing.quad),
    });
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: 12 * (1 - progress.value) }],
  }));

  return <Animated.View style={[animatedStyle, style]}>{children}</Animated.View>;
}
