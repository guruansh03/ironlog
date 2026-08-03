import React, { memo, useCallback } from 'react';
import { Pressable, PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedBasePressable = Animated.createAnimatedComponent(Pressable);

type AnimatedPressableProps = PressableProps & {
  children?: React.ReactNode;
  style?: any;
};

function AnimatedPressable({ children, onPressIn, onPressOut, style, ...rest }: AnimatedPressableProps) {
  const scale = useSharedValue(1);

  const handlePressIn = useCallback(
    (event: any) => {
      scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
      onPressIn?.(event);
    },
    [onPressIn, scale]
  );

  const handlePressOut = useCallback(
    (event: any) => {
      scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      onPressOut?.(event);
    },
    [onPressOut, scale]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedBasePressable
      {...rest}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style]}
    >
      {children}
    </AnimatedBasePressable>
  );
}

export default memo(AnimatedPressable);
