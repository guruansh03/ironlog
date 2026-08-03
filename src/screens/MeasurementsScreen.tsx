import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import Svg, { Polyline, Circle } from 'react-native-svg';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import {
  useMeasurementsStore,
  MEASUREMENT_KEYS,
  MEASUREMENT_LABELS,
  BodyMeasurements,
  MeasurementEntry,
} from '../store/measurementsStore';
import AnimatedPressable from '../components/animations/AnimatedPressable';

const CHART_COLORS: Record<string, string> = {
  chest: '#6C63FF',
  waist: '#FF6584',
  hips: '#F7971E',
  arms: '#43CBFF',
  thighs: '#6FCF97',
  neck: '#BB6BD9',
  shoulders: '#EB5757',
  calves: '#2F80ED',
};

function MiniChart({
  entries,
  field,
  color,
  width = 120,
  height = 40,
}: {
  entries: MeasurementEntry[];
  field: keyof BodyMeasurements;
  color: string;
  width?: number;
  height?: number;
}) {
  const data = entries
    .map(e => e.measurements[field])
    .filter((v): v is number => v !== undefined);

  if (data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pad = 6;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (width - pad * 2);
      const y = pad + ((max - v) / range) * (height - pad * 2);
      return `${x},${y}`;
    })
    .join(' ');

  const lastX = pad + ((data.length - 1) / (data.length - 1)) * (width - pad * 2);
  const lastY = pad + ((max - data[data.length - 1]) / range) * (height - pad * 2);

  return (
    <Svg width={width} height={height}>
      <Polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.9}
      />
      <Circle cx={lastX} cy={lastY} r={3} fill={color} />
    </Svg>
  );
}

