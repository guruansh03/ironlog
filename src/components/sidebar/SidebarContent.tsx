import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { FONT, FONT_FAMILY, RADIUS } from '../../theme/tokens';
import { useTheme } from '../../theme/useTheme';
import { useUserStore } from '../../store/userStore';
import { useGymStore } from '../../store/gymStore';
import { useHabitStore, isCompletedOn } from '../../store/habitStore';
import InitialsAvatar from '../ui/InitialsAvatar';

interface Props {
  onNavigate: (tab: string, screen?: string) => void;
  onClose: () => void;
}

const MENU = [
  { label: 'Lifetime Stats', icon: 'stats-chart-outline', tab: 'Settings', screen: 'LifetimeStats' },
  { label: 'Custom Split', icon: 'git-branch-outline', tab: 'Gym', screen: 'CreateSplit' },
  { label: 'Future Features', icon: 'sparkles-outline', tab: 'Settings' },
];

export default function SidebarContent({ onNavigate, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const { colors: c, neu } = useTheme();
  const { user } = useUserStore();
  const { sessions } = useGymStore();
  const { habits } = useHabitStore();

  const today = format(new Date(), 'yyyy-MM-dd');
  const totalVolume = sessions.reduce((a, s) => a + s.totalVolume, 0);
  const completedToday = habits.filter((h) => isCompletedOn(h, today)).length;
  const totalWorkouts = sessions.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, backgroundColor: c.bg }]}>
      {/* Close */}
      <TouchableOpacity style={[styles.closeBtn, { backgroundColor: c.cardAlt }]} onPress={onClose} activeOpacity={0.7}>
        <Ionicons name="close" size={22} color={c.text} />
      </TouchableOpacity>

      {/* Profile */}
      <View style={styles.profile}>
        <InitialsAvatar name={user.name || 'You'} size={64} />
        <Text style={[styles.userName, { color: c.text }]}>{user.name || 'Athlete'}</Text>
        <Text style={[styles.userSub, { color: c.textMuted }]}>IronLog</Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow, neu.darkShadow, { backgroundColor: c.card }]}>
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: c.text }]}>{totalWorkouts}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Workouts</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.cardAlt }]} />
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: c.text }]}>{Math.round(totalVolume / 1000)}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Volume</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: c.cardAlt }]} />
        <View style={styles.stat}>
          <Text style={[styles.statVal, { color: c.text }]}>{completedToday}/{habits.length}</Text>
          <Text style={[styles.statLabel, { color: c.textMuted }]}>Habits</Text>
        </View>
      </View>

      {/* Menu */}
      <ScrollView style={styles.menu} showsVerticalScrollIndicator>
        {MENU.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.menuItem}
            onPress={() => {
              if ('screen' in item && item.screen) {
                onNavigate(item.tab as string, item.screen as string);
              } else {
                onNavigate(item.tab as string);
              }
              onClose();
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, neu.darkShadowSm, { backgroundColor: c.card }]}>
              <Ionicons name={item.icon as any} size={18} color={c.text} />
            </View>
            <Text style={[styles.menuLabel, { color: c.text }]}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={14} color={c.textMuted} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Footer */}
      <Text style={[styles.footer, { paddingBottom: insets.bottom + 16, color: c.textMuted }]}>
        IronLog v1.0.0
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  closeBtn: {
    alignSelf: 'flex-end',
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  profile: { alignItems: 'center', gap: 8, marginBottom: 24 },
  userName: { fontSize: FONT.xl, fontWeight: '600', fontFamily: FONT_FAMILY.bold },
  userSub: { fontSize: FONT.sm, fontFamily: FONT_FAMILY.regular },
  statsRow: {
    flexDirection: 'row',
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 24,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statVal: { fontSize: FONT.xl, fontWeight: '700', fontFamily: FONT_FAMILY.bold },
  statLabel: { fontSize: FONT.xs, fontFamily: FONT_FAMILY.regular },
  statDivider: { width: 1, marginHorizontal: 8 },
  menu: { flex: 1 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14, paddingVertical: 13, paddingHorizontal: 4,
  },
  menuIcon: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: FONT.base, fontWeight: '600', fontFamily: FONT_FAMILY.medium },
  footer: { textAlign: 'center', fontSize: FONT.sm, fontFamily: FONT_FAMILY.regular },
});

