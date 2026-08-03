// Minimal Jest setup for React Native / Expo unit tests
jest.mock('react-native', () => ({
  Platform: { OS: 'ios', select: jest.fn((obj) => obj.ios) },
  Dimensions: { get: jest.fn(() => ({ width: 375, height: 812 })) },
  StyleSheet: { create: (styles) => styles },
}));

jest.mock('react-native-reanimated', () => ({
  useSharedValue: (v) => ({ value: v }),
  useAnimatedStyle: () => ({}),
  withSpring: (v) => v,
  withTiming: (v) => v,
}));

jest.mock('expo-modules-core', () => ({}));
