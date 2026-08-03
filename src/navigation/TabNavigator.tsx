// ─── Themed Tab Navigator ────────────────────────────────────────────────────
// bg=surface, top border=border. Active: pill bg=tabActiveBg + white icon.
// Inactive: ink4 icon. 6 tabs: Home · Gym · Habits · Nutrition · Notes · Me

import React, { useEffect } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import { getReadableTextColor } from '../theme/contrast';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import HomeScreen from '../screens/HomeScreen';
import NotesScreen from '../screens/NotesScreen';
import GymHomeScreen from '../screens/gym/GymHomeScreen';
import HabitsScreen from '../screens/HabitsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { createLazyScreen } from '../components/app/LazyScreen';
import { SkeletonCard } from '../components/ui/SkeletonLoader';

const Tab = createBottomTabNavigator();
const NutritionScreen = createLazyScreen(
  () => import('../screens/NutritionScreen'),
  (
    <View style={{ flex: 1, paddingHorizontal: 15, paddingTop: 16, gap: 10 }}>
      <SkeletonCard lines={3} />
      <SkeletonCard lines={3} />
      <SkeletonCard lines={2} />
    </View>
  )
);

const TABS = [
  { name: 'Home',     icon: 'home',              label: 'Home' },
  { name: 'Gym',      icon: 'barbell',           label: 'Gym' },
  { name: 'Habits',   icon: 'checkmark-circle',  label: 'Habits' },
  { name: 'Nutrition', icon: 'nutrition',        label: 'Nutrition' },
  { name: 'Notes',    icon: 'document-text',     label: 'Notes' },
  { name: 'Settings', icon: 'person',            label: 'Me' },
];

const COMPONENTS: Record<string, any> = {
  Home: HomeScreen,
  Gym: GymHomeScreen,
  Habits: HabitsScreen,
  Nutrition: NutritionScreen,
  Notes: NotesScreen,
  Settings: SettingsScreen,
};

const TAB_MAP = Object.fromEntries(TABS.map((t) => [t.name, t]));

function TabBarItem({
  tab,
  focused,
  onPress,
}: {
  tab: { name: string; icon: string; label: string };
  focused: boolean;
  onPress: () => void;
}) {
  const { theme: t } = useAppTheme();
  const iconScale = useSharedValue(focused ? 1.1 : 1);

  useEffect(() => {
    iconScale.value = withSpring(focused ? 1.1 : 1, { damping: 20, stiffness: 250 });
  }, [focused, iconScale]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  return (
    <AnimatedPressable onPress={onPress} style={styles.tab}>
      {focused ? (
        <Animated.View style={[styles.activePill, { backgroundColor: t.tabActiveBg }, iconStyle]}>
          <Ionicons
            name={tab.icon as any}
            size={16}
            color={getReadableTextColor(t.tabActiveBg)}
          />
        </Animated.View>
      ) : (
        <Animated.View style={iconStyle}>
          <Ionicons
            name={(tab.icon + '-outline') as any}
            size={18}
            color={t.ink4}
          />
        </Animated.View>
      )}
      <Text
        style={[
          styles.label,
          {
            color: focused ? t.tabActiveBg : t.ink4,
            fontWeight: focused ? '700' : '500',
          },
        ]}
      >
        {tab.label}
      </Text>
    </AnimatedPressable>
  );
}

function ThemedTabBar({ state, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { theme: t } = useAppTheme();

  return (
    <View style={[styles.outer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={[styles.bar, { backgroundColor: t.surface, borderTopColor: t.border }]}>
        {state.routes.map((route: any, i: number) => {
          const focused = state.index === i;
          const tab = TAB_MAP[route.name];
          if (!tab) return null;
          return (
            <TabBarItem
              key={route.key}
              tab={tab}
              focused={focused}
              onPress={() => navigation.navigate(route.name)}
            />
          );
        })}
      </View>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <ThemedTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {TABS.map((tab) => (
        <Tab.Screen key={tab.name} name={tab.name} component={COMPONENTS[tab.name]} />
      ))}
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
  },
  bar: {
    flexDirection: 'row',
    width: '100%',
    paddingHorizontal: 8,
    paddingTop: 6,
    paddingBottom: 2,
    borderTopWidth: 0.5,
  },
  tab: {
    flex: 1,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  activePill: {
    width: 36,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: F.medium,
    fontSize: 9.5,
  },
});


