import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { MotiView } from 'moti';
import { useAppTheme } from '../../theme/ThemeContext';

interface SkeletonBoxProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function SkeletonBox({ width = '100%', height = 16, borderRadius = 8, style }: SkeletonBoxProps) {
  const { theme: t, isDark } = useAppTheme();
  const baseColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const shimmerColor = isDark ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.12)';

  return (
    <MotiView
      from={{ backgroundColor: baseColor }}
      animate={{ backgroundColor: shimmerColor }}
      transition={{
        type: 'timing',
        duration: 800,
        loop: true,
        repeatReverse: true,
      }}
      style={[{ width: width as any, height, borderRadius }, style]}
    />
  );
}

// ─── Preset skeletons ─────────────────────────────────

export function SkeletonTile({ style }: { style?: ViewStyle }) {
  return (
    <View style={[skStyles.tile, style]}>
      <SkeletonBox width={28} height={28} borderRadius={8} style={{ marginBottom: 12 }} />
      <SkeletonBox width="60%" height={28} borderRadius={6} style={{ marginBottom: 6 }} />
      <SkeletonBox width="80%" height={12} borderRadius={4} />
    </View>
  );
}

export function SkeletonCard({ lines = 2, style }: { lines?: number; style?: ViewStyle }) {
  const { theme: t } = useAppTheme();
  return (
    <View style={[skStyles.card, { backgroundColor: t.surface, borderColor: t.border }, style]}>
      <View style={skStyles.cardInner}>
        <SkeletonBox width={36} height={36} borderRadius={10} style={{ flexShrink: 0 }} />
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonBox width="70%" height={14} borderRadius={5} />
          {lines >= 2 && <SkeletonBox width="50%" height={11} borderRadius={4} />}
          {lines >= 3 && <SkeletonBox width="40%" height={11} borderRadius={4} />}
        </View>
      </View>
    </View>
  );
}

export function SkeletonHabitRow({ style }: { style?: ViewStyle }) {
  const { theme: t } = useAppTheme();
  return (
    <View style={[skStyles.habitRow, { backgroundColor: t.surface, borderColor: t.border }, style]}>
      <SkeletonBox width={28} height={28} borderRadius={14} />
      <SkeletonBox width={28} height={28} borderRadius={8} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="65%" height={14} borderRadius={5} />
        <SkeletonBox width="40%" height={11} borderRadius={4} />
      </View>
    </View>
  );
}

export function SkeletonGymCard({ style }: { style?: ViewStyle }) {
  const { theme: t } = useAppTheme();
  return (
    <View style={[skStyles.gymCard, { backgroundColor: t.surface, borderColor: t.border }, style]}>
      <SkeletonBox width="55%" height={16} borderRadius={5} style={{ marginBottom: 8 }} />
      <SkeletonBox width="35%" height={12} borderRadius={4} style={{ marginBottom: 14 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <SkeletonBox width={60} height={32} borderRadius={8} />
        <SkeletonBox width={60} height={32} borderRadius={8} />
        <SkeletonBox width={60} height={32} borderRadius={8} />
      </View>
    </View>
  );
}

// ─── Screen-level skeleton layouts ───────────────────

export function HomeScreenSkeleton() {
  return (
    <View style={skStyles.homeWrap}>
      <SkeletonBox width={160} height={32} borderRadius={8} style={{ marginBottom: 4 }} />
      <SkeletonBox width={120} height={14} borderRadius={4} style={{ marginBottom: 18 }} />
      <View style={skStyles.tileGrid}>
        <SkeletonTile style={{ flex: 1 }} />
        <SkeletonTile style={{ flex: 1 }} />
        <SkeletonTile style={{ flex: 1 }} />
        <SkeletonTile style={{ flex: 1 }} />
      </View>
      <SkeletonBox width="100%" height={120} borderRadius={16} style={{ marginTop: 14 }} />
    </View>
  );
}

export function HabitsScreenSkeleton() {
  return (
    <View style={{ gap: 8, paddingHorizontal: 15, paddingTop: 16 }}>
      <SkeletonBox width="100%" height={60} borderRadius={16} style={{ marginBottom: 8 }} />
      {[0, 1, 2, 3].map(i => (
        <SkeletonHabitRow key={i} />
      ))}
    </View>
  );
}

export function GymHomeScreenSkeleton() {
  return (
    <View style={{ gap: 10, paddingHorizontal: 15, paddingTop: 16 }}>
      <SkeletonBox width="60%" height={28} borderRadius={8} style={{ marginBottom: 4 }} />
      {[0, 1, 2].map(i => (
        <SkeletonGymCard key={i} />
      ))}
    </View>
  );
}

const skStyles = StyleSheet.create({
  tile: {
    borderRadius: 20,
    padding: 16,
    minHeight: 110,
    justifyContent: 'flex-end',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
  },
  cardInner: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  habitRow: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 58,
  },
  gymCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  homeWrap: {
    paddingHorizontal: 15,
    paddingTop: 16,
  },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
  },
});
