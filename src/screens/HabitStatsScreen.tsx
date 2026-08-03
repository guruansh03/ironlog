import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';

import { useTheme } from '../theme/useTheme';
import { FONT, RADIUS } from '../theme/tokens';
import { useHabitStore, getValueOn, isCompletedOn } from '../store/habitStore';
import MiniBarChart from '../components/ui/MiniBarChart';
import AnimatedPressable from '../components/animations/AnimatedPressable';

export default function HabitStatsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors: c, neu } = useTheme();
  const { habits } = useHabitStore();

  const days = useMemo(
    () => Array.from({ length: 30 }, (_, i) => format(subDays(new Date(), 29 - i), 'yyyy-MM-dd')),
    []
  );

  const overall = useMemo(() => {
    if (!habits.length) return 0;
    const done = days.reduce((sum, day) => sum + habits.filter((habit) => isCompletedOn(habit, day)).length, 0);
    return (done / (days.length * habits.length)) * 100;
  }, [days, habits]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}> 
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}> 
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.title, { color: c.text }]}>Habit Stats</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator>
        <View style={[styles.summary, neu.darkShadow, { backgroundColor: c.card }]}> 
          <Text style={[styles.summaryValue, { color: c.text }]}>{overall.toFixed(1)}%</Text>
          <Text style={[styles.summaryLabel, { color: c.textMuted }]}>30-day completion rate</Text>
        </View>

        {habits.map((habit) => {
          const values = days.map((day) => {
            if (habit.type === 'yesno') return isCompletedOn(habit, day) ? 1 : 0;
            return habit.target ? Math.min(1, getValueOn(habit, day) / habit.target) : getValueOn(habit, day);
          });

          const completedDays = days.filter((day) => isCompletedOn(habit, day)).length;

          return (
            <View key={habit.id} style={[styles.card, neu.darkShadow, { backgroundColor: c.card }]}> 
              <View style={styles.cardHeader}>
                <Text style={styles.emoji}>{habit.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: c.text }]}>{habit.name}</Text>
                  <Text style={[styles.meta, { color: c.textMuted }]}>Current streak {habit.streak} · Best {habit.bestStreak}</Text>
                </View>
                <Text style={[styles.days, { color: c.text }]}>{completedDays}d</Text>
              </View>
              <MiniBarChart data={values} height={72} barWidth={5} gap={2} color={habit.color} />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FONT.lg, fontWeight: '800' },
  scroll: { padding: 16, gap: 12 },
  summary: { borderRadius: RADIUS.xl, padding: 18, alignItems: 'center' },
  summaryValue: { fontSize: 34, fontWeight: '900' },
  summaryLabel: { marginTop: 4, fontSize: 12 },
  card: { borderRadius: RADIUS.lg, padding: 14, gap: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  emoji: { fontSize: 22 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  days: { fontSize: 18, fontWeight: '800' },
});
