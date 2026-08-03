// ─── HomeScreen ──────────────────────────────────────────────────────────────
// ScrollView. NavBar (name, date, avatar). 2×2 GradientTiles.
// Tile1: workouts/week → WorkoutPopup
// Tile2: weight kg → WeightPopup
// Tile3: weekly volume → VolumePopup
// Tile4 (dark): habits X/N → HabitPopup
// SectionHeader "This Week" → WeekTile

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format, subDays } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline } from 'react-native-svg';

import { useAppTheme } from '../theme/ThemeContext';
import { getReadableTextColor } from '../theme/contrast';
import { F } from '../theme/fonts';
import { useUserStore } from '../store/userStore';
import { useGymStore } from '../store/gymStore';
import { useHabitStore, isCompletedOn } from '../store/habitStore';
import { useNutritionStore } from '../store/nutritionStore';
import { useWeightStore } from '../store/weightStore';
import { useStepsStore } from '../store/stepsStore';
import { useSpotifyStore, SpotifyTileTheme, SpotifyTrack } from '../store/spotifyStore';
import { getWeeklyAdherenceSummary } from '../utils/weeklyAdherence';

import NavBar from '../components/shared/NavBar';
import GradientTile from '../components/shared/GradientTile';
import PopupSheet from '../components/shared/PopupSheet';
import InitialsAvatar from '../components/ui/InitialsAvatar';
import ScrollPicker from '../components/ui/ScrollPicker';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import { HomeScreenSkeleton } from '../components/ui/SkeletonLoader';

// ── Helpers ───────────────────────────────────────────
function makeDays(days: number) {
  return Array.from({ length: days }, (_, i) => {
    const date = subDays(new Date(), days - i - 1);
    return format(date, 'yyyy-MM-dd');
  });
}

type PopupType = 'workouts' | 'weight' | 'habits' | 'volume' | 'steps' | 'spotify' | null;

// ── Spotify Tile Theme Palettes ───────────────────────
const SPOTIFY_PALETTES: Record<SpotifyTileTheme, { bg: string; bg2: string; fg: string; fg2: string; accent: string; controlBg: string }> = {
  'spotify-dark': { bg: '#121212', bg2: '#181818', fg: '#FFFFFF', fg2: '#B3B3B3', accent: '#1DB954', controlBg: 'rgba(255,255,255,0.08)' },
  'spotify-light': { bg: '#FFFFFF', bg2: '#F5F5F5', fg: '#121212', fg2: '#535353', accent: '#1DB954', controlBg: 'rgba(0,0,0,0.05)' },
  'spotify-brand': { bg: '#1DB954', bg2: '#18A449', fg: '#101010', fg2: 'rgba(16,16,16,0.68)', accent: '#101010', controlBg: 'rgba(0,0,0,0.12)' },
  'app-theme': { bg: '', bg2: '', fg: '', fg2: '', accent: '', controlBg: '' }, // filled dynamically
};

function getSpotifyPalette(mode: SpotifyTileTheme, t: any) {
  if (mode === 'app-theme') {
    return { bg: t.surface, bg2: t.surface2, fg: t.ink, fg2: t.ink3, accent: t.accentBtn, controlBg: t.surface2 };
  }
  return SPOTIFY_PALETTES[mode] ?? SPOTIFY_PALETTES['spotify-dark'];
}

function formatSpotifyMs(ms: number) {
  const safe = Math.max(0, ms || 0);
  const m = Math.floor(safe / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function InteractiveBar({
  value,
  max,
  fill,
  track,
  height = 5,
  onChange,
}: {
  value: number;
  max: number;
  fill: string;
  track: string;
  height?: number;
  onChange: (value: number) => void;
}) {
  const [width, setWidth] = useState(1);
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;

  return (
    <Pressable
      onLayout={(event) => setWidth(Math.max(1, event.nativeEvent.layout.width))}
      onPress={(event) => {
        const x = Math.max(0, Math.min(width, event.nativeEvent.locationX));
        onChange(max > 0 ? (x / width) * max : 0);
      }}
      style={[npStyles.interactiveTrack, { backgroundColor: track, height, borderRadius: height / 2 }]}
    >
      <View style={[npStyles.interactiveFill, { width: `${pct}%`, backgroundColor: fill, borderRadius: height / 2 }]} />
    </Pressable>
  );
}

function SpotifyThemeIcon({ themeKey, color }: { themeKey: SpotifyTileTheme; color: string }) {
  const icon = themeKey === 'spotify-light'
    ? 'sunny-outline'
    : themeKey === 'spotify-dark'
      ? 'moon-outline'
      : themeKey === 'spotify-brand'
        ? 'logo-spotify'
        : 'color-palette-outline';
  return <Ionicons name={icon as any} size={13} color={color} />;
}

// ── Now Playing Tile ──────────────────────────────────
const NowPlayingTile = React.memo(function NowPlayingTile({ onPress }: { onPress: () => void }) {
  const { theme: t } = useAppTheme();
  const isAuthed = useSpotifyStore((s) => s.isAuthed);
  const playback = useSpotifyStore((s) => s.playback);
  const tileTheme = useSpotifyStore((s) => s.tileTheme);
  const play = useSpotifyStore((s) => s.play);
  const pause = useSpotifyStore((s) => s.pause);
  const skipNext = useSpotifyStore((s) => s.skipNext);
  const fetchPlayback = useSpotifyStore((s) => s.fetchPlayback);
  const track = playback?.track ?? null;
  const palette = getSpotifyPalette(tileTheme, t);
  const activePalette = isAuthed ? palette : getSpotifyPalette('app-theme', t);
  const borderColor = tileTheme === 'spotify-light' && isAuthed ? 'rgba(0,0,0,0.08)' : t.border;
  const progressPct = track?.durationMs
    ? Math.min(100, Math.max(0, ((playback?.progressMs ?? 0) / track.durationMs) * 100))
    : 0;

  const title = !isAuthed ? 'Music' : track?.name ?? 'Music';
  const subtitle = !isAuthed
    ? 'Connect Spotify from Home'
    : track?.artist ?? 'Nothing playing';

  return (
    <Pressable
      style={[npStyles.tile, { backgroundColor: activePalette.bg, borderColor }]}
      onPress={onPress}
    >
      {track?.albumArt ? (
        <Image source={{ uri: track.albumArt }} style={npStyles.albumArt} />
      ) : (
        <View style={[npStyles.albumArt, npStyles.artFallback, { backgroundColor: activePalette.controlBg }]}> 
          <Ionicons name={isAuthed ? 'musical-note-outline' : 'musical-notes-outline'} size={18} color={activePalette.fg2} />
        </View>
      )}

      <View style={npStyles.infoCol}>
        <View style={npStyles.headerLeft}>
          <View style={[npStyles.spotifyDot, { backgroundColor: '#1DB954' }]} />
          <Text style={[npStyles.headerLabel, { color: activePalette.fg2 }]}>MUSIC</Text>
        </View>
        <Text style={[npStyles.trackTitle, { color: activePalette.fg }]} numberOfLines={1}>{title}</Text>
        <Text style={[npStyles.trackArtist, { color: activePalette.fg2 }]} numberOfLines={1}>{subtitle}</Text>
        {track ? (
          <View style={[npStyles.progressBar, { backgroundColor: activePalette.controlBg }]}> 
            <View style={[npStyles.progressFill, { backgroundColor: activePalette.accent, width: `${progressPct}%` }]} />
          </View>
        ) : null}
      </View>

      <View style={npStyles.controlsRow}>
        {isAuthed && track ? (
          <>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                if (playback?.isPlaying) {
                  pause();
                } else {
                  play();
                }
              }}
              style={[npStyles.playBtn, { backgroundColor: activePalette.accent }]}
            >
              <Ionicons name={playback?.isPlaying ? 'pause' : 'play'} size={15} color="#FFFFFF" />
            </Pressable>
            <Pressable
              onPress={(event) => {
                event.stopPropagation();
                skipNext();
              }}
              hitSlop={8}
            >
              <Ionicons name="play-skip-forward" size={17} color={activePalette.fg} />
            </Pressable>
          </>
        ) : isAuthed ? (
          <Pressable
            onPress={(event) => {
              event.stopPropagation();
              fetchPlayback();
            }}
            style={[npStyles.refreshBtn, { backgroundColor: activePalette.controlBg }]}
          >
            <Ionicons name="refresh-outline" size={14} color={activePalette.fg2} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-forward" size={17} color={activePalette.fg2} />
        )}
      </View>
    </Pressable>
  );
});
function SpotifyArtwork({ track, size }: { track: SpotifyTrack | null; size: number }) {
  const { theme: t } = useAppTheme();

  if (track?.albumArt) {
    return <Image source={{ uri: track.albumArt }} style={{ width: size, height: size, borderRadius: 14 }} />;
  }

  return (
    <View
      style={[
        spotifySheetS.artFallback,
        { width: size, height: size, borderRadius: 14, backgroundColor: t.surface2 },
      ]}
    >
      <Ionicons name="disc-outline" size={Math.round(size * 0.36)} color={t.ink4} />
    </View>
  );
}

