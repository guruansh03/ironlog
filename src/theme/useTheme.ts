import { useMemo } from 'react';
import { FONT, RADIUS, SPACING } from './tokens';
import { useAppTheme } from './ThemeContext';

export function useTheme() {
  const { theme: t, isDark } = useAppTheme();

  const colors = useMemo(
    () => ({
      bg: t.bg,
      surface: t.surface,
      card: t.surface,
      cardAlt: t.surface2,
      border: t.border,
      text: t.ink,
      textSub: t.ink2,
      textMuted: t.ink3,
      textLabel: t.ink4,
      accent: t.accent,
      accentSoft: t.surface2,
      success: '#22c55e',
      danger: '#ef4444',
      warning: '#f59e0b',
      ringBg: t.surface3,
      chartStroke: t.ink,
      chartFill: 'rgba(0,0,0,0.08)',
      donutTrack: t.surface3,
      donutFill: t.ink,
      tabBg: t.surface,
      tabActivePill: t.tabActiveBg,
      tabActiveText: '#FFFFFF',
      tabInactiveText: t.ink4,
      headerBg: 'transparent',
      accents: {
        workouts: t.accent,
        weight: t.accent,
        volume: t.accent,
        habits: t.accent,
        notes: t.accent,
        gym: t.accent,
      },
      surfaces: [t.surface, t.surface2, t.surface3, t.surface],
    }),
    [t],
  );

  const neu = useMemo(
    () => ({
      darkShadow: t.shadowTile,
      darkShadowSm: t.shadowTile,
      insetShadow: {},
    }),
    [t.shadowTile],
  );

  return useMemo(
    () => ({
      isDark,
      mode: t.mode,
      themeName: t.id,
      colorful: t.id !== 'mono-light' && t.id !== 'mono-dark',
      colors,
      neu,
      font: FONT,
      radius: RADIUS,
      spacing: SPACING,
    }),
    [colors, isDark, neu, t.id, t.mode],
  );
}

export type ThemeColors = ReturnType<typeof useTheme>['colors'];
