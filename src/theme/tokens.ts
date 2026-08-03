// ─── IronLog Neumorphic Theme ────────────────────────────────────────────────
// Light + Dark mode support
import { Platform } from 'react-native';

export const SPACING = {
  xs: 4, sm: 8, md: 16, lg: 24, xl: 32,
};

export const RADIUS = {
  sm: 12, md: 16, lg: 22, xl: 28, full: 999,
};

export const FONT = {
  xs: 10, sm: 12, md: 13, base: 15, lg: 17, xl: 22, xxl: 30, hero: 38,
};

export const FONT_FAMILY = {
  regular: 'SFProDisplayRegular',
  medium: 'SFProDisplayMedium',
  bold: 'SFProDisplayBold',
  compactRegular: 'SFCompactRegular',
  compactMedium: 'SFCompactMedium',
  compactBold: 'SFCompactBold',
  mono: 'SFMonoRegular',
};

// ─── Color palettes ──────────────────────────────────────────────────────────

export const LIGHT_COLORS = {
  bg:        '#ECECEF',
  surface:   '#ECECEF',
  card:      '#F7F7FA',
  cardAlt:   '#E8E8EC',
  border:    'transparent',
  text:      '#1A1A1A',
  textSub:   '#444444',
  textMuted: '#999999',
  accent:    '#1A1A1A',
  accentSoft:'#E0E0E4',
  success:   '#34C759',
  danger:    '#FF3B30',
  warning:   '#FF9500',
  ringBg:    '#F7F7FA',
};

export const DARK_COLORS = {
  bg:        '#121214',
  surface:   '#121214',
  card:      '#1C1C1F',
  cardAlt:   '#2A2A2E',
  border:    'transparent',
  text:      '#F0F0F3',
  textSub:   '#BBBBBB',
  textMuted: '#777777',
  accent:    '#F0F0F3',
  accentSoft:'#2A2A2E',
  success:   '#30D158',
  danger:    '#FF453A',
  warning:   '#FF9F0A',
  ringBg:    '#1C1C1F',
};

export type ThemeColors = typeof LIGHT_COLORS;

// ─── Cross-platform neumorphic shadows ───────────────────────────────────────

function neuShadow(
  lightOffset: number,
  darkOffset: number,
  lightBlur: number,
  darkBlur: number,
  darkOpacity: number,
  elevation: number,
  isDark = false,
) {
  const shadowColor = isDark ? '#000000' : '#B8BCC8';
  const lightColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)';
  const darkColor = isDark
    ? `rgba(0,0,0,${Math.min(1, darkOpacity + 0.3)})`
    : `rgba(174,179,191,${darkOpacity})`;

  const base: any = {
    shadowColor,
    shadowOffset: { width: darkOffset, height: darkOffset },
    shadowOpacity: darkOpacity,
    shadowRadius: darkBlur,
    elevation,
  };

  if (Platform.OS === 'web') {
    base.boxShadow = `${darkOffset}px ${darkOffset}px ${darkBlur}px ${darkColor}, ${lightOffset}px ${lightOffset}px ${lightBlur}px ${lightColor}`;
  }

  return base;
}

function neuInset(offset: number, blur: number, opacity: number, isDark = false) {
  const shadowColor = isDark ? '#000000' : '#B8BCC8';
  const darkColor = isDark
    ? `rgba(0,0,0,${Math.min(1, opacity + 0.3)})`
    : `rgba(174,179,191,${opacity})`;
  const lightColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.8)';

  const base: any = {
    shadowColor,
    shadowOffset: { width: offset, height: offset },
    shadowOpacity: opacity,
    shadowRadius: blur,
  };

  if (Platform.OS === 'web') {
    base.boxShadow = `inset ${offset}px ${offset}px ${blur}px ${darkColor}, inset ${-offset}px ${-offset}px ${blur}px ${lightColor}`;
  }

  return base;
}

export function getNeuomorphic(isDark: boolean) {
  return {
    darkShadow: neuShadow(-6, 6, 16, 16, 0.25, 6, isDark),
    darkShadowSm: neuShadow(-3, 3, 8, 8, 0.22, 3, isDark),
    insetShadow: neuInset(2, 5, 0.2, isDark),
  };
}

// Status pill colors
export const STATUS = {
  pending:   { bg: '#FFF3CD', text: '#856404', icon: '⏳' },
  progress:  { bg: '#CCE5FF', text: '#004085', icon: '🔄' },
  submitted: { bg: '#E8D5F5', text: '#5B2C8E', icon: '📩' },
  success:   { bg: '#D4EDDA', text: '#155724', icon: '✅' },
  failed:    { bg: '#F8D7DA', text: '#721C24', icon: '❌' },
  expired:   { bg: '#E2E3E5', text: '#383D41', icon: '⏱️' },
};

export type ColorTokens = typeof LIGHT_COLORS;