function QueueTrackRow({
  track,
  index,
  onPress,
}: {
  track: SpotifyTrack;
  index: number;
  onPress: (track: SpotifyTrack) => void;
}) {
  const { theme: t } = useAppTheme();

  return (
    <Pressable
      style={[spotifySheetS.queueRow, index > 0 && { borderTopWidth: 0.5, borderTopColor: t.surface2 }]}
      onPress={() => onPress(track)}
      disabled={!track.uri}
    >
      <SpotifyArtwork track={track} size={42} />
      <View style={{ flex: 1 }}>
        <Text style={[spotifySheetS.queueTitle, { color: t.ink }]} numberOfLines={1}>{track.name}</Text>
        <Text style={[spotifySheetS.queueArtist, { color: t.ink4 }]} numberOfLines={1}>{track.artist}</Text>
      </View>
      <Ionicons name="play-circle-outline" size={22} color={track.uri ? t.accentBtn : t.ink4} />
    </Pressable>
  );
}

function SpotifyExpandedSheet() {
  const { theme: t } = useAppTheme();
  const store = useSpotifyStore();
  const pb = store.playback;
  const track = pb?.track ?? null;
  const onAccent = getReadableTextColor(t.accentBtn);

  const refreshSpotify = () => {
    if (!store.isAuthed) return;
    store.fetchPlayback();
    store.fetchQueue();
  };

  const playQueueTrack = (item: SpotifyTrack) => {
    if (!item.uri) return;
    store.playTrackUri(item.uri);
  };

  return (
    <>
      <View style={popS.header}>
        <Text style={[popS.title, { color: t.ink }]}>Spotify</Text>
        <Pressable
          style={[spotifySheetS.iconBtn, { backgroundColor: t.surface2 }]}
          onPress={refreshSpotify}
          disabled={!store.isAuthed || store.isLoadingPlayback || store.isLoadingQueue}
        >
          {store.isLoadingPlayback || store.isLoadingQueue ? (
            <ActivityIndicator size="small" color={t.ink3} />
          ) : (
            <Ionicons name="refresh-outline" size={15} color={t.ink3} />
          )}
        </Pressable>
      </View>

      {!store.isAuthed ? (
        <View style={[spotifySheetS.notice, { backgroundColor: t.surface2 }]}>
          <Text style={[spotifySheetS.noticeText, { color: t.ink3 }]}>Open Music from Home to connect Spotify.</Text>
        </View>
      ) : (
        <>
          <View style={[spotifySheetS.nowCard, { backgroundColor: t.surface2 }]}>
            <SpotifyArtwork track={track} size={84} />
            <View style={spotifySheetS.nowInfo}>
              <Text style={[spotifySheetS.nowLabel, { color: t.ink4 }]}>NOW PLAYING</Text>
              <Text style={[spotifySheetS.nowTitle, { color: t.ink }]} numberOfLines={2}>
                {track?.name ?? 'Nothing playing'}
              </Text>
              <Text style={[spotifySheetS.nowArtist, { color: t.ink3 }]} numberOfLines={1}>
                {track?.artist ?? 'Start playback in Spotify'}
              </Text>
            </View>
          </View>

          {track ? (
            <>
              <View style={spotifySheetS.timeRow}>
                <Text style={[spotifySheetS.timeText, { color: t.ink4 }]}>{formatSpotifyMs(pb?.progressMs ?? 0)}</Text>
                <InteractiveBar
                  value={pb?.progressMs ?? 0}
                  max={track.durationMs}
                  fill={t.accentBtn}
                  track={t.surface3}
                  height={6}
                  onChange={store.seekToPosition}
                />
                <Text style={[spotifySheetS.timeText, { color: t.ink4 }]}>{formatSpotifyMs(track.durationMs)}</Text>
              </View>

              <View style={spotifySheetS.controlRow}>
                <Pressable
                  onPress={store.toggleShuffle}
                  style={[spotifySheetS.controlBtn, { backgroundColor: t.surface2 }]}
                >
                  <Ionicons name="shuffle" size={18} color={pb?.shuffleState ? t.accentBtn : t.ink3} />
                </Pressable>
                <Pressable
                  onPress={store.skipPrevious}
                  style={[spotifySheetS.controlBtn, { backgroundColor: t.surface2 }]}
                >
                  <Ionicons name="play-skip-back" size={19} color={t.ink} />
                </Pressable>
                <Pressable
                  onPress={pb?.isPlaying ? store.pause : store.play}
                  style={[spotifySheetS.playBtnLarge, { backgroundColor: t.accentBtn }]}
                >
                  <Ionicons name={pb?.isPlaying ? 'pause' : 'play'} size={22} color={onAccent} />
                </Pressable>
                <Pressable
                  onPress={store.skipNext}
                  style={[spotifySheetS.controlBtn, { backgroundColor: t.surface2 }]}
                >
                  <Ionicons name="play-skip-forward" size={19} color={t.ink} />
                </Pressable>
                <Pressable
                  onPress={store.cycleRepeat}
                  style={[spotifySheetS.controlBtn, { backgroundColor: t.surface2 }]}
                >
                  <Ionicons
                    name="repeat"
                    size={18}
                    color={pb?.repeatState === 'off' ? t.ink3 : t.accentBtn}
                  />
                </Pressable>
              </View>
            </>
          ) : null}

          {!!store.playbackError && (
            <View style={[spotifySheetS.notice, { backgroundColor: t.surface2 }]}>
              <Text style={[spotifySheetS.noticeText, { color: '#ef4444' }]}>{store.playbackError}</Text>
            </View>
          )}

          <View style={spotifySheetS.queueHeader}>
            <Text style={[spotifySheetS.queueHeading, { color: t.ink }]}>Queue</Text>
            <Text style={[spotifySheetS.queueCount, { color: t.ink4 }]}>{store.queue.length} upcoming</Text>
          </View>

          {store.isLoadingQueue && store.queue.length === 0 ? (
            <ActivityIndicator color={t.accentBtn} style={{ marginVertical: 16 }} />
          ) : null}

          {!store.isLoadingQueue && store.queue.length === 0 ? (
            <View style={[spotifySheetS.notice, { backgroundColor: t.surface2 }]}>
              <Text style={[spotifySheetS.noticeText, { color: t.ink3 }]}>No upcoming songs returned by Spotify.</Text>
            </View>
          ) : (
            <View style={[spotifySheetS.queueList, { borderColor: t.border }]}>
              {store.queue.slice(0, 30).map((item, index) => (
                <QueueTrackRow
                  key={`${item.uri || item.id}-${index}`}
                  track={item}
                  index={index}
                  onPress={playQueueTrack}
                />
              ))}
            </View>
          )}
        </>
      )}
    </>
  );
}

