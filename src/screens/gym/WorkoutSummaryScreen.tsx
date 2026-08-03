import React, { memo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Share, Alert, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { useAppTheme } from '../../theme/ThemeContext';
import { getReadableTextColor } from '../../theme/contrast';
import { F } from '../../theme/fonts';
import { useGymStore } from '../../store/gymStore';
import { RootStackParams } from '../../navigation/RootNavigator';
import AnimatedPressable from '../../components/animations/AnimatedPressable';
import FadeInView from '../../components/animations/FadeInView';
import { PAGE_PADDING_H, CARD_GAP, CARD_RADIUS, CARD_PADDING } from '../../theme/spacing';

type RouteT = RouteProp<RootStackParams, 'WorkoutSummaryScreen'>;

function getHeroText(color: string) {
  const main = getReadableTextColor(color);
  return {
    main,
    muted: main === '#FFFFFF' ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
    soft: main === '#FFFFFF' ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)',
    divider: main === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
  };
}

export default function WorkoutSummaryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteT>();
  const { theme: t } = useAppTheme();
  const c = {
    bg: t.bg,
    card: t.surface,
    cardAlt: t.surface2,
    border: t.border,
    text: t.ink,
    textMuted: t.ink3,
    textLabel: t.ink4,
  };
  const { sessions, prs } = useGymStore();
  const shareCardRef = useRef<View>(null);

  const session = sessions.find((s) => s.id === route.params.sessionId);
  if (!session) return null;

  const hero = getHeroText(t.heroBg[0]);
  const mins = Math.round(session.durationSeconds / 60);
  const completedSets = session.exercises.flatMap((e) =>
    e.sets.filter((s) => s.weight > 0 && s.reps > 0)
  );
  const sessionPrs = prs.filter((pr) => pr.sessionId === session.id);
  const prExerciseNames = new Set(sessionPrs.map((pr) => pr.exerciseName));

  async function handleShare() {
    if (Platform.OS !== 'web' && shareCardRef.current) {
      try {
        const uri = await captureRef(shareCardRef, {
          format: 'png',
          quality: 1,
          result: 'tmpfile',
          width: 1080,
          height: 1920,
        });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            UTI: 'public.png',
            dialogTitle: 'Share workout stats',
          });
          return;
        }
      } catch {
        // Fall back to text share.
      }
    }

    const message = [
      `${session.splitName} - ${session.dayName}`,
      format(parseISO(session.startedAt), 'MMM d, yyyy'),
      `Duration: ${mins}m`,
      `Volume: ${Math.round(session.totalVolume)} kg`,
      `Sets: ${completedSets.length}`,
      `PRs: ${sessionPrs.length}`,
    ].join('\n');

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
      window.alert('Workout summary copied to clipboard.');
      return;
    }

    try {
      await Share.share({ message });
    } catch {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message);
        window.alert('Workout summary copied to clipboard.');
      } else {
        Alert.alert('Share', message);
      }
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <View style={styles.captureWrap} pointerEvents="none">
        <View ref={shareCardRef} style={styles.shareStatCard}>
          <LinearGradient colors={['#0A0A0F', '#12121E', '#1A1025']} style={styles.shareGradient}>
            <View style={styles.shareHeader}>
              <Text style={styles.shareBrand}>IRONLOG</Text>
              <Text style={styles.shareDate}>{format(parseISO(session.startedAt), 'MMM d, yyyy')}</Text>
            </View>

            <View style={[styles.shareAccentLine, { backgroundColor: t.accent }]} />

            <Text style={styles.shareDay} numberOfLines={2}>{session.dayName}</Text>
            <Text style={styles.shareSplit}>{session.splitName}</Text>

            <View style={styles.shareStatsGrid}>
              {[
                { val: `${mins}m`, lbl: 'Duration' },
                { val: Math.round(session.totalVolume).toLocaleString(), lbl: 'Volume kg' },
                { val: String(completedSets.length), lbl: 'Sets' },
                { val: sessionPrs.length ? String(sessionPrs.length) : '-', lbl: 'PRs' },
              ].map((item) => (
                <View key={item.lbl} style={styles.shareStatTile}>
                  <Text
                    style={[
                      styles.shareStatValue,
                      sessionPrs.length > 0 && item.lbl === 'PRs' ? { color: t.accent } : {},
                    ]}
                  >
                    {item.val}
                  </Text>
                  <Text style={styles.shareStatLabel}>{item.lbl}</Text>
                </View>
              ))}
            </View>

            <View style={styles.shareExList}>
              {session.exercises.slice(0, 6).map((ex) => {
                const done = ex.sets.filter((s) => s.weight > 0 && s.reps > 0);
                const hasPR = prExerciseNames.has(ex.name);
                const bestSet = done.reduce(
                  (best, set) => (set.weight > (best?.weight ?? 0) ? set : best),
                  done[0]
                );

                return (
                  <View key={ex.id} style={styles.shareExRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                        <Text style={styles.shareExName}>{ex.name}</Text>
                        {hasPR ? (
                          <View style={[styles.sharePrBadge, { backgroundColor: t.accent }]}>
                            <Text style={styles.sharePrText}>PR</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.shareExSets}>
                        {done.length} sets{bestSet ? ` - best ${bestSet.weight}kg x ${bestSet.reps}` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
              {session.exercises.length > 6 ? (
                <Text style={styles.shareMoreEx}>+{session.exercises.length - 6} more exercises</Text>
              ) : null}
            </View>

            <View style={[styles.shareFooterBar, { backgroundColor: t.accent }]}>
              <Text style={styles.shareFooter}>ironlog.app</Text>
            </View>
          </LinearGradient>
        </View>
      </View>

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={c.text} />
          <Text style={[styles.backText, { color: c.text }]}>Summary</Text>
        </AnimatedPressable>
        <AnimatedPressable onPress={handleShare}>
          <Text style={[styles.shareBtn, { color: c.textMuted }]}>Share</Text>
        </AnimatedPressable>
      </View>

      <FadeInView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator
        >
          <LinearGradient colors={t.heroBg} style={styles.heroCard}>
            <Text style={[styles.heroSplit, { color: hero.soft }]}>
              {session.splitName} - {session.dayName}
            </Text>
            <Text style={[styles.heroTitle, { color: hero.main }]}>{session.dayName}</Text>
            <Text style={[styles.heroDate, { color: hero.muted }]}>
              {format(parseISO(session.startedAt), 'EEEE, MMMM d')}
            </Text>
            <View style={styles.heroStats}>
              {[
                { label: 'Duration', value: `${mins}m` },
                { label: 'Volume kg', value: `${Math.round(session.totalVolume)}` },
                { label: 'Sets', value: `${completedSets.length}` },
              ].map(({ label, value }, index) => (
                <React.Fragment key={label}>
                  {index > 0 ? <View style={[styles.heroDivider, { backgroundColor: hero.divider }]} /> : null}
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroStatVal, { color: hero.main }]}>{value}</Text>
                    <Text style={[styles.heroStatLbl, { color: hero.soft }]}>{label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </LinearGradient>

          <Text style={[styles.sectionHd, { color: c.textMuted }]}>EXERCISES</Text>

          {session.exercises.map((ex) => {
            const exCompletedSets = ex.sets.filter((s) => s.weight > 0 && s.reps > 0);
            const totalVol = exCompletedSets
              .filter((s) => (s.loadMode ?? 'weight') === 'weight')
              .reduce((sum, s) => sum + s.weight * s.reps, 0);
            const exercisePr = sessionPrs.find((pr) => pr.exerciseName === ex.name);
            const prSetIndex = exercisePr
              ? exCompletedSets.findIndex((set) => set.weight === exercisePr.weight && set.reps === exercisePr.reps)
              : -1;

            return (
              <ExerciseCard
                key={ex.id}
                name={ex.name}
                muscle={ex.muscleGroup}
                totalVol={totalVol}
                sets={exCompletedSets}
                hasPR={prSetIndex >= 0}
                prSetIndex={prSetIndex}
                colors={c}
              />
            );
          })}
        </ScrollView>
      </FadeInView>
    </View>
  );
}

const ExerciseCard = memo(function ExerciseCard({
  name,
  muscle,
  totalVol,
  sets,
  hasPR,
  prSetIndex,
  colors: c,
}: {
  name: string;
  muscle: string;
  totalVol: number;
  sets: any[];
  hasPR: boolean;
  prSetIndex: number;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const height = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    height: height.value,
    overflow: 'hidden',
  }));

  function toggle() {
    const next = !open;
    setOpen(next);
    height.value = withTiming(next ? sets.length * 40 + 8 : 0, { duration: 300 });
  }

  return (
    <View style={[exStyles.card, { backgroundColor: c.card, borderColor: c.border }]}>
      <Pressable onPress={toggle} style={exStyles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[exStyles.muscle, { color: c.textMuted }]}>{muscle.toUpperCase()}</Text>
          <Text style={[exStyles.name, { color: c.text }]}>{name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[exStyles.totalVal, { color: c.text }]}>{totalVol.toLocaleString()}</Text>
            <Text style={[exStyles.totalLbl, { color: c.textMuted }]}>kg total</Text>
          </View>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={c.textLabel}
          />
        </View>
      </Pressable>

      <Animated.View style={animStyle}>
        <View style={[exStyles.setsDivider, { borderTopColor: c.cardAlt }]}>
          {sets.map((set, index) => (
            <View
              key={set.id}
              style={[
                exStyles.setRow,
                { borderBottomColor: c.cardAlt, borderBottomWidth: index < sets.length - 1 ? 0.5 : 0 },
              ]}
            >
              <Text style={[exStyles.setNum, { color: c.textMuted }]}>Set {index + 1}</Text>
              <Text style={[exStyles.setDetail, { color: c.text }]}>
                {set.weight} {(set.loadMode ?? 'weight') === 'plates' ? 'plates' : 'kg'} x {set.reps}
              </Text>
              <Text style={[exStyles.setVol, { color: c.textMuted }]}>
                {(set.loadMode ?? 'weight') === 'plates' ? '-' : `${set.weight * set.reps} kg`}
              </Text>
              {hasPR && index === prSetIndex ? (
                <View style={[exStyles.prTag, { backgroundColor: c.text }]}>
                  <Text style={[exStyles.prText, { color: c.bg }]}>PR</Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
});

const exStyles = StyleSheet.create({
  card: {
    borderRadius: CARD_RADIUS,
    borderWidth: 0.5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  header: {
    padding: CARD_PADDING,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  muscle: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 0.4,
    marginBottom: 3,
  },
  name: { fontFamily: F.semibold, fontSize: 15.5 },
  totalVal: { fontFamily: F.bold, fontSize: 15 },
  totalLbl: { fontFamily: F.regular, fontSize: 11, marginTop: 1 },
  setsDivider: { borderTopWidth: 0.5 },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: CARD_PADDING,
    paddingVertical: 9,
    gap: 8,
  },
  setNum: { fontFamily: F.medium, fontSize: 13, minWidth: 42 },
  setDetail: { flex: 1, fontFamily: F.semibold, fontSize: 13 },
  setVol: { fontFamily: F.regular, fontSize: 13 },
  prTag: {
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  prText: { fontFamily: F.bold, fontSize: 10, letterSpacing: 0.04 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  captureWrap: {
    position: 'absolute',
    left: -2000,
    top: -2000,
  },
  shareStatCard: {
    width: 1080,
    height: 1920,
    borderRadius: 40,
    overflow: 'hidden',
  },
  shareGradient: {
    flex: 1,
    paddingHorizontal: 80,
    paddingTop: 110,
    paddingBottom: 0,
  },
  shareHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 36,
  },
  shareBrand: {
    fontFamily: F.bold,
    color: '#FFFFFF',
    fontSize: 34,
    letterSpacing: 6,
  },
  shareDate: {
    fontFamily: F.medium,
    color: 'rgba(255,255,255,0.55)',
    fontSize: 28,
  },
  shareAccentLine: {
    height: 6,
    borderRadius: 3,
    width: 100,
    marginBottom: 48,
  },
  shareDay: {
    fontFamily: F.bold,
    color: '#FFFFFF',
    fontSize: 100,
    letterSpacing: -3,
    lineHeight: 108,
    marginBottom: 16,
  },
  shareSplit: {
    fontFamily: F.semibold,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 44,
    marginBottom: 64,
  },
  shareStatsGrid: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 64,
  },
  shareStatTile: {
    flex: 1,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  shareStatValue: {
    fontFamily: F.bold,
    fontSize: 58,
    letterSpacing: -1,
    color: '#FFFFFF',
    marginBottom: 6,
  },
  shareStatLabel: {
    fontFamily: F.medium,
    fontSize: 22,
    color: 'rgba(255,255,255,0.55)',
  },
  shareExList: {
    gap: 0,
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
    paddingTop: 36,
  },
  shareExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  shareExName: {
    fontFamily: F.semibold,
    fontSize: 36,
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  shareExSets: {
    fontFamily: F.regular,
    fontSize: 26,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 4,
  },
  sharePrBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  sharePrText: {
    fontFamily: F.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  shareMoreEx: {
    fontFamily: F.medium,
    fontSize: 26,
    color: 'rgba(255,255,255,0.35)',
    paddingVertical: 22,
  },
  shareFooterBar: {
    marginTop: 'auto',
    marginHorizontal: -80,
    paddingVertical: 36,
    paddingHorizontal: 80,
    alignItems: 'flex-end',
  },
  shareFooter: {
    fontFamily: F.semibold,
    fontSize: 26,
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: PAGE_PADDING_H,
    paddingBottom: 12,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontFamily: F.bold, fontSize: 17 },
  shareBtn: { fontFamily: F.medium, fontSize: 13 },
  scroll: { paddingHorizontal: PAGE_PADDING_H, gap: CARD_GAP },
  heroCard: {
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 4,
  },
  heroSplit: { fontFamily: F.semibold, fontSize: 11, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 8 },
  heroTitle: { fontFamily: F.bold, fontSize: 20, letterSpacing: -0.4, marginBottom: 3 },
  heroDate: { fontFamily: F.regular, fontSize: 12.5, marginBottom: 18 },
  heroStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatVal: { fontFamily: F.monoMedium, fontSize: 24, letterSpacing: -0.6, lineHeight: 24 },
  heroStatLbl: { fontFamily: F.regular, fontSize: 10.5, marginTop: 4 },
  heroDivider: { width: 1 },
  sectionHd: {
    fontFamily: F.semibold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginTop: 4,
    marginBottom: 6,
  },
});

