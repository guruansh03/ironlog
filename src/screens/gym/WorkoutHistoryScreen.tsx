import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { useTheme } from '../../theme/useTheme';
import { F } from '../../theme/fonts';
import { useGymStore } from '../../store/gymStore';
import { RootStackParams } from '../../navigation/RootNavigator';
import AnimatedPressable from '../../components/animations/AnimatedPressable';
import FadeInView from '../../components/animations/FadeInView';
import { PAGE_PADDING_H, CARD_GAP, CARD_RADIUS, CARD_PADDING } from '../../theme/spacing';

type NavT = StackNavigationProp<RootStackParams, 'HistoryScreen'>;

export default function WorkoutHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavT>();
  const { colors: c, isDark } = useTheme();
  const { sessions } = useGymStore();
  const [activeFilter, setActiveFilter] = useState('All');

  // collect unique day names for chips
  const chipOptions = useMemo(() => {
    const names = Array.from(new Set(sessions.map((s) => s.dayName)));
    return ['All', ...names];
  }, [sessions]);

  const filtered = useMemo(() => {
    if (activeFilter === 'All') return sessions;
    return sessions.filter((s) => s.dayName === activeFilter);
  }, [sessions, activeFilter]);

  // group by month
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((s) => {
      const key = format(parseISO(s.startedAt), 'MMMM yyyy');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    });
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
        </AnimatedPressable>
        <Text style={[styles.headerTitle, { color: c.text }]}>History</Text>
        <Text style={[styles.filterBtn, { color: c.text }]}>Filter</Text>
      </View>

      <FadeInView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator
        >
          {/* Filter Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chips}
          >
            {chipOptions.map((chip) => (
              <AnimatedPressable
                key={chip}
                onPress={() => setActiveFilter(chip)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: activeFilter === chip ? c.text : c.card,
                    borderColor: activeFilter === chip ? 'transparent' : c.border,
                  },
                ]}
              >
                <Text style={{ color: activeFilter === chip ? c.bg : c.textMuted, fontSize: 13, fontFamily: F.medium }}>
                  {chip}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>

          {grouped.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="barbell-outline" size={40} color={c.textMuted} style={{ opacity: 0.4 }} />
              <Text style={[styles.emptyText, { color: c.text }]}>No sessions yet.</Text>
              <Text style={[styles.emptySub, { color: c.textMuted }]}>Start a workout to see history.</Text>
            </View>
          ) : (
            grouped.map(([month, list]) => (
              <View key={month}>
                <Text style={[styles.sectionHd, { color: c.textMuted }]}>{month.toUpperCase()}</Text>
                {list.map((session) => {
                  const completedSets = session.exercises.reduce(
                    (sum, ex) => sum + ex.sets.filter((s) => s.weight > 0 && s.reps > 0).length,
                    0
                  );
                  return (
                    <AnimatedPressable
                      key={session.id}
                      onPress={() => navigation.navigate('WorkoutSummaryScreen', { sessionId: session.id })}
                      style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}
                    >
                      {/* Card top */}
                      <View style={styles.cardTop}>
                        <View style={[styles.histIcon, { backgroundColor: c.cardAlt }]}>
                          <Ionicons name="barbell-outline" size={16} color={c.text} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.cardTitle, { color: c.text }]}>{session.dayName}</Text>
                          <Text style={[styles.cardDate, { color: c.textMuted }]}>
                            {format(parseISO(session.startedAt), 'EEEE, MMM d')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={13} color={c.textLabel} />
                      </View>

                      {/* Stats row */}
                      <View style={[styles.statsRow, { borderTopColor: c.cardAlt }]}>
                        <HistStat label="Duration" value={`${Math.round(session.durationSeconds / 60)}m`} color={c.text} muted={c.textMuted} />
                        <View style={[styles.statDiv, { backgroundColor: c.cardAlt }]} />
                        <HistStat label="Volume kg" value={`${Math.round(session.totalVolume)}`} color={c.text} muted={c.textMuted} />
                        <View style={[styles.statDiv, { backgroundColor: c.cardAlt }]} />
                        <HistStat label="Sets" value={`${completedSets}`} color={c.text} muted={c.textMuted} />
                      </View>
                    </AnimatedPressable>
                  );
                })}
              </View>
            ))
          )}
        </ScrollView>
      </FadeInView>
    </View>
  );
}

function HistStat({
  label,
  value,
  color,
  muted,
}: {
  label: string;
  value: string;
  color: string;
  muted: string;
}) {
  return (
    <View style={styles.histStat}>
      <Text style={[styles.histStatVal, { color }]}>{value}</Text>
      <Text style={[styles.histStatLbl, { color: muted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 12,
    gap: 10,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: F.bold, fontSize: 17 },
  filterBtn: { fontFamily: F.semibold, fontSize: 14 },
  scroll: { paddingHorizontal: PAGE_PADDING_H, gap: CARD_GAP },
  chips: { gap: 7, paddingBottom: 2, marginBottom: 4 },
  chip: {
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderWidth: 0.5,
  },
  sectionHd: {
    fontFamily: F.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  card: {
    borderRadius: CARD_RADIUS,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 4,
  },
  cardTop: {
    padding: CARD_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
  },
  histIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardTitle: { fontFamily: F.semibold, fontSize: 15 },
  cardDate: { fontFamily: F.regular, fontSize: 12, marginTop: 1 },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  histStat: { flex: 1, alignItems: 'center' },
  histStatVal: { fontFamily: F.monoMedium, fontSize: 15 },
  histStatLbl: { fontFamily: F.regular, fontSize: 10.5, marginTop: 2 },
  statDiv: { width: 0.5, alignSelf: 'stretch' },
  empty: { alignItems: 'center', marginTop: 80, gap: 8 },
  emptyText: { fontFamily: F.semibold, fontSize: 16 },
  emptySub: { fontFamily: F.regular, fontSize: 13 },
});

