import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';
import { getReadableTextColor } from '../../theme/contrast';
import AnimatedPressable from '../animations/AnimatedPressable';

interface Props {
  title: string;
  message: string;
  primaryLabel: string;
  onPrimaryPress: () => void;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  tone?: 'warning' | 'error';
}

export default function AppRecoveryScreen({
  title,
  message,
  primaryLabel,
  onPrimaryPress,
  secondaryLabel,
  onSecondaryPress,
  tone = 'warning',
}: Props) {
  const { theme: t } = useAppTheme();
  const accent = tone === 'error' ? '#D86A6A' : t.accentBtn;
  const accentText = getReadableTextColor(accent);

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <View style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={[styles.iconWrap, { backgroundColor: t.surface2 }]}>
          <Ionicons
            name={tone === 'error' ? 'warning-outline' : 'refresh-circle-outline'}
            size={24}
            color={accent}
          />
        </View>
        <Text style={[styles.title, { color: t.ink }]}>{title}</Text>
        <Text style={[styles.message, { color: t.ink3 }]}>{message}</Text>
        <AnimatedPressable
          style={[styles.primaryBtn, { backgroundColor: accent }]}
          onPress={onPrimaryPress}
        >
          <Text style={[styles.primaryText, { color: accentText }]}>{primaryLabel}</Text>
        </AnimatedPressable>
        {secondaryLabel && onSecondaryPress ? (
          <AnimatedPressable
            style={[styles.secondaryBtn, { backgroundColor: t.surface2, borderColor: t.border }]}
            onPress={onSecondaryPress}
          >
            <Text style={[styles.secondaryText, { color: t.ink2 }]}>{secondaryLabel}</Text>
          </AnimatedPressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    padding: 22,
    alignItems: 'center',
  },
  iconWrap: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  message: {
    fontFamily: F.regular,
    fontSize: 13,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 18,
  },
  primaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    fontFamily: F.bold,
    fontSize: 14,
  },
  secondaryBtn: {
    width: '100%',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
  },
  secondaryText: {
    fontFamily: F.semibold,
    fontSize: 13,
  },
});
