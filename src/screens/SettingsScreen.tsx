// ─── SettingsScreen (Me Tab) ─────────────────────────────────────────────────

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  TextInput, Alert, Platform, Linking, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../theme/ThemeContext';
import { THEME_LIST } from '../theme/themes';
import { F } from '../theme/fonts';
import { getReadableTextColor } from '../theme/contrast';
import { useUserStore } from '../store/userStore';
import { useStepsStore } from '../store/stepsStore';
import { mmkvStorage } from '../store/mmkv';
import { shareExport, importAllData, clearAllData, ExportFormat } from '../utils/dataExport';
import { loadDemoData } from '../utils/demoData';
import { shareWeeklyPDF } from '../services/pdfExport';
import { shareWorkoutSummary, inviteFriend } from '../services/socialShare';
import { scheduleReminder, cancelAllReminders } from '../services/notifications';
import { useGymStore } from '../store/gymStore';
import { useHabitStore } from '../store/habitStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useWeightStore } from '../store/weightStore';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import NavBar from '../components/shared/NavBar';
import PopupSheet from '../components/shared/PopupSheet';
import InitialsAvatar from '../components/ui/InitialsAvatar';

export default function SettingsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { theme: t, themeId, setThemeId, isDark } = useAppTheme();
  const { user, setName, setUnit, loadUser } = useUserStore();
  const {
    source: stepsSource,
    status: stepsStatus,
    todayCount: stepsTodayCount,
    requestPermissions,
    syncLast30Days,
  } = useStepsStore();

  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState(user.name);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showUnitsPicker, setShowUnitsPicker] = useState(false);
  const [healthConnecting, setHealthConnecting] = useState(false);
  const [healthSyncing, setHealthSyncing] = useState(false);
  const [showWatchGuide, setShowWatchGuide] = useState(false);
  const onAccent = getReadableTextColor(t.accentBtn);

  const lastSyncRaw = mmkvStorage.getString('steps_last_sync');
  const lastSyncMs = lastSyncRaw ? Number(lastSyncRaw) : 0;
  const lastSyncLabel = lastSyncMs
    ? (() => {
        const diff = Date.now() - lastSyncMs;
        if (diff < 60_000) return 'just now';
        if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
        return `${Math.floor(diff / 86_400_000)}d ago`;
      })()
    : 'never';

  const stepsConnected = stepsSource !== 'none';
  const stepsSourceLabel =
    stepsSource === 'google-fit' ? 'Google Fit'
    : stepsSource === 'health-connect' ? 'Health Connect'
    : 'Not connected';

  function showMsg(title: string, message: string) {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  }

  async function handleConnectHealth() {
    if (Platform.OS !== 'android') {
      showMsg('Not supported', 'Google Fit / Health Connect is only available on Android.');
      return;
    }
    setHealthConnecting(true);
    try {
      const granted = await requestPermissions();
      if (granted) {
        await syncLast30Days();
        mmkvStorage.set('steps_last_sync', String(Date.now()));
        showMsg('Connected!', `Steps synced from ${stepsSourceLabel}.`);
      } else {
        showMsg(
          'Permission denied',
          'Grant Health / Google Fit permission in your device Settings to sync steps.',
        );
      }
    } catch (e) {
      showMsg('Error', String(e));
    } finally {
      setHealthConnecting(false);
    }
  }

  async function handleSyncNow() {
    setHealthSyncing(true);
    try {
      await syncLast30Days();
      mmkvStorage.set('steps_last_sync', String(Date.now()));
      showMsg('Synced', `${stepsTodayCount().toLocaleString()} steps today.`);
    } catch (e) {
      showMsg('Sync failed', String(e));
    } finally {
      setHealthSyncing(false);
    }
  }


  function reloadAllStores() {
    const { useGymStore } = require('../store/gymStore');
    const { useHabitStore } = require('../store/habitStore');
    const { useNotesStore } = require('../store/notesStore');
    const { useWeightStore } = require('../store/weightStore');
    const { useNutritionStore } = require('../store/nutritionStore');
    const { useMeasurementsStore } = require('../store/measurementsStore');
    const { useStepsStore } = require('../store/stepsStore');

    useGymStore.getState().load();
    useHabitStore.getState().load();
    useNotesStore.getState().load();
    useWeightStore.getState().load();
    useNutritionStore.getState().load();
    useMeasurementsStore.getState().load();
    useStepsStore.getState().load();
    loadUser();
  }

  function saveName() {
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    setName(trimmed);
    setEditName(false);
  }

  async function handleExport(format: ExportFormat) {
    try {
      await shareExport(format);
      showMsg('Export Complete', `Exported as ${format.toUpperCase()}.`);
    } catch (e) {
      showMsg('Export Failed', String(e));
    }
  }

  async function handleImport() {
    if (!importText.trim()) {
      showMsg('Empty', 'Paste your JSON backup first.');
      return;
    }
    const ok = Platform.OS === 'web'
      ? window.confirm('This will OVERWRITE all existing data. Continue?')
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Import Data', 'This will OVERWRITE all data. Continue?', [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Import', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!ok) return;
    try {
      await importAllData(importText.trim());
      reloadAllStores();
      showMsg('Done', 'Data imported. Changes applied.');
      setShowImport(false);
      setImportText('');
    } catch (e) {
      showMsg('Import Failed', 'Invalid JSON format.');
    }
  }

  async function handleClearAll() {
    const ok = Platform.OS === 'web'
      ? window.confirm('Delete ALL data — workouts, habits, notes. Sure?')
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Clear ALL Data', 'This deletes everything. Sure?', [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Delete Everything', style: 'destructive', onPress: () => resolve(true) },
          ])
        );
    if (!ok) return;
    await clearAllData();
    reloadAllStores();
    setThemeId(THEME_LIST[0]?.id ?? 'mono-light');
    showMsg('Done', 'All data cleared.');
  }

  async function handleLoadDemo() {
    const ok = Platform.OS === 'web'
      ? window.confirm('Load demo data? This overwrites existing data.')
      : await new Promise<boolean>((resolve) =>
          Alert.alert('Load Demo Data', 'This will overwrite existing data. Continue?', [
            { text: 'Cancel', onPress: () => resolve(false) },
            { text: 'Load', style: 'default', onPress: () => resolve(true) },
          ])
        );
    if (!ok) return;
    try {
      await loadDemoData();
      reloadAllStores();
      showMsg('Done', 'Demo data loaded!');
    } catch (e: any) {
      showMsg('Error', e.message);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        <NavBar title="Me" noPadTop />

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[styles.avatarWrap, { borderColor: t.surface3 }]}>
            <InitialsAvatar name={user.name || 'Athlete'} size={42} />
          </View>
          <View style={{ flex: 1 }}>
            {editName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TextInput
                  style={[styles.nameInput, { backgroundColor: t.surface2, color: t.ink }]}
                  value={nameInput}
                  onChangeText={setNameInput}
                  autoFocus
                  onSubmitEditing={saveName}
                  returnKeyType="done"
                />
                <AnimatedPressable onPress={saveName} style={[styles.saveNameBtn, { backgroundColor: t.accentBtn }]}>
                  <Ionicons name="checkmark" size={16} color={onAccent} />
                </AnimatedPressable>
              </View>
            ) : (
              <>
                <Text style={[styles.profileName, { color: t.ink }]}>{user.name || 'Tap to set name'}</Text>
                <Text style={[styles.profileSub, { color: t.ink3 }]}>Tap to edit</Text>
              </>
            )}
          </View>
          <AnimatedPressable
            onPress={() => { setNameInput(user.name); setEditName(true); }}
            style={[styles.editBtn, { backgroundColor: t.surface2, borderColor: t.border }]}
          >
            <Text style={[styles.editBtnTxt, { color: t.ink3 }]}>Edit</Text>
          </AnimatedPressable>
        </View>

        {/* Appearance */}
        <SettingsGroup label="APPEARANCE" t={t}>
          <SettingsRow
            icon="color-palette-outline" label="Theme" t={t}
            right={
              <View style={[styles.currentThemeBadge, { backgroundColor: t.surface2 }]}>
                <View style={[styles.currentThemeDot, { backgroundColor: t.accent }]} />
                <Text style={[styles.currentThemeText, { color: t.ink3 }]}>
                  {THEME_LIST.find((th) => th.id === themeId)?.name ?? 'Coral'}
                </Text>
              </View>
            }
            onPress={() => setShowThemePicker(true)}
          />
          <SettingsRow
            icon="stats-chart-outline" label="Weekly Review" t={t} bordered
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={() => navigation.navigate('WeeklyReviewScreen')}
          />
          <SettingsRow
            icon="resize-outline" label="Units" t={t} bordered
            right={<Text style={[styles.currentThemeText, { color: t.ink3 }]}>{user.unit.toUpperCase()}</Text>}
            onPress={() => setShowUnitsPicker(true)}
          />
          <SettingsRow
            icon="body-outline" label="Body Measurements" t={t} bordered
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={() => navigation.navigate('MeasurementsScreen')}
          />
          <SettingsRow
            icon="notifications-outline" label="Notifications" t={t} bordered
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={() => Linking.openSettings()}
          />
        </SettingsGroup>

        {/* Health & Steps */}
        <SettingsGroup label="HEALTH &amp; STEPS" t={t}>
          {/* Connection status row */}
          <View style={[styles.settingRow, { minHeight: 56 }]}>
            <View style={[styles.rowIcon, { backgroundColor: stepsConnected ? 'rgba(34,197,94,0.1)' : t.surface2 }]}>
              <Ionicons
                name={stepsConnected ? 'checkmark-circle' : 'walk-outline'}
                size={15}
                color={stepsConnected ? '#22c55e' : t.ink3}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowLabel, { color: t.ink }]}>
                {stepsConnected ? stepsSourceLabel : 'Google Fit / Health Connect'}
              </Text>
              <Text style={[{ fontFamily: F.regular, fontSize: 11, color: t.ink4, marginTop: 1 }]}>
                {stepsConnected
                  ? `${stepsTodayCount().toLocaleString()} steps today · synced ${lastSyncLabel}`
                  : 'Tap Connect to sync steps from your device'}
              </Text>
            </View>
            {/* Connect / Connected badge */}
            <AnimatedPressable
              onPress={stepsConnected ? handleSyncNow : handleConnectHealth}
              style={[
                styles.healthBtn,
                { backgroundColor: stepsConnected ? t.surface2 : t.accentBtn },
              ]}
              disabled={healthConnecting || healthSyncing}
            >
              {(healthConnecting || healthSyncing) ? (
                <ActivityIndicator size="small" color={stepsConnected ? t.ink3 : onAccent} />
              ) : (
                <Text style={[styles.healthBtnText, { color: stepsConnected ? t.ink3 : onAccent }]}>
                  {stepsConnected ? 'Sync' : 'Connect'}
                </Text>
              )}
            </AnimatedPressable>
          </View>

          {/* If connected, show re-connect option */}
          {stepsConnected && (
            <SettingsRow
              icon="refresh-outline" label="Reconnect account" t={t} bordered
              right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
              onPress={handleConnectHealth}
            />
          )}

          {/* Open system settings shortcut */}
          <SettingsRow
            icon="settings-outline"
            label="Open device Health settings"
            t={t}
            bordered
            right={<Ionicons name="open-outline" size={13} color={t.ink4} />}
            onPress={() => Linking.openSettings()}
          />

          {/* Watch setup guide */}
          <SettingsRow
            icon="watch-outline"
            label="Connect my smartwatch"
            t={t}
            bordered
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={() => setShowWatchGuide(true)}
          />
        </SettingsGroup>

        {/* Data */}
        <SettingsGroup label="DATA" t={t}>
          <SettingsRow icon="download-outline" label="Export as JSON" t={t}
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={() => handleExport('json')} />
          <SettingsRow icon="document-text-outline" label="Export as CSV" t={t} bordered
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={() => handleExport('csv')} />
          <SettingsRow icon="push-outline" label="Import from JSON" t={t} bordered
            right={<Ionicons name={showImport ? 'chevron-up' : 'chevron-forward'} size={13} color={t.ink4} />}
            onPress={() => setShowImport(!showImport)} />
          {showImport && (
            <View style={[styles.importSection, { borderTopColor: t.surface2 }]}>
              <TextInput
                style={[styles.importInput, { backgroundColor: t.surface2, color: t.ink }]}
                value={importText}
                onChangeText={setImportText}
                placeholder="Paste your JSON backup here..."
                placeholderTextColor={t.ink4}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
              <AnimatedPressable style={[styles.importBtn, { backgroundColor: t.accentBtn }]} onPress={handleImport}>
                <Text style={[styles.importBtnText, { color: onAccent }]}>Import Data</Text>
              </AnimatedPressable>
            </View>
          )}
          <SettingsRow icon="rocket-outline" label="Load Demo Data" t={t} bordered
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={handleLoadDemo} />
          <SettingsRow icon="trash-outline" label="Clear All Data" t={t} bordered danger
            right={<Ionicons name="chevron-forward" size={13} color="rgba(239,68,68,0.4)" />}
            onPress={handleClearAll} />
        </SettingsGroup>

        {/* Notifications */}
        <SettingsGroup label="NOTIFICATIONS" t={t}>
          <SettingsRow
            icon="water-outline"
            label="Water Reminder"
            t={t}
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={async () => {
              const id = await scheduleReminder({
                type: 'water',
                title: 'Hydration Check',
                body: 'Time to drink a glass of water 💧',
                hour: 14,
                minute: 0,
              });
              showMsg('Scheduled', id ? 'Daily water reminder set for 2:00 PM.' : 'Permission denied.');
            }}
          />
          <SettingsRow
            icon="barbell-outline"
            label="Workout Reminder"
            t={t}
            bordered
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={async () => {
              const id = await scheduleReminder({
                type: 'workout',
                title: 'Workout Time',
                body: 'Keep the streak alive 🔥',
                hour: 18,
                minute: 0,
              });
              showMsg('Scheduled', id ? 'Daily workout reminder set for 6:00 PM.' : 'Permission denied.');
            }}
          />
          <SettingsRow
            icon="notifications-off-outline"
            label="Cancel All Reminders"
            t={t}
            bordered
            right={<Ionicons name="chevron-forward" size={13} color="rgba(239,68,68,0.4)" />}
            onPress={async () => {
              await cancelAllReminders();
              showMsg('Done', 'All reminders cancelled.');
            }}
          />
        </SettingsGroup>

        {/* Reports */}
        <SettingsGroup label="REPORTS" t={t}>
          <SettingsRow
            icon="document-outline"
            label="Export Weekly PDF"
            t={t}
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={async () => {
              try {
                const { sessions } = useGymStore.getState();
                const { habits } = useHabitStore.getState();
                const { entries, goal } = useNutritionStore.getState();
                const { entries: weightEntries } = useWeightStore.getState();
                await shareWeeklyPDF({
                  weekLabel: 'This Week',
                  sessions: sessions.slice(0, 7),
                  habits,
                  entries: entries.filter((e) => {
                    const d = new Date(e.date);
                    return d >= new Date(Date.now() - 7 * 86400000);
                  }),
                  goal,
                  weightEntries: weightEntries.slice(-7),
                });
              } catch (e: any) {
                showMsg('Export Failed', e.message);
              }
            }}
          />
        </SettingsGroup>

        {/* Social */}
        <SettingsGroup label="SOCIAL" t={t}>
          <SettingsRow
            icon="share-outline"
            label="Share Workout"
            t={t}
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={async () => {
              const { sessions, prs } = useGymStore.getState();
              const last = sessions[0];
              if (!last) {
                showMsg('No Workout', 'Log a workout first.');
                return;
              }
              const sets = last.exercises.reduce((s, e) => s + e.sets.length, 0);
              await shareWorkoutSummary(last.dayName, last.totalVolume, Math.round(last.durationSeconds / 60), sets, prs.length);
            }}
          />
          <SettingsRow
            icon="people-outline"
            label="Invite a Friend"
            t={t}
            bordered
            right={<Ionicons name="chevron-forward" size={13} color={t.ink4} />}
            onPress={() => inviteFriend()}
          />
        </SettingsGroup>

        {/* About */}
        <SettingsGroup label="ABOUT" t={t}>
          {[
            { label: 'IronLog', value: 'Gym & Habit Tracker' },
            { label: 'Version', value: '1.0.0' },
            { label: 'Built with', value: 'Expo + React Native' },
          ].map(({ label, value }, i) => (
            <View
              key={label}
              style={[styles.aboutRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.surface2 }]}
            >
              <Text style={[styles.aboutLabel, { color: t.ink3 }]}>{label}</Text>
              <Text style={[styles.aboutValue, { color: t.ink4 }]}>{value}</Text>
            </View>
          ))}
        </SettingsGroup>
      </ScrollView>

      {/* Theme Picker */}
      <PopupSheet visible={showThemePicker} onClose={() => setShowThemePicker(false)} maxHeight={'76%'}>
        <Text style={[styles.pickerTitle, { color: t.ink }]}>Choose Theme</Text>
        <ScrollView showsVerticalScrollIndicator contentContainerStyle={styles.themeGrid}>
          {THEME_LIST.map((th) => {
            const selected = th.id === themeId;
            return (
              <Pressable
                key={th.id}
                style={[
                  styles.themeTile,
                  { backgroundColor: th.bg, borderColor: selected ? th.accent : th.border },
                  selected && { borderWidth: 2.5 },
                ]}
                onPress={() => { setThemeId(th.id); setShowThemePicker(false); }}
              >
                <View style={styles.themeTilePreview}>
                  <View style={[styles.previewDot, { backgroundColor: th.tile1Bg[0] }]} />
                  <View style={[styles.previewDot, { backgroundColor: th.tile2Bg[0] }]} />
                  <View style={[styles.previewDot, { backgroundColor: th.accent }]} />
                </View>
                <Text style={[styles.themeTileLabel, { color: th.ink }]} numberOfLines={1}>{th.name}</Text>
                {selected && (
                  <View style={[styles.selectedRing, { borderColor: th.accent }]}>
                    <Ionicons name="checkmark" size={10} color={th.accent} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </PopupSheet>

      <PopupSheet visible={showUnitsPicker} onClose={() => setShowUnitsPicker(false)}>
        <Text style={[styles.pickerTitle, { color: t.ink }]}>Units</Text>
        <View style={{ gap: 10 }}>
          {(['kg', 'lbs'] as const).map((unit) => {
            const selected = user.unit === unit;
            return (
              <Pressable
                key={unit}
                style={[
                  styles.settingRow,
                  { borderRadius: 14, borderWidth: 1, borderColor: selected ? t.accentBtn : t.border, backgroundColor: t.surface },
                ]}
                onPress={() => { setUnit(unit); setShowUnitsPicker(false); }}
              >
                <Text style={[styles.rowLabel, { color: t.ink }]}>{unit.toUpperCase()}</Text>
                {selected ? <Ionicons name="checkmark" size={16} color={t.accentBtn} /> : null}
              </Pressable>
            );
          })}
        </View>
      </PopupSheet>

      {/* Watch Setup Guide */}
      <PopupSheet visible={showWatchGuide} onClose={() => setShowWatchGuide(false)}>
        <Text style={[styles.pickerTitle, { color: t.ink }]}>Connect Your Watch</Text>
        <Text style={[watchGuideS.intro, { color: t.ink3 }]}>
          IronLog reads steps from <Text style={{ color: t.ink, fontFamily: F.semibold }}>Google Fit</Text> and{' '}
          <Text style={{ color: t.ink, fontFamily: F.semibold }}>Health Connect</Text>.
          {'\n\n'}Your watch syncs to its companion app, which writes data to Google Fit or Health Connect.
          IronLog picks it up from there — no direct Bluetooth connection is needed.
        </Text>

        {/* Flow diagram */}
        <View style={[watchGuideS.flowRow, { borderColor: t.border }]}>
          <View style={[watchGuideS.flowChip, { backgroundColor: t.surface2 }]}>
            <Ionicons name="watch-outline" size={14} color={t.ink3} />
            <Text style={[watchGuideS.flowText, { color: t.ink3 }]}>Watch</Text>
          </View>
          <Ionicons name="arrow-forward" size={12} color={t.ink4} />
          <View style={[watchGuideS.flowChip, { backgroundColor: t.surface2 }]}>
            <Ionicons name="phone-portrait-outline" size={14} color={t.ink3} />
            <Text style={[watchGuideS.flowText, { color: t.ink3 }]}>Companion App</Text>
          </View>
          <Ionicons name="arrow-forward" size={12} color={t.ink4} />
          <View style={[watchGuideS.flowChip, { backgroundColor: t.surface2 }]}>
            <Ionicons name="fitness-outline" size={14} color={t.ink3} />
            <Text style={[watchGuideS.flowText, { color: t.ink3 }]}>Google Fit</Text>
          </View>
          <Ionicons name="arrow-forward" size={12} color={t.ink4} />
          <View style={[watchGuideS.flowChip, { backgroundColor: t.accentBtn + '22' }]}>
            <Text style={[watchGuideS.flowText, { color: t.accentBtn, fontFamily: F.bold }]}>IronLog</Text>
          </View>
        </View>

        {/* Per-brand instructions */}
        {[
          {
            brand: 'Samsung Galaxy Watch',
            app: 'Samsung Health',
            icon: 'logo-google' as const,
            steps: [
              'Open Samsung Health → Profile → Connected Services',
              'Enable "Health Connect"',
              'In Health Connect, allow Steps permission for IronLog',
              'Tap "Connect" in IronLog Settings → Health & Steps',
            ],
          },
          {
            brand: 'Garmin',
            app: 'Garmin Connect',
            icon: 'navigate-circle-outline' as const,
            steps: [
              'Open Garmin Connect → More → Settings → Partner Apps',
              'Enable "Google Fit"',
              'Wait for first sync (~15 min)',
              'Tap "Connect" in IronLog Settings → Health & Steps',
            ],
          },
          {
            brand: 'Fitbit',
            app: 'Fitbit App',
            icon: 'heart-outline' as const,
            steps: [
              'Open Fitbit app → Today → Your Profile',
              'Settings → Apps → Google Fit → Enable',
              'Tap "Connect" in IronLog Settings → Health & Steps',
            ],
          },
          {
            brand: 'Mi Band / Xiaomi',
            app: 'Mi Fitness',
            icon: 'flash-outline' as const,
            steps: [
              'Open Mi Fitness → Profile → Third-party apps',
              'Enable "Google Fit"',
              'Tap "Connect" in IronLog Settings → Health & Steps',
            ],
          },
          {
            brand: 'Fossil / Wear OS',
            app: 'Google Fit (native)',
            icon: 'time-outline' as const,
            steps: [
              'Wear OS watches sync to Google Fit automatically',
              'Just tap "Connect" in IronLog Settings → Health & Steps',
            ],
          },
          {
            brand: 'Amazfit',
            app: 'Zepp',
            icon: 'pulse-outline' as const,
            steps: [
              'Open Zepp app → Profile → Connect Third-party App',
              'Enable "Google Fit"',
              'Tap "Connect" in IronLog Settings → Health & Steps',
            ],
          },
        ].map((brand) => (
          <View key={brand.brand} style={[watchGuideS.brandCard, { borderColor: t.border, backgroundColor: t.surface2 }]}>
            <View style={watchGuideS.brandHeader}>
              <Ionicons name={brand.icon} size={16} color={t.ink2} />
              <View style={{ flex: 1 }}>
                <Text style={[watchGuideS.brandName, { color: t.ink }]}>{brand.brand}</Text>
                <Text style={[watchGuideS.brandApp, { color: t.ink4 }]}>via {brand.app}</Text>
              </View>
            </View>
            {brand.steps.map((step, i) => (
              <View key={i} style={watchGuideS.stepRow}>
                <View style={[watchGuideS.stepNum, { backgroundColor: t.accentBtn + '22' }]}>
                  <Text style={[watchGuideS.stepNumText, { color: t.accentBtn }]}>{i + 1}</Text>
                </View>
                <Text style={[watchGuideS.stepText, { color: t.ink2 }]}>{step}</Text>
              </View>
            ))}
          </View>
        ))}

        <AnimatedPressable
          style={[watchGuideS.connectBtn, { backgroundColor: t.accentBtn }]}
          onPress={() => { setShowWatchGuide(false); handleConnectHealth(); }}
        >
          <Ionicons name="link-outline" size={15} color={onAccent} />
          <Text style={[watchGuideS.connectBtnText, { color: onAccent }]}>Connect Google Fit now</Text>
        </AnimatedPressable>
      </PopupSheet>
    </View>
  );
}

function SettingsGroup({ label, t, children }: { label: string; t: any; children: React.ReactNode }) {
  return (
    <>
      <Text style={[styles.groupLabel, { color: t.ink4 }]}>{label}</Text>
      <View style={[styles.group, { backgroundColor: t.surface, borderColor: t.border }]}>
        {children}
      </View>
    </>
  );
}

function SettingsRow({
  icon, label, t, bordered, danger, right, onPress, children,
}: {
  icon: string; label: string; t: any; bordered?: boolean; danger?: boolean;
  right?: React.ReactNode; onPress?: () => void; children?: React.ReactNode;
}) {
  const Row = onPress ? AnimatedPressable : View;
  return (
    <Row
      onPress={onPress}
      style={[styles.settingRow, bordered && { borderTopWidth: 0.5, borderTopColor: t.surface2 }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: danger ? 'rgba(239,68,68,0.08)' : t.surface2 }]}>
        <Ionicons name={icon as any} size={15} color={danger ? '#ef4444' : t.ink3} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: danger ? '#ef4444' : t.ink }]}>{label}</Text>
        {children}
      </View>
      {right}
    </Row>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 15, gap: 10 },
  profileCard: { borderRadius: 20, borderWidth: 1, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  profileName: { fontFamily: F.bold, fontSize: 17, letterSpacing: -0.3 },
  profileSub: { fontFamily: F.regular, fontSize: 12, marginTop: 2 },
  editBtn: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, marginLeft: 'auto' },
  editBtnTxt: { fontFamily: F.semibold, fontSize: 12 },
  nameInput: { flex: 1, borderRadius: 10, padding: 8, fontFamily: F.semibold, fontSize: 15 },
  saveNameBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  currentThemeBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5, gap: 6 },
  currentThemeDot: { width: 10, height: 10, borderRadius: 5 },
  currentThemeText: { fontFamily: F.medium, fontSize: 12 },
  groupLabel: { fontFamily: F.semibold, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 8, marginBottom: 4, marginLeft: 4 },
  group: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 14, gap: 12 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: F.medium, fontSize: 14 },
  importSection: { padding: 14, gap: 10, borderTopWidth: 0.5 },
  importInput: { borderRadius: 12, padding: 12, fontFamily: F.regular, fontSize: 13, minHeight: 80, textAlignVertical: 'top' },
  importBtn: { paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  importBtnText: { fontFamily: F.bold, fontSize: 14 },
  aboutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10 },
  aboutLabel: { fontFamily: F.regular, fontSize: 13 },
  aboutValue: { fontFamily: F.regular, fontSize: 13 },
  pickerTitle: { fontFamily: F.bold, fontSize: 20, letterSpacing: -0.4, marginBottom: 16 },
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  themeTile: { width: 95, height: 85, borderRadius: 16, borderWidth: 1, padding: 10, justifyContent: 'space-between', position: 'relative' },
  themeTilePreview: { flexDirection: 'row', gap: 4 },
  previewDot: { width: 14, height: 14, borderRadius: 7 },
  themeTileLabel: { fontFamily: F.semibold, fontSize: 9, letterSpacing: 0.2 },
  selectedRing: { position: 'absolute', top: 6, right: 6, width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  healthBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 70,
    minHeight: 32,
  },
  healthBtnText: {
    fontFamily: F.semibold,
    fontSize: 13,
  },
});

const watchGuideS = StyleSheet.create({
  intro: {
    fontFamily: F.regular,
    fontSize: 13.5,
    lineHeight: 20,
    marginBottom: 16,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  flowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  flowText: {
    fontFamily: F.medium,
    fontSize: 11,
  },
  brandCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
    gap: 8,
  },
  brandHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  brandName: {
    fontFamily: F.semibold,
    fontSize: 13.5,
  },
  brandApp: {
    fontFamily: F.regular,
    fontSize: 11,
    marginTop: 1,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepNumText: {
    fontFamily: F.bold,
    fontSize: 10,
  },
  stepText: {
    fontFamily: F.regular,
    fontSize: 12.5,
    flex: 1,
    lineHeight: 18,
  },
  connectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    marginTop: 6,
  },
  connectBtnText: {
    fontFamily: F.semibold,
    fontSize: 14,
  },
});