export default function MeasurementsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t } = useAppTheme();
  const { entries, addEntry, removeEntry } = useMeasurementsStore();

  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [inputs, setInputs] = useState<Partial<Record<keyof BodyMeasurements, string>>>({});
  const [activeChart, setActiveChart] = useState<keyof BodyMeasurements | null>(null);

  const sorted = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);

  function handleSave() {
    const measurements: BodyMeasurements = {};
    for (const key of MEASUREMENT_KEYS) {
      const raw = inputs[key];
      if (raw && raw.trim()) {
        const val = parseFloat(raw);
        if (!isNaN(val) && val > 0) measurements[key] = val;
      }
    }
    if (Object.keys(measurements).length === 0) {
      if (Platform.OS === 'web') window.alert('Enter at least one measurement');
      else Alert.alert('Empty', 'Enter at least one measurement');
      return;
    }
    addEntry(selectedDate, measurements);
    setInputs({});
    setShowForm(false);
  }

  function handleDelete(id: string) {
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this entry?')) removeEntry(id);
    } else {
      Alert.alert('Delete', 'Remove this entry?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeEntry(id) },
      ]);
    }
  }

  // Latest values for summary cards
  const latestByField = useMemo(() => {
    const map: Partial<Record<keyof BodyMeasurements, number>> = {};
    for (const entry of entries) {
      for (const key of MEASUREMENT_KEYS) {
        const val = entry.measurements[key];
        if (val !== undefined) map[key] = val;
      }
    }
    return map;
  }, [entries]);

  // Trend: compare last 2 entries per field
  const trendByField = useMemo(() => {
    const map: Partial<Record<keyof BodyMeasurements, number>> = {};
    for (const key of MEASUREMENT_KEYS) {
      const vals = entries
        .map(e => e.measurements[key])
        .filter((v): v is number => v !== undefined);
      if (vals.length >= 2) {
        map[key] = vals[vals.length - 1] - vals[vals.length - 2];
      }
    }
    return map;
  }, [entries]);

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: t.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={20} color={t.ink} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: t.ink }]}>Measurements</Text>
        <TouchableOpacity
          onPress={() => setShowForm(!showForm)}
          style={[styles.addBtn, { backgroundColor: t.accentBtn }]}
        >
          <Ionicons name={showForm ? 'close' : 'add'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator
      >
        {/* Add Form */}
        {showForm && (
          <View style={[styles.formCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.sectionTitle, { color: t.ink }]}>Log Measurements</Text>
            <Text style={[styles.dateLabel, { color: t.ink3 }]}>Date: {selectedDate}</Text>

            <View style={styles.inputGrid}>
              {MEASUREMENT_KEYS.map(key => (
                <View key={key} style={styles.inputWrap}>
                  <Text style={[styles.inputLabel, { color: t.ink3 }]}>
                    {MEASUREMENT_LABELS[key]}
                  </Text>
                  <View style={[styles.inputRow, { backgroundColor: t.surface2, borderColor: t.border }]}>
                    <TextInput
                      value={inputs[key] ?? ''}
                      onChangeText={v => setInputs(p => ({ ...p, [key]: v }))}
                      keyboardType="decimal-pad"
                      placeholder="—"
                      placeholderTextColor={t.ink4}
                      style={[styles.inputField, { color: t.ink }]}
                    />
                    <Text style={[styles.inputUnit, { color: t.ink4 }]}>cm</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: t.accentBtn }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveBtnText, { color: '#fff' }]}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Cards */}
        {Object.keys(latestByField).length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: t.ink, marginHorizontal: 2 }]}>Latest</Text>
            <View style={styles.summaryGrid}>
              {MEASUREMENT_KEYS.filter(k => latestByField[k] !== undefined).map(key => {
                const val = latestByField[key]!;
                const trend = trendByField[key];
                const color = CHART_COLORS[key];
                const isActive = activeChart === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.summaryCard,
                      { backgroundColor: t.surface, borderColor: isActive ? color : t.border },
                      isActive && { borderWidth: 1.5 },
                    ]}
                    onPress={() => setActiveChart(isActive ? null : key)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.colorDot, { backgroundColor: color }]} />
                    <Text style={[styles.cardLabel, { color: t.ink3 }]}>{MEASUREMENT_LABELS[key]}</Text>
                    <Text style={[styles.cardValue, { color: t.ink }]}>{val}<Text style={[styles.cardUnit, { color: t.ink4 }]}> cm</Text></Text>
                    {trend !== undefined && (
                      <View style={styles.trendRow}>
                        <Ionicons
                          name={trend > 0 ? 'trending-up' : trend < 0 ? 'trending-down' : 'remove'}
                          size={10}
                          color={trend === 0 ? t.ink4 : trend > 0 ? '#6FCF97' : '#FF6584'}
                        />
                        <Text style={[styles.trendText, { color: trend === 0 ? t.ink4 : trend > 0 ? '#6FCF97' : '#FF6584' }]}>
                          {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                        </Text>
                      </View>
                    )}
                    <MiniChart entries={entries} field={key} color={color} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {/* History */}
        {sorted.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: t.ink, marginHorizontal: 2, marginTop: 8 }]}>History</Text>
            <View style={[styles.historyCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              {sorted.map((entry, i) => (
                <View
                  key={entry.id}
                  style={[
                    styles.historyRow,
                    i > 0 && { borderTopWidth: 0.5, borderTopColor: t.surface2 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyDate, { color: t.ink }]}>{entry.date}</Text>
                    <Text style={[styles.historyMeasurements, { color: t.ink3 }]} numberOfLines={2}>
                      {MEASUREMENT_KEYS
                        .filter(k => entry.measurements[k] !== undefined)
                        .map(k => `${MEASUREMENT_LABELS[k]}: ${entry.measurements[k]}cm`)
                        .join(' · ')}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.deleteBtn}>
                    <Ionicons name="trash-outline" size={14} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </>
        )}

        {entries.length === 0 && !showForm && (
          <View style={styles.empty}>
            <Text style={{ fontSize: 40 }}>📏</Text>
            <Text style={[styles.emptyTitle, { color: t.ink }]}>No measurements yet</Text>
            <Text style={[styles.emptySubtitle, { color: t.ink3 }]}>Tap + to log your first entry</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 0.5, gap: 12,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, fontFamily: F.bold, fontSize: 20, letterSpacing: -0.4 },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 12 },

  formCard: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 14 },
  sectionTitle: { fontFamily: F.bold, fontSize: 17, letterSpacing: -0.3 },
  dateLabel: { fontFamily: F.regular, fontSize: 13 },
  inputGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inputWrap: { width: '47%' },
  inputLabel: { fontFamily: F.semibold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, height: 44,
  },
  inputField: { flex: 1, fontFamily: F.medium, fontSize: 15 },
  inputUnit: { fontFamily: F.regular, fontSize: 12 },
  saveBtn: { borderRadius: 14, height: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  saveBtnText: { fontFamily: F.bold, fontSize: 15 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: {
    width: '47%', borderRadius: 16, borderWidth: 1,
    padding: 12, gap: 4,
  },
  colorDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  cardLabel: { fontFamily: F.semibold, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4 },
  cardValue: { fontFamily: F.bold, fontSize: 22, letterSpacing: -0.5 },
  cardUnit: { fontFamily: F.regular, fontSize: 13 },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  trendText: { fontFamily: F.semibold, fontSize: 11 },

  historyCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  historyRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12, gap: 10,
  },
  historyDate: { fontFamily: F.semibold, fontSize: 14, marginBottom: 3 },
  historyMeasurements: { fontFamily: F.regular, fontSize: 12, lineHeight: 18 },
  deleteBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  empty: { alignItems: 'center', gap: 8, marginTop: 60 },
  emptyTitle: { fontFamily: F.bold, fontSize: 18 },
  emptySubtitle: { fontFamily: F.regular, fontSize: 14 },
});

