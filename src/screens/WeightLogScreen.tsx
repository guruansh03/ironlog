import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Svg, { Path } from 'react-native-svg';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import { useWeightStore } from '../store/weightStore';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import ScrollPicker from '../components/ui/ScrollPicker';

export default function WeightLogScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t } = useAppTheme();
  const { entries, latest, addEntry, removeEntry } = useWeightStore();

  const [unit, setUnit] = useState<'kg' | 'lbs'>('kg');
  const baseKg = latest()?.value ?? 30;
  const initialWeight = unit === 'kg' ? Number(baseKg.toFixed(1)) : Number((baseKg * 2.20462).toFixed(1));
  const [selectedWeight, setSelectedWeight] = useState(initialWeight);

  const displayCurrent = selectedWeight.toFixed(1);
  const today = format(new Date(), 'yyyy-MM-dd');

  const pickerValues = useMemo(
    () => unit === 'lbs'
      ? Array.from({ length: 771 }, (_, i) => Number((66 + i / 10).toFixed(1)))
      : Array.from({ length: 1701 }, (_, i) => Number((30 + i / 10).toFixed(1))),
    [unit],
  );

  const last30 = useMemo(() => entries.slice(-30), [entries]);

  const line = useMemo(() => {
    if (last30.length < 2) return '';
    const values = last30.map((e) => e.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const width = 280;
    const height = 64;
    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 6) - 3;
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  }, [last30]);

  async function handleLog() {
    const numeric = Number(displayCurrent);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    const kg = unit === 'kg' ? numeric : numeric * 0.453592;
    await addEntry(kg, today);
    setSelectedWeight(Number(numeric.toFixed(1)));
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}> 
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}> 
        <AnimatedPressable style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={20} color={t.ink} />
        </AnimatedPressable>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator>
        <Text style={[styles.bigNumber, { color: t.ink }]}>{displayCurrent}</Text>

        <View style={styles.metaRow}>
          <Text style={[styles.metaText, { color: t.ink3 }]}>{today}</Text>
          <View style={[styles.unitWrap, { backgroundColor: t.surface, borderColor: t.border }]}> 
            {(['kg', 'lbs'] as const).map((value) => {
              const active = unit === value;
              return (
                <AnimatedPressable
                  key={value}
                  onPress={() => {
                    const kgValue = unit === 'kg' ? selectedWeight : selectedWeight * 0.453592;
                    setUnit(value);
                    const nextValue = value === 'kg' ? kgValue : kgValue * 2.20462;
                    setSelectedWeight(Number(nextValue.toFixed(1)));
                  }}
                  style={[styles.unitPill, active && { backgroundColor: t.accentBtn }]}
                >
                  <Text style={[styles.unitText, { color: active ? '#FFFFFF' : t.ink3 }]}>{value}</Text>
                </AnimatedPressable>
              );
            })}
          </View>
        </View>

        <View style={[styles.chart, { backgroundColor: t.surface, borderColor: t.border }]}> 
          <Svg width={280} height={64}>
            {line ? <Path d={line} stroke={t.accent} strokeWidth={2.5} fill="none" /> : null}
          </Svg>
        </View>

        <View style={[styles.pickerCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.pickerHint, { color: t.ink3 }]}>Scroll to set today’s weight</Text>
          <ScrollPicker
            values={pickerValues}
            selectedValue={selectedWeight}
            onValueChange={setSelectedWeight}
            width={180}
            itemHeight={44}
          />
        </View>

        <AnimatedPressable style={[styles.logBtn, { backgroundColor: t.accentBtn }]} onPress={handleLog}>
          <Text style={styles.logText}>Log</Text>
        </AnimatedPressable>

        <Text style={[styles.lastLabel, { color: t.ink3 }]}>Last 5 Entries</Text>
        {entries.slice(-5).reverse().map((entry) => (
          <View key={entry.id} style={[styles.entryRow, { backgroundColor: t.surface, borderColor: t.border }]}> 
            <Text style={[styles.entryText, { color: t.ink }]}>{entry.value.toFixed(1)} kg</Text>
            <Text style={[styles.entryDate, { color: t.ink4 }]}>{entry.date}</Text>
            <AnimatedPressable onPress={() => removeEntry(entry.id)}>
              <Ionicons name="trash-outline" size={16} color="#ef4444" />
            </AnimatedPressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  bigNumber: {
    fontFamily: F.mono,
    fontSize: 56,
    textAlign: 'center',
    letterSpacing: -1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaText: {
    fontFamily: F.medium,
    fontSize: 12,
  },
  unitWrap: {
    borderWidth: 1,
    borderRadius: 50,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
  },
  unitPill: {
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  unitText: {
    fontFamily: F.semibold,
    fontSize: 12,
  },
  chart: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
  },
  pickerCard: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerHint: {
    fontFamily: F.medium,
    fontSize: 12,
    marginBottom: 8,
  },
  logBtn: {
    marginTop: 2,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logText: {
    color: '#FFFFFF',
    fontFamily: F.bold,
    fontSize: 16,
  },
  lastLabel: {
    fontFamily: F.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 8,
  },
  entryRow: {
    borderWidth: 1,
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  entryText: {
    flex: 1,
    fontFamily: F.semibold,
    fontSize: 14,
  },
  entryDate: {
    fontFamily: F.regular,
    fontSize: 12,
  },
});
