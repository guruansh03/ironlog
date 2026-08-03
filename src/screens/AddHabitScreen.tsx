import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import { getReadableTextColor } from '../theme/contrast';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import { useHabitStore } from '../store/habitStore';

const ICONS = ['✅', '💧', '📚', '🏃', '🧘', '🥗', '💊', '😴', '📝', '🧠', '🏋️', '🚶'];
const COLORS = ['#6C63FF', '#FF6584', '#43CBFF', '#F7971E', '#6FCF97', '#BB6BD9'];

export default function AddHabitScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t } = useAppTheme();
  const onAccent = getReadableTextColor(t.accentBtn);
  const { addHabit } = useHabitStore();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('✅');
  const [frequency, setFrequency] = useState('Daily');
  const [habitType, setHabitType] = useState<'yesno' | 'numeric'>('numeric');
  const [target, setTarget] = useState('1');
  const [reminder, setReminder] = useState(false);
  const [streakTracking, setStreakTracking] = useState(true);
  const [search, setSearch] = useState('');
  const [days, setDays] = useState<boolean[]>([true, true, true, true, true, true, true]);

  const filteredIcons = useMemo(
    () => ICONS.filter((emoji) => emoji.includes(search.trim())),
    [search],
  );

  async function handleSave() {
    if (!name.trim()) return;
    if (habitType === 'yesno') {
      await addHabit(name.trim(), icon, 'yesno');
    } else {
      const numericTarget = Math.max(1, parseInt(target || '1', 10));
      await addHabit(name.trim(), icon, 'numeric', Number.isFinite(numericTarget) ? numericTarget : 1, 'times');
    }
    navigation.goBack();
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}> 
      <View style={[styles.topBar, { paddingTop: insets.top + 8, borderBottomColor: t.border }]}> 
        <AnimatedPressable onPress={() => navigation.goBack()} style={styles.topBtn}>
          <Ionicons name="close" size={20} color={t.ink} />
        </AnimatedPressable>
        <Text style={[styles.title, { color: t.ink }]}>Add Habit</Text>
        <AnimatedPressable onPress={handleSave} style={styles.topBtn}>
          <Ionicons name="checkmark" size={22} color={onAccent} />
        </AnimatedPressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 28 }]}
        showsVerticalScrollIndicator
      >
        <View style={[styles.searchPill, { backgroundColor: t.surface, borderColor: t.border }]}> 
          <Ionicons name="search" size={14} color={t.ink4} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search icons"
            placeholderTextColor={t.ink4}
            style={[styles.searchInput, { color: t.ink }]}
          />
        </View>

        <View style={styles.iconGrid}>
          {(filteredIcons.length ? filteredIcons : ICONS).map((emoji) => {
            const active = emoji === icon;
            return (
              <AnimatedPressable
                key={emoji}
                onPress={() => setIcon(emoji)}
                style={[
                  styles.iconCell,
                  { backgroundColor: t.surface, borderColor: active ? t.accentBtn : t.border },
                ]}
              >
                <Text style={styles.iconText}>{emoji}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={styles.colorRow}>
          {COLORS.map((color) => (
            <View key={color} style={[styles.colorDot, { backgroundColor: color }]} />
          ))}
        </View>

        <View style={styles.typeRow}>
          <AnimatedPressable
            onPress={() => setHabitType('yesno')}
            style={[styles.typeBtn, { backgroundColor: habitType === 'yesno' ? t.accentBtn : t.surface, borderColor: t.border }]}
          >
            <Text style={[styles.typeText, { color: habitType === 'yesno' ? onAccent : t.ink3 }]}>Yes / No</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => setHabitType('numeric')}
            style={[styles.typeBtn, { backgroundColor: habitType === 'numeric' ? t.accentBtn : t.surface, borderColor: t.border }]}
          >
            <Text style={[styles.typeText, { color: habitType === 'numeric' ? onAccent : t.ink3 }]}>Integer Target</Text>
          </AnimatedPressable>
        </View>

        <Field label="Name" t={t}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Habit name"
            placeholderTextColor={t.ink4}
            style={[styles.input, { color: t.ink, backgroundColor: t.surface, borderColor: t.border }]}
          />
        </Field>

        <View style={styles.twoCol}>
          <Field label="Frequency" t={t} style={{ flex: 1 }}>
            <TextInput
              value={frequency}
              onChangeText={setFrequency}
              placeholder="Daily"
              placeholderTextColor={t.ink4}
              style={[styles.input, { color: t.ink, backgroundColor: t.surface, borderColor: t.border }]}
            />
          </Field>
          <Field label="Target" t={t} style={{ flex: 1 }}>
            <TextInput
              value={target}
              onChangeText={setTarget}
              keyboardType="numeric"
              editable={habitType === 'numeric'}
              placeholder={habitType === 'numeric' ? '1' : 'Not needed'}
              placeholderTextColor={t.ink4}
              style={[styles.input, { color: t.ink, backgroundColor: t.surface, borderColor: t.border, opacity: habitType === 'numeric' ? 1 : 0.5 }]}
            />
          </Field>
        </View>

        <Text style={[styles.label, { color: t.ink3 }]}>Schedule Days</Text>
        <View style={styles.daysRow}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => {
            const active = days[index];
            return (
              <AnimatedPressable
                key={`${day}-${index}`}
                onPress={() => setDays((prev) => prev.map((v, i) => (i === index ? !v : v)))}
                style={[
                  styles.dayPill,
                  { backgroundColor: active ? t.accentBtn : t.surface, borderColor: t.border },
                ]}
              >
                <Text style={[styles.dayText, { color: active ? onAccent : t.ink3 }]}>{day}</Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <View style={[styles.toggleRow, { borderColor: t.border, backgroundColor: t.surface }]}> 
          <Text style={[styles.toggleLabel, { color: t.ink }]}>Reminder</Text>
          <Switch value={reminder} onValueChange={setReminder} trackColor={{ true: t.accentBtn }} />
        </View>

        <View style={[styles.toggleRow, { borderColor: t.border, backgroundColor: t.surface }]}> 
          <Text style={[styles.toggleLabel, { color: t.ink }]}>Streak Tracking</Text>
          <Switch value={streakTracking} onValueChange={setStreakTracking} trackColor={{ true: t.accentBtn }} />
        </View>

        <AnimatedPressable style={[styles.saveBtn, { backgroundColor: t.accentBtn }]} onPress={handleSave}>
          <Text style={[styles.saveText, { color: onAccent }]}>Save Habit</Text>
        </AnimatedPressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  t,
  children,
  style,
}: {
  label: string;
  t: any;
  children: React.ReactNode;
  style?: any;
}) {
  return (
    <View style={style}>
      <Text style={[styles.label, { color: t.ink3 }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: F.bold,
    fontSize: 18,
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  searchPill: {
    borderWidth: 1,
    borderRadius: 50,
    paddingHorizontal: 14,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: F.regular,
    fontSize: 14,
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  iconCell: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 22,
  },
  colorRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeBtn: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontFamily: F.semibold,
    fontSize: 12,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  label: {
    fontFamily: F.semibold,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: F.medium,
    fontSize: 14,
  },
  twoCol: {
    flexDirection: 'row',
    gap: 10,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayPill: {
    flex: 1,
    borderRadius: 50,
    borderWidth: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontFamily: F.semibold,
    fontSize: 12,
  },
  toggleRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabel: {
    fontFamily: F.medium,
    fontSize: 14,
  },
  saveBtn: {
    marginTop: 8,
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontFamily: F.bold,
    fontSize: 15,
  },
});

