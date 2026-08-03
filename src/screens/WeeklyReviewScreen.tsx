import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, subDays } from 'date-fns';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import NavBar from '../components/shared/NavBar';
import HeroCard from '../components/shared/HeroCard';
import SectionHeader from '../components/shared/SectionHeader';
import { useHabitStore, isCompletedOn } from '../store/habitStore';
import { useGymStore } from '../store/gymStore';
import AnimatedPressable from '../components/animations/AnimatedPressable';

const EMOJI = ['😔', '😐', '🙂', '😄', '🔥'];

export default function WeeklyReviewScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t } = useAppTheme();
  const { habits } = useHabitStore();
  const { sessions } = useGymStore();
  const [mood, setMood] = useState(2);

  const days7 = useMemo(
    () => Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')),
    [],
  );

  const score = useMemo(() => {
    if (!habits.length) return 0;
    const total = habits.length * days7.length;
    const done = days7.reduce((sum, day) => sum + habits.filter((h) => isCompletedOn(h, day)).length, 0);
    return Math.round((done / total) * 100);
  }, [days7, habits]);

  const weekSessions = useMemo(
    () => sessions.filter((session) => days7.some((day) => session.startedAt.startsWith(day))),
    [days7, sessions],
  );

  const gymSessionsCount = weekSessions.length;
  const gymVolumeKg = Math.round(weekSessions.reduce((sum, session) => sum + session.totalVolume, 0));
  const gymVolumeTons = Number((gymVolumeKg / 1000).toFixed(1));
  const avgDurationMin = gymSessionsCount
    ? Math.round(weekSessions.reduce((sum, session) => sum + session.durationSeconds, 0) / gymSessionsCount / 60)
    : 0;

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}> 
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator>
        <NavBar
          title="Weekly Review"
          noPadTop
          left={
            <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={20} color={t.ink} />
            </AnimatedPressable>
          }
        />

        <HeroCard
          tag="THIS WEEK"
          name={`${score} Score`}
          date={format(new Date(), "MMM d, yyyy")}
          stats={[
            { value: `${score}%`, label: 'Habits Done' },
            { value: `${gymSessionsCount}`, label: 'Workouts' },
            { value: `${gymVolumeTons}t`, label: 'Gym Volume' },
          ]}
        />

        <View style={styles.dayRow}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <View key={`${d}-${i}`} style={[styles.dayPill, { backgroundColor: i < 5 ? t.surface2 : t.surface, borderColor: t.border }]}> 
              <Text style={[styles.dayText, { color: t.ink3 }]}>{d}</Text>
            </View>
          ))}
        </View>

        <SectionHeader label="Habits This Week" />
        {habits.map((habit) => {
          const doneCount = days7.filter((day) => isCompletedOn(habit, day)).length;
          const rate = Math.round((doneCount / 7) * 100);
          return (
            <View key={habit.id} style={[styles.row, { backgroundColor: t.surface, borderColor: t.border }]}> 
              <View style={[styles.iconSlot, { backgroundColor: t.surface2, borderColor: t.border }]}> 
                {/^[a-z0-9-]+$/i.test(habit.icon) ? (
                  <Ionicons name={habit.icon as any} size={14} color={t.ink2} />
                ) : (
                  <Text style={styles.icon}>{habit.icon}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.rowName, { color: t.ink }]}>{habit.name}</Text>
                <View style={styles.dotStrip}>
                  {days7.map((day) => (
                    <View
                      key={`${habit.id}-${day}`}
                      style={[
                        styles.dot,
                        { backgroundColor: isCompletedOn(habit, day) ? t.habitDotDone : t.surface3 },
                      ]}
                    />
                  ))}
                </View>
              </View>
              <Text style={[styles.rate, { color: t.ink2 }]}>{rate}%</Text>
            </View>
          );
        })}

        <SectionHeader label="Gym This Week" />
        <View style={[styles.gymCard, { backgroundColor: t.surface, borderColor: t.border }]}> 
          <View style={styles.gymStatsRow}>
            <View style={styles.gymStatCol}>
              <Text style={[styles.gymStatLabel, { color: t.ink4 }]}>Sessions</Text>
              <Text style={[styles.gymStatValue, { color: t.ink }]}>{gymSessionsCount}</Text>
            </View>
            <View style={[styles.gymDivider, { backgroundColor: t.border }]} />
            <View style={styles.gymStatCol}>
              <Text style={[styles.gymStatLabel, { color: t.ink4 }]}>Volume</Text>
              <Text style={[styles.gymStatValue, { color: t.ink }]}>{gymVolumeKg.toLocaleString()} kg</Text>
            </View>
            <View style={[styles.gymDivider, { backgroundColor: t.border }]} />
            <View style={styles.gymStatCol}>
              <Text style={[styles.gymStatLabel, { color: t.ink4 }]}>Avg Duration</Text>
              <Text style={[styles.gymStatValue, { color: t.ink }]}>{avgDurationMin} min</Text>
            </View>
          </View>
        </View>

        <SectionHeader label="Mood" />
        <View style={styles.moodRow}>
          {EMOJI.map((emoji, index) => {
            const active = mood === index;
            return (
              <AnimatedPressable
                key={emoji}
                onPress={() => setMood(index)}
                style={[styles.moodBtn, { backgroundColor: active ? t.ink : t.surface2 }]}
              >
                <Text style={styles.moodText}>{emoji}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <SectionHeader label="Insights" />
        <View style={[styles.insight, { backgroundColor: t.accent + '1A', borderColor: t.accent + '33' }]}> 
          <Text style={[styles.insightTitle, { color: t.ink }]}>Consistency improved</Text>
          <Text style={[styles.insightBody, { color: t.ink3 }]}>You completed most habits on weekdays. Keep the same schedule next week.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    height: 34,
    borderRadius: 50,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: F.semibold,
    fontSize: 12,
  },
  row: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  icon: {
    fontSize: 17,
    lineHeight: 19,
  },
  iconSlot: {
    width: 32,
    height: 32,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowName: {
    fontFamily: F.semibold,
    fontSize: 14,
    marginBottom: 6,
  },
  dotStrip: {
    flexDirection: 'row',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  rate: {
    fontFamily: F.mono,
    fontSize: 14,
  },
  gymCard: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    marginBottom: 8,
  },
  gymStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  gymStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  gymStatLabel: {
    fontFamily: F.medium,
    fontSize: 10.5,
    marginBottom: 4,
  },
  gymStatValue: {
    fontFamily: F.semibold,
    fontSize: 13,
  },
  gymDivider: {
    width: 1,
    height: 30,
  },
  moodRow: {
    flexDirection: 'row',
    gap: 10,
  },
  moodBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodText: {
    fontSize: 20,
  },
  insight: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
  },
  insightTitle: {
    fontFamily: F.bold,
    fontSize: 14,
    marginBottom: 6,
  },
  insightBody: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 19,
  },
});