const spotifySheetS = StyleSheet.create({
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowCard: {
    flexDirection: 'row',
    gap: 14,
    borderRadius: 18,
    padding: 14,
    marginTop: 8,
    marginBottom: 14,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  nowInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  nowLabel: {
    fontFamily: F.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 5,
  },
  nowTitle: {
    fontFamily: F.bold,
    fontSize: 18,
    letterSpacing: -0.4,
    lineHeight: 22,
  },
  nowArtist: {
    fontFamily: F.regular,
    fontSize: 12.5,
    marginTop: 4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  timeText: {
    fontFamily: F.mono,
    fontSize: 10,
    minWidth: 34,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 18,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtnLarge: {
    width: 50,
    height: 50,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notice: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
  },
  noticeText: {
    fontFamily: F.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  queueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  queueHeading: {
    fontFamily: F.bold,
    fontSize: 16,
    letterSpacing: -0.2,
  },
  queueCount: {
    fontFamily: F.medium,
    fontSize: 11,
  },
  queueList: {
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
  },
  queueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  queueTitle: {
    fontFamily: F.medium,
    fontSize: 13.5,
  },
  queueArtist: {
    fontFamily: F.regular,
    fontSize: 11.5,
    marginTop: 2,
  },
});

const npStyles = StyleSheet.create({
  tile: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  spotifyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerLabel: {
    fontFamily: F.semibold,
    fontSize: 10,
    letterSpacing: 0.8,
  },
  themeRow: {
    flexDirection: 'row',
    gap: 5,
  },
  themeDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  emptyText: {
    fontFamily: F.regular,
    fontSize: 13,
    flex: 1,
  },
  refreshBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    gap: 12,
  },
  albumArt: {
    width: 44,
    height: 44,
    borderRadius: 12,
  },
  artFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
    gap: 2,
    minWidth: 0,
  },
  trackTitle: {
    fontFamily: F.bold,
    fontSize: 13.5,
    letterSpacing: -0.2,
  },
  trackArtist: {
    fontFamily: F.regular,
    fontSize: 11.5,
    marginBottom: 3,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressTime: {
    fontFamily: F.mono,
    fontSize: 8.5,
  },
  progressBar: {
    flex: 1,
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  interactiveTrack: {
    flex: 1,
    overflow: 'hidden',
  },
  interactiveFill: {
    height: '100%',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 0,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});


// ── Sparkline SVG (BR decoration) ─────────────────────
function TileSparkline({ data, color, width = 42, height = 22 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`)
    .join(' ');
  return (
    <View style={{ position: 'absolute', bottom: 12, right: 12, opacity: 0.3, zIndex: 2 }}>
      <Svg width={width} height={height}>
        <Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

// ── Stat Row (used in popups) ─────────────────────────
function StatRow({ stats }: { stats: { label: string; value: string; unit?: string }[] }) {
  const { theme: t } = useAppTheme();
  return (
    <View style={[srStyles.row, { backgroundColor: t.surface2 }]}>
      {stats.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <View style={[srStyles.div, { backgroundColor: t.border }]} />}
          <View style={srStyles.col}>
            <Text style={[srStyles.label, { color: t.ink3 }]}>{s.label}</Text>
            <Text style={[srStyles.val, { color: t.ink }]}>
              {s.value}
              {s.unit ? <Text style={[srStyles.unit, { color: t.ink3 }]}> {s.unit}</Text> : null}
            </Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}
const srStyles = StyleSheet.create({
  row: { flexDirection: 'row', borderRadius: 16, padding: 14, marginBottom: 16 },
  col: { flex: 1, alignItems: 'center' },
  label: { fontFamily: F.medium, fontSize: 10.5, marginBottom: 5 },
  val: { fontFamily: F.mono, fontSize: 22, letterSpacing: -0.5, lineHeight: 22 },
  unit: { fontFamily: F.regular, fontSize: 12 },
  div: { width: 1 },
});

// ── Mini Bar Chart (popups) ───────────────────────────
function MiniBar({ heights, active }: { heights: number[]; active?: number[] }) {
  const { theme: t } = useAppTheme();
  const max = Math.max(...heights, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 56, gap: 5 }}>
      {heights.map((h, i) => (
        <View
          key={i}
          style={{
            flex: 1,
            height: `${Math.max(4, (h / max) * 100)}%`,
            borderRadius: 4,
            backgroundColor: active?.includes(i) ? t.accent : t.surface3,
          }}
        />
      ))}
    </View>
  );
}

// ── Day Labels ────────────────────────────────────────
function DayLabels({ todayIndex, labels }: { todayIndex: number; labels: string[] }) {
  const { theme: t } = useAppTheme();
  return (
    <View style={{ flexDirection: 'row', marginTop: 5, marginBottom: 8 }}>
      {labels.map((d, i) => (
        <Text
          key={i}
          style={{
            flex: 1,
            textAlign: 'center',
            fontFamily: F.medium,
            fontSize: 9.5,
            color: i === todayIndex ? t.ink : t.ink4,
            fontWeight: i === todayIndex ? '700' : '500',
          }}
        >
          {d}
        </Text>
      ))}
    </View>
  );
}

function WeeklyVolumeCard({
  valuesByRange,
}: {
  valuesByRange: { W: number[]; M: number[]; M3: number[] };
}) {
  const { theme: t } = useAppTheme();
  const [selectedRange, setSelectedRange] = useState<'W' | 'M' | 'M3'>('W');
  const values = selectedRange === 'W' ? valuesByRange.W : selectedRange === 'M' ? valuesByRange.M : valuesByRange.M3;
  const volumeLabel = selectedRange === 'W' ? 'WEEKLY VOLUME' : selectedRange === 'M' ? 'MONTH VOLUME' : '3-MONTH VOLUME';
  const labels = selectedRange === 'W'
    ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    : selectedRange === 'M'
      ? ['W1', 'W2', 'W3', 'W4']
      : ['M-2', 'M-1', 'Now'];
  const width = 270;
  const height = 82;
  const safe = values.length ? values : [0, 0, 0, 0, 0, 0, 0];
  const max = Math.max(...safe, 1);
  const min = Math.min(...safe, 0);
  const valueRange = max - min || 1;
  const points = safe
    .map((value, index) => {
      const x = (index / (safe.length - 1)) * width;
      const y = height - ((value - min) / valueRange) * (height - 16) - 8;
      return `${x},${y}`;
    })
    .join(' ');
  const totalVolume = safe.reduce((sum, item) => sum + item, 0);

  return (
    <View style={[wvStyles.card, { backgroundColor: t.surface, borderColor: t.border }, t.shadowTile as any]}>
      <View style={wvStyles.topRow}>
        <View>
          <Text style={[wvStyles.hd, { color: t.ink3 }]}>{volumeLabel}</Text>
          <Text style={[wvStyles.value, { color: t.ink }]}>
            {Math.round(totalVolume).toLocaleString()} <Text style={[wvStyles.unit, { color: t.ink3 }]}>kg</Text>
          </Text>
        </View>
        <View style={wvStyles.rangeRow}>
          <Pressable onPress={() => setSelectedRange('W')} style={[wvStyles.rangePill, selectedRange === 'W' ? { backgroundColor: t.ink } : { backgroundColor: t.surface2 }]}>
            <Text style={selectedRange === 'W' ? wvStyles.rangeTextOn : [wvStyles.rangeText, { color: t.ink4 }]}>W</Text>
          </Pressable>
          <Pressable onPress={() => setSelectedRange('M')} style={[wvStyles.rangePill, selectedRange === 'M' ? { backgroundColor: t.ink } : { backgroundColor: t.surface2 }]}>
            <Text style={selectedRange === 'M' ? wvStyles.rangeTextOn : [wvStyles.rangeText, { color: t.ink4 }]}>M</Text>
          </Pressable>
          <Pressable onPress={() => setSelectedRange('M3')} style={[wvStyles.rangePill, selectedRange === 'M3' ? { backgroundColor: t.ink } : { backgroundColor: t.surface2 }]}>
            <Text style={selectedRange === 'M3' ? wvStyles.rangeTextOn : [wvStyles.rangeText, { color: t.ink4 }]}>3M</Text>
          </Pressable>
        </View>
      </View>
      <View style={wvStyles.chartWrap}>
        <Svg width={width} height={height}>
          <Polyline points={points} fill="none" stroke={t.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <View style={wvStyles.dayRow}>
        {labels.map((day) => (
          <Text key={day} style={[wvStyles.dayText, { color: t.ink4 }]}>{day}</Text>
        ))}
      </View>
    </View>
  );
}

// ════════════════════════════════════════
// ████ MAIN HOMESCREEN ████
// ════════════════════════════════════════

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { theme: t, isDark } = useAppTheme();
  const { user } = useUserStore();
  const unit = user.unit ?? 'kg';
  const { sessions, splits } = useGymStore();
  const { habits, toggleToday } = useHabitStore();
  const { entries: weightEntries, latest: latestWeight, addEntry } = useWeightStore();
  const { todayCount: stepsToday, getRange: stepsGetRange, source: stepsSource } = useStepsStore();
  const navigation = useNavigation<any>();
  const spotifyIsAuthed = useSpotifyStore((s) => s.isAuthed);
  const fetchSpotifyPlayback = useSpotifyStore((s) => s.fetchPlayback);
  const fetchSpotifyQueue = useSpotifyStore((s) => s.fetchQueue);

  // Poll Spotify playback every 5s when authed
  useEffect(() => {
    if (!spotifyIsAuthed) return;
    fetchSpotifyPlayback();
    const id = setInterval(() => fetchSpotifyPlayback(), 5000);
    return () => clearInterval(id);
  }, [fetchSpotifyPlayback, spotifyIsAuthed]);

  const isReady = true;

  const [popup, setPopup] = useState<PopupType>(null);
  const latestW = latestWeight();
  const [weightValue, setWeightValue] = useState(() => {
    const lkg = latestW?.value ?? (unit === 'lbs' ? 66 : 70);
    return unit === 'lbs' ? Number((lkg * 2.20462).toFixed(1)) : lkg;
  });

  const weightValues = useMemo(
    () => unit === 'lbs'
      ? Array.from({ length: 771 }, (_, i) => Number((66 + i / 10).toFixed(1)))
      : Array.from({ length: 1701 }, (_, i) => Number((30 + i / 10).toFixed(1))),
    [unit],
  );

  const days7 = useMemo(() => makeDays(7), []);
  const today = format(new Date(), 'yyyy-MM-dd');

  // Steps derived data
  const todaySteps = stepsToday();
  const stepsWeek = useMemo(() => {
    const range = stepsGetRange(7);
    return days7.map((d) => range.find((e) => e.date === d)?.count ?? 0);
  }, [days7, stepsGetRange]);
  const stepsGoal = 10000;
  const stepsProgress = Math.min(100, Math.round((todaySteps / stepsGoal) * 100));
  const hasStepsData = stepsSource !== 'none';

  // ── Computed data ───────────────────────────
  const days14 = useMemo(() => makeDays(14), []);
  const prevWeekDays = useMemo(() => days14.slice(0, 7), [days14]);

  const weeklyTraining = useMemo(() => {
    const dayIndex = new Map(days7.map((day, index) => [day, index]));
    const prevWeekSet = new Set(prevWeekDays);
    const workouts = Array(7).fill(0);
    const volume = Array(7).fill(0);
    let previousVolume = 0;

    sessions.forEach((session) => {
      const day = session.startedAt.slice(0, 10);
      const index = dayIndex.get(day);
      if (index !== undefined) {
        workouts[index] += 1;
        volume[index] += session.totalVolume;
        return;
      }
      if (prevWeekSet.has(day)) previousVolume += session.totalVolume;
    });

    return {
      workoutsWeek: workouts,
      volumeWeek: volume,
      prevWeekTons: Math.round(previousVolume / 1000),
    };
  }, [days7, prevWeekDays, sessions]);

  const workoutsWeek = weeklyTraining.workoutsWeek;
  const volumeWeek = weeklyTraining.volumeWeek;

  const volumeMonth = useMemo(() => {
    const now = new Date();
    const bucketStarts = [28, 21, 14, 7].map((days) => {
      const date = new Date(now);
      date.setDate(now.getDate() - days);
      return date;
    });
    const buckets = [0, 0, 0, 0];

    sessions.forEach((session) => {
      const date = new Date(session.startedAt);
      if (date < bucketStarts[0] || date > now) return;
      if (date >= bucketStarts[3]) buckets[3] += session.totalVolume;
      else if (date >= bucketStarts[2]) buckets[2] += session.totalVolume;
      else if (date >= bucketStarts[1]) buckets[1] += session.totalVolume;
      else buckets[0] += session.totalVolume;
    });

    return buckets;
  }, [sessions]);

  const volume3Months = useMemo(() => {
    const now = new Date();
    const monthKeys = [0, 1, 2].map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (2 - offset), 1);
      return `${date.getFullYear()}-${date.getMonth()}`;
    });
    const buckets = [0, 0, 0];

    sessions.forEach((session) => {
      const date = new Date(session.startedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const index = monthKeys.indexOf(key);
      if (index >= 0) buckets[index] += session.totalVolume;
    });

    return buckets;
  }, [sessions]);

  const weightWeek = useMemo(() => {
    const map = new Map<string, number>();
    weightEntries.forEach((e) => map.set(e.date, e.value));
    let fallback = latestW?.value ?? 0;
    return days7.map((day) => {
      if (map.has(day)) fallback = map.get(day) ?? fallback;
      return fallback;
    });
  }, [days7, weightEntries, latestW?.value]);

  const activeHabits = useMemo(
    () => habits.filter((habit) => !!habit && !!habit.id),
    [habits],
  );

  const habitsDone = useMemo(
    () => activeHabits.filter((h) => isCompletedOn(h, today)).length,
    [activeHabits, today],
  );

  const prevWeekTons = weeklyTraining.prevWeekTons;

  const workoutsCount = workoutsWeek.reduce((s, v) => s + v, 0);
  const volumeTons = Math.round(volumeWeek.reduce((s, v) => s + v, 0) / 1000);
  const habitsText = `${habitsDone}/${activeHabits.length || 0}`;
  const currentWeightKg = latestW?.value ?? 0;
  const currentWeight = unit === 'lbs' ? currentWeightKg * 2.20462 : currentWeightKg;
  const logDate = today;

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const todayPlan = useMemo(() => {
    const pendingHabits = activeHabits.length - habitsDone;
    // Use current-week session count (not all-time) to cycle through split days correctly
    const weekSessions = workoutsWeek.reduce((s, v) => s + v, 0);
    const nextDay = splits[0]?.days?.[weekSessions % (splits[0]?.days?.length || 1)];
    return { pendingHabits, nextDayName: nextDay?.name ?? null };
  }, [activeHabits.length, habitsDone, splits, workoutsWeek]);

  const closePopup = useCallback(() => setPopup(null), []);

  const openWeightPopup = useCallback(() => {
    const fallbackKg = latestWeight()?.value ?? weightValues[0];
    const fallbackUnit = unit === 'lbs' ? fallbackKg * 2.20462 : fallbackKg;
    const rounded = Number(fallbackUnit.toFixed(1));
    const clamped = Math.max(weightValues[0], Math.min(weightValues[weightValues.length - 1], rounded));
    const closest = weightValues.reduce((prev, curr) =>
      Math.abs(curr - clamped) < Math.abs(prev - clamped) ? curr : prev,
    weightValues[0]);
    setWeightValue(closest);
    setPopup('weight');
  }, [latestWeight, unit, weightValues]);

  const saveWeight = useCallback(async () => {
    const valueKg = unit === 'lbs' ? weightValue / 2.20462 : weightValue;
    await addEntry(valueKg, logDate);
    setPopup(null);
  }, [addEntry, logDate, unit, weightValue]);

  const openMusicScreen = useCallback(() => {
    navigation.navigate('SpotifyScreen');
  }, [navigation]);

  const openSpotifyPopup = useCallback(() => {
    if (!spotifyIsAuthed) {
      navigation.navigate('SpotifyScreen');
      return;
    }
    setPopup('spotify');
    fetchSpotifyPlayback();
    fetchSpotifyQueue();
  }, [fetchSpotifyPlayback, fetchSpotifyQueue, navigation, spotifyIsAuthed]);

  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      {!isReady ? (
        <View style={{ paddingTop: insets.top + 8 }}>
          <HomeScreenSkeleton />
        </View>
      ) : (
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator
      >
        {/* ── NavBar ── */}
        <NavBar
          title={`${greeting}, ${user.name || 'Athlete'}`}
          subtitle={format(new Date(), 'EEEE, MMM d')}
          right={
            <>
              <AnimatedPressable
                style={[homeActionS.musicButton, { backgroundColor: t.surface, borderColor: t.border }]}
                onPress={openMusicScreen}
              >
                <Ionicons name="musical-notes-outline" size={17} color={t.ink3} />
              </AnimatedPressable>
              <InitialsAvatar name={user.name || 'Athlete'} size={38} />
            </>
          }
          noPadTop
        />

        {(todayPlan.nextDayName || todayPlan.pendingHabits > 0) && (
          <View style={[todayPlanS.bar, { backgroundColor: t.surface, borderColor: t.border }]}> 
            <Ionicons name="flash-outline" size={13} color={t.ink3} />
            {todayPlan.nextDayName && (
              <Text style={[todayPlanS.text, { color: t.ink2 }]}>
                Next: <Text style={{ color: t.ink, fontFamily: F.semibold }}>{todayPlan.nextDayName}</Text>
              </Text>
            )}
            {todayPlan.nextDayName && todayPlan.pendingHabits > 0 && (
              <View style={[todayPlanS.dot, { backgroundColor: t.border }]} />
            )}
            {todayPlan.pendingHabits > 0 && (
              <Text style={[todayPlanS.text, { color: t.ink2 }]}> 
                <Text style={{ color: t.ink, fontFamily: F.semibold }}>{todayPlan.pendingHabits}</Text> habits left
              </Text>
            )}
          </View>
        )}

        {/* ── 2×2 Gradient Tile Grid ── */}
        <View style={styles.tileGrid}>
          {/* Tile 1: Workouts */}
          <GradientTile
            gradient={t.tile1Bg}
            fg={t.tile1Fg}
            fg2={t.tile1Fg2}
            onPress={() => setPopup('workouts')}
          >
            <View style={[tileS.icon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name="barbell-outline" size={14} color={t.tile1Fg} />
            </View>
            <Text style={[tileS.value, { color: t.tile1Fg }]}>{workoutsCount}</Text>
            <Text style={[tileS.label, { color: t.tile1Fg2 }]}>workouts this week</Text>
            <TileSparkline data={workoutsWeek} color={t.tile1Fg} />
          </GradientTile>

          {/* Tile 2: Weight */}
          <GradientTile
            gradient={t.tile2Bg}
            fg={t.tile2Fg}
            fg2={t.tile2Fg2}
            onPress={openWeightPopup}
          >
            <View style={[tileS.icon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name="scale-outline" size={14} color={t.tile2Fg} />
            </View>
            <Text style={[tileS.value, { color: t.tile2Fg }]}>
              {currentWeight.toFixed(1)}
              <Text style={[tileS.unit, { color: t.tile2Fg2 }]}>{unit}</Text>
            </Text>
            <Text style={[tileS.label, { color: t.tile2Fg2 }]}>current weight</Text>
            <TileSparkline data={weightWeek} color={t.tile2Fg} />
          </GradientTile>

          {/* Tile 3: Volume */}
          <GradientTile
            gradient={t.tile3Bg}
            fg={t.tile3Fg}
            fg2={t.tile3Fg2}
            onPress={() => setPopup('volume')}
          >
            <View style={[tileS.icon, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
              <Ionicons name="trending-up-outline" size={14} color={t.tile3Fg} />
            </View>
            <Text style={[tileS.value, { color: t.tile3Fg }]}>
              {volumeTons}
              <Text style={[tileS.unit, { color: t.tile3Fg2 }]}>t</Text>
            </Text>
            <Text style={[tileS.label, { color: t.tile3Fg2 }]}>volume this week</Text>
            <TileSparkline data={volumeWeek} color={t.tile3Fg} />
          </GradientTile>

          {/* Tile 4: Habits (dark) */}
          <GradientTile
            gradient={t.tile4Bg}
            fg={t.tile4Fg}
            fg2={t.tile4Fg2}
            onPress={() => setPopup('habits')}
          >
            <View style={[tileS.icon, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
              <Ionicons name="checkmark-circle-outline" size={14} color={t.tile4Fg} />
            </View>
            <Text style={[tileS.value, { color: t.tile4Fg }]}>
              {habitsDone}
              <Text style={[tileS.unit, { color: t.tile4Fg2 }]}>/{activeHabits.length || 0}</Text>
            </Text>
            <Text style={[tileS.label, { color: t.tile4Fg2 }]}>habits today</Text>
            {/* Habit dots */}
            <View style={tileS.dots}>
              {activeHabits.slice(0, 5).map((h) => (
                <Pressable
                  key={h.id}
                  hitSlop={10}
                  style={[
                    tileS.dot,
                    {
                      backgroundColor: isCompletedOn(h, today)
                        ? t.habitDotDone
                        : t.habitDotUndone,
                    },
                  ]}
                  onPress={(e) => {
                    e.stopPropagation();
                    toggleToday(h.id);
                  }}
                />
              ))}
            </View>
          </GradientTile>
        </View>

        {/* ── Steps Tile (full-width) ── */}
        <Pressable
          style={[stepsTileS.tile, { backgroundColor: t.surface, borderColor: t.border }]}
          onPress={() => setPopup('steps')}
        >
          <View style={stepsTileS.left}>
            <View style={[stepsTileS.iconWrap, { backgroundColor: t.surface2 }]}>
              <Ionicons name="walk-outline" size={16} color={t.ink2} />
            </View>
            <View>
              <Text style={[stepsTileS.value, { color: t.ink }]}>
                {hasStepsData ? todaySteps.toLocaleString() : '--'}
                <Text style={[stepsTileS.unit, { color: t.ink3 }]}> steps</Text>
              </Text>
              <Text style={[stepsTileS.label, { color: t.ink4 }]}>
                {hasStepsData
                  ? `${stepsProgress}% of ${stepsGoal.toLocaleString()} goal`
                  : 'Connect Google Fit to see steps'}
              </Text>
            </View>
          </View>
          {/* 7-day mini sparkline */}
          <View style={stepsTileS.sparkWrap}>
            {stepsWeek.map((v, i) => {
              const max = Math.max(...stepsWeek, 1);
              const h = Math.max(3, Math.round((v / max) * 28));
              const isToday = i === 6;
              return (
                <View key={i} style={[stepsTileS.bar, { height: h, backgroundColor: isToday ? t.ink2 : t.border }]} />
          );
          })}
          </View>
        </Pressable>

        {/* ── Spotify Now Playing Tile ── */}
        <NowPlayingTile onPress={openSpotifyPopup} />

        <WeeklyVolumeCard valuesByRange={{ W: volumeWeek, M: volumeMonth, M3: volume3Months }} />
      </ScrollView>
      )}

      {/* ════ POPUP SHEETS ════ */}

      <PopupSheet visible={popup === 'spotify'} onClose={closePopup} maxHeight="92%">
        <SpotifyExpandedSheet />
      </PopupSheet>

      {/* Steps Popup */}
      <PopupSheet visible={popup === 'steps'} onClose={closePopup}>
        <View style={popS.header}>
          <Text style={[popS.title, { color: t.ink }]}>Steps</Text>
          <View style={[popS.badge, { backgroundColor: t.surface2 }]}>
            <Text style={[popS.badgeText, { color: t.ink3 }]}>Today</Text>
          </View>
        </View>
        <Text style={[popS.sub, { color: t.ink3 }]}>
          {hasStepsData
            ? `${todaySteps.toLocaleString()} of ${stepsGoal.toLocaleString()} steps (${stepsProgress}%)`
            : 'No steps data — open Settings > Notifications, then grant Health / Google Fit permission.'}
        </Text>
        <StatRow
          stats={[
            { label: 'Today', value: hasStepsData ? todaySteps.toLocaleString() : '--', unit: 'steps' },
            { label: 'Goal', value: stepsGoal.toLocaleString(), unit: 'steps' },
            {
              label: '7-day avg',
              value: hasStepsData
                ? Math.round(stepsWeek.reduce((a, b) => a + b, 0) / 7).toLocaleString()
                : '--',
              unit: 'steps',
            },
          ]}
        />
        <MiniBar
          heights={stepsWeek}
          active={stepsWeek.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0)}
        />
        <DayLabels todayIndex={6} labels={days7.map((d) => format(new Date(d + 'T12:00:00'), 'EEEEE'))} />
        {!hasStepsData && (
          <Text style={[{ color: t.ink4, fontSize: 11, fontFamily: F.regular, textAlign: 'center', marginTop: 4 }]}>
            Source: {stepsSource === 'none' ? 'Not connected' : stepsSource}
          </Text>
        )}
      </PopupSheet>

      {/* Weight Popup */}
      <PopupSheet visible={popup === 'weight'} onClose={closePopup}>
        <Text style={[popS.title, { color: t.ink }]}>Body Weight</Text>
        <Text style={[popS.sub, { color: t.ink3 }]}>
          Log for {format(new Date(logDate + 'T12:00:00'), 'MMM d, yyyy')}
        </Text>
        <View style={[popS.logPanel, { backgroundColor: t.surface2 }]}>
          <Text style={[popS.logValue, { color: t.ink }]}>{weightValue.toFixed(1)} {unit}</Text>
          <ScrollPicker
            values={weightValues}
            selectedValue={weightValue}
            onValueChange={setWeightValue}
            width={170}
            itemHeight={42}
          />
          <AnimatedPressable
            style={[popS.saveBtn, { backgroundColor: t.accentBtn }]}
            onPress={saveWeight}
          >
            <Text style={[popS.saveBtnTxt, { color: getReadableTextColor(t.accentBtn) }]}>Log Weight</Text>
          </AnimatedPressable>
        </View>
        <StatRow
          stats={[
            { label: 'Current', value: `${currentWeight.toFixed(1)}`, unit },
            {
              label: 'Change',
              value: weightEntries.length > 1
                ? `${(
                    currentWeight - (unit === 'lbs'
                      ? (weightEntries[weightEntries.length - 2]?.value ?? currentWeightKg) * 2.20462
                      : (weightEntries[weightEntries.length - 2]?.value ?? currentWeightKg))
                  ).toFixed(1)}`
                : '—',
              unit,
            },
            {
              label: '7-day avg',
              value: (() => {
                const validWeights = weightWeek.filter(w => w > 0);
                if (!validWeights.length) return '—';
                const avgKg = validWeights.reduce((s, v) => s + v, 0) / validWeights.length;
                return (unit === 'lbs' ? avgKg * 2.20462 : avgKg).toFixed(1);
              })(),
              unit,
            },
          ]}
        />
        {(() => {
          const allVals = weightEntries.map((w) => w.value);
          const maxW = Math.max(...allVals);
          const minW = Math.min(...allVals);
          const range = maxW - minW || 1;
          return weightEntries.slice(-6).reverse().map((e, i) => {
            const pct = ((e.value - minW) / range) * 80 + 20;
          const parsedDate = new Date(e.date);
          const dateLabel = Number.isNaN(parsedDate.getTime()) ? '—' : format(parsedDate, 'MMM d');
          return (
            <View
              key={e.id}
              style={[
                wpStyles.row,
                { borderBottomColor: t.surface2, borderBottomWidth: i < 5 ? 0.5 : 0 },
              ]}
            >
              <Text style={[wpStyles.date, { color: t.ink3 }]}>
                {dateLabel}
              </Text>
              <View style={[wpStyles.track, { backgroundColor: t.surface3 }]}>
                <View
                  style={[wpStyles.fill, { width: `${pct}%`, backgroundColor: t.accent }]}
                />
              </View>
              <Text style={[wpStyles.val, { color: t.ink }]}>{e.value.toFixed(1)}</Text>
            </View>
          );
        });
        })()}
      </PopupSheet>

      {/* Habits Popup */}
      <PopupSheet visible={popup === 'habits'} onClose={closePopup}>
        <Text style={[popS.title, { color: t.ink }]}>Habits</Text>
        <Text style={[popS.sub, { color: t.ink3 }]}>Tap to mark today</Text>
        {activeHabits.map((habit) => {
          const done = isCompletedOn(habit, today);
          return (
            <Pressable
              key={habit.id}
              style={[hpStyles.item, { borderBottomColor: t.surface2 }]}
              onPress={() => toggleToday(habit.id)}
            >
              <View style={{ flex: 1 }}>
                <Text style={[hpStyles.name, { color: t.ink }]}>{habit.name}</Text>
                <Text style={[hpStyles.streak, { color: t.ink3 }]}>Streak {habit.streak}</Text>
              </View>
              <View
                style={[
                  hpStyles.check,
                  {
                    borderColor: done ? t.accent : t.surface3,
                    backgroundColor: done ? t.accent : 'transparent',
                  },
                ]}
              >
                {done ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
              </View>
            </Pressable>
          );
        })}
      </PopupSheet>

      {/* Volume Popup */}
      <PopupSheet visible={popup === 'volume'} onClose={closePopup}>
        <View style={popS.header}>
          <Text style={[popS.title, { color: t.ink }]}>Volume</Text>
          <View style={[popS.badge, { backgroundColor: t.surface2 }]}>
            <Text style={[popS.badgeText, { color: t.ink3 }]}>This week</Text>
          </View>
        </View>
        <Text style={[popS.sub, { color: t.ink3 }]}>
          {volumeTons} tons lifted across {workoutsCount} workout{workoutsCount === 1 ? '' : 's'}
        </Text>
        <StatRow
          stats={[
            { label: 'Volume', value: `${volumeTons}`, unit: 't' },
            { label: 'Sessions', value: `${workoutsCount}` },
            { label: 'Habits', value: habitsText },
          ]}
        />
        <MiniBar
          heights={volumeWeek}
          active={volumeWeek.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0)}
        />
        <DayLabels todayIndex={6} labels={days7.map((d) => format(new Date(d + 'T12:00:00'), 'EEEEE'))} />
      </PopupSheet>
    </View>
  );
}

// ── Tile inner styles ─────────────────────────────────
const tileS = StyleSheet.create({
  icon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  value: {
    fontFamily: F.bold,
    fontSize: 26,
    letterSpacing: -1.1,
    lineHeight: 28,
  },
  unit: {
    fontFamily: F.regular,
    fontSize: 13,
    letterSpacing: 0,
    marginLeft: 2,
  },
  label: {
    fontFamily: F.regular,
    fontSize: 11,
    marginTop: 4,
    lineHeight: 14,
  },
  dots: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

// ── Popup styles ──────────────────────────────────────
const popS = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: { fontFamily: F.bold, fontSize: 18, letterSpacing: -0.4 },
  sub: { fontFamily: F.regular, fontSize: 12.5, marginBottom: 18 },
  badge: { borderRadius: 20, paddingHorizontal: 13, paddingVertical: 5 },
  badgeText: { fontFamily: F.semibold, fontSize: 11.5 },
  logPanel: { borderRadius: 18, alignItems: 'center', padding: 14, marginBottom: 16, gap: 8 },
  logValue: { fontFamily: F.bold, fontSize: 28, letterSpacing: -0.6 },
  saveBtn: { borderRadius: 14, paddingVertical: 11, paddingHorizontal: 22, alignItems: 'center', width: '100%' },
  saveBtnTxt: { fontFamily: F.bold, fontSize: 14 },
});

const wpStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  date: { fontFamily: F.regular, fontSize: 13, minWidth: 48 },
  track: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4, borderRadius: 2 },
  val: { fontFamily: F.mono, fontSize: 14, minWidth: 44, textAlign: 'right' },
});

const hpStyles = StyleSheet.create({
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 0.5 },
  name: { fontFamily: F.medium, fontSize: 14.5 },
  streak: { fontFamily: F.regular, fontSize: 12, marginTop: 2 },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});

const wvStyles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    marginTop: 12,
    marginBottom: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hd: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  value: {
    marginTop: 2,
    fontFamily: F.mono,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  unit: {
    fontFamily: F.regular,
    fontSize: 14,
  },
  rangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rangePill: {
    width: 24,
    height: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeTextOn: {
    color: '#FFFFFF',
    fontFamily: F.semibold,
    fontSize: 10,
  },
  rangeText: {
    fontFamily: F.semibold,
    fontSize: 10,
  },
  chartWrap: {
    marginTop: 10,
    marginBottom: 4,
  },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayText: {
    flex: 1,
    textAlign: 'center',
    fontFamily: F.regular,
    fontSize: 10,
  },
});

// ── Main layout styles ────────────────────────────────
const waStyles = StyleSheet.create({
  card: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
    marginTop: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  kicker: {
    fontFamily: F.semibold,
    fontSize: 10.5,
    letterSpacing: 1,
  },
  title: {
    fontFamily: F.bold,
    fontSize: 22,
    letterSpacing: -0.4,
    marginTop: 3,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: F.semibold,
    fontSize: 10.5,
  },
  body: {
    fontFamily: F.regular,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 10,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  chipText: {
    fontFamily: F.medium,
    fontSize: 11,
  },
  footer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  footerText: {
    fontFamily: F.regular,
    fontSize: 11,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 15, gap: 0 },
  tileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 9,
    marginTop: 8,
  },
});

const homeActionS = StyleSheet.create({
  musicButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
const todayPlanS = StyleSheet.create({
  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 12, borderWidth: 0.5,
    paddingHorizontal: 12, paddingVertical: 9,
    marginTop: 8, marginBottom: 2,
  },
  text: { fontFamily: F.regular, fontSize: 12.5 },
  dot: { width: 3, height: 3, borderRadius: 2 },
});

const stepsTileS = StyleSheet.create({
  tile: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 9,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontFamily: F.bold,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  unit: {
    fontFamily: F.regular,
    fontSize: 13,
  },
  label: {
    fontFamily: F.regular,
    fontSize: 11,
    marginTop: 1,
  },
  sparkWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 32,
  },
  bar: {
    width: 5,
    borderRadius: 3,
  },
});




