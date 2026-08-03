export const F = {
  light: 'DMSans_300Light',
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semibold: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  mono: 'DMMono_400Regular',
  monoMedium: 'DMMono_500Medium',
} as const;

export const TEXT = {
  screenTitle: { fontFamily: F.bold, fontSize: 30, letterSpacing: -0.7 },
  navSub: { fontFamily: F.regular, fontSize: 13 },
  sectionHeader: { fontFamily: F.semibold, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase' as const },
  tileValue: { fontFamily: F.bold, fontSize: 26, letterSpacing: -1.1 },
  tileUnit: { fontFamily: F.regular, fontSize: 13 },
  tileLabel: { fontFamily: F.regular, fontSize: 11 },
  heroTag: { fontFamily: F.semibold, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' as const },
  heroName: { fontFamily: F.bold, fontSize: 19, letterSpacing: -0.3 },
  heroStat: { fontFamily: F.mono, fontSize: 20, letterSpacing: -0.4 },
  heroStatLabel: { fontFamily: F.regular, fontSize: 10 },
  historyVal: { fontFamily: F.mono, fontSize: 14 },
  historyLabel: { fontFamily: F.regular, fontSize: 10 },
  actionBtn: { fontFamily: F.semibold, fontSize: 13.5 },
  chipText: { fontFamily: F.medium, fontSize: 12.5 },
  exerciseName: { fontFamily: F.bold, fontSize: 14.5 },
  setNum: { fontFamily: F.mono, fontSize: 10.5 },
  body: { fontFamily: F.regular, fontSize: 15 },
  caption: { fontFamily: F.regular, fontSize: 12 },
  weekVal: { fontFamily: F.mono, fontSize: 12.5 },
} as const;

export const typography = {
  screenTitle: { fontFamily: F.bold, fontSize: 28 },
  sectionLabel: {
    fontFamily: F.semibold,
    fontSize: 11,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.7,
  },
  tileValue: { fontFamily: F.bold, fontSize: 36 },
  tileUnit: { fontFamily: F.regular, fontSize: 14 },
  tileLabel: { fontFamily: F.medium, fontSize: 13 },
  cardTitle: { fontFamily: F.semibold, fontSize: 16 },
  cardSubtitle: { fontFamily: F.regular, fontSize: 13 },
  body: { fontFamily: F.regular, fontSize: 15 },
  caption: { fontFamily: F.regular, fontSize: 12 },
};
