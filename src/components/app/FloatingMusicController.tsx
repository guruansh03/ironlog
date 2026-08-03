import React, { useEffect, useCallback, useState } from 'react';
import { View, Text, Image, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  useAnimatedReaction,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '../../theme/ThemeContext';
import { F } from '../../theme/fonts';
import { useSpotifyStore } from '../../store/spotifyStore';

type OverlayState = 'hidden' | 'minimized' | 'collapsed' | 'expanded';

export default function FloatingMusicController() {
  const insets = useSafeAreaInsets();
  const { theme: t } = useAppTheme();
  const store = useSpotifyStore();
  const playback = store.playback;
  const track = playback?.track ?? null;

  const overlayState = useSharedValue<OverlayState>('hidden');
  const expandY = useSharedValue(0); // 0 = bottom, negative = up
  const dragX = useSharedValue(0);

  // Mirror shared value to React state for render-safe reads
  const [uiState, setUiState] = useState<OverlayState>('hidden');

  useAnimatedReaction(
    () => overlayState.value,
    (current, previous) => {
      if (current !== previous) {
        runOnJS(setUiState)(current);
      }
    },
    [overlayState]
  );

  // Determine if player should show
  const shouldShow = !!track || !!playback?.isPlaying;

  useEffect(() => {
    if (shouldShow && uiState === 'hidden') {
      // eslint-disable-next-line react-hooks/immutability
      overlayState.value = 'collapsed';
    } else if (!shouldShow && uiState !== 'hidden') {
       
      overlayState.value = 'hidden';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldShow, uiState]);

  // Auto-collapse after 30s pause
  useEffect(() => {
    if (!playback?.isPlaying && uiState === 'expanded') {
      const timer = setTimeout(() => {
         
        overlayState.value = 'collapsed';
      }, 30000);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playback?.isPlaying, uiState]);

  const toggleExpand = useCallback(() => {
    if (uiState === 'expanded') {
      // eslint-disable-next-line react-hooks/immutability
      overlayState.value = 'collapsed';
       
      expandY.value = withSpring(0);
    } else {
       
      overlayState.value = 'expanded';
       
      expandY.value = withSpring(-180);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiState]);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (overlayState.value === 'expanded') {
        // eslint-disable-next-line react-hooks/immutability
        expandY.value = Math.min(0, -180 + e.translationY);
      } else if (overlayState.value === 'collapsed' || overlayState.value === 'minimized') {
        dragX.value = e.translationX;
      }
    })
    .onEnd((e) => {
      if (overlayState.value === 'expanded') {
        if (e.translationY > 80) {
          // eslint-disable-next-line react-hooks/immutability
          overlayState.value = 'collapsed';
          // eslint-disable-next-line react-hooks/immutability
          expandY.value = withSpring(0);
        } else {
           
          expandY.value = withSpring(-180);
        }
      } else {
        // Dismiss if swiped down far
        if (e.translationY > 120) {
           
          overlayState.value = 'hidden';
        }
        dragX.value = withSpring(0);
      }
    });

  const containerStyle = useAnimatedStyle(() => {
    const state = overlayState.value;
    const opacity = state === 'hidden' ? 0 : 1;
    const translateY = state === 'expanded' ? expandY.value : 0;
    const scale = state === 'minimized' ? 0.75 : 1;

    return {
      opacity: withTiming(opacity, { duration: 300 }),
      transform: [
        { translateX: dragX.value },
        { translateY: translateY + (state === 'hidden' ? 200 : 0) },
        { scale: scale },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ] as any,
    };
  });

  const expandedStyle = useAnimatedStyle(() => {
    const state = overlayState.value;
    const height = state === 'expanded' ? withSpring(220) : 0;
    const opacity = state === 'expanded' ? 1 : 0;
    return { height, opacity };
  });

  const progressPct = track?.durationMs
    ? Math.min(100, Math.max(0, ((playback?.progressMs ?? 0) / track.durationMs) * 100))
    : 0;

  if (!store.isAuthed) return null;

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          containerStyle,
          { bottom: 80 + insets.bottom, left: 16, right: 16 },
        ]}
        pointerEvents={uiState === 'hidden' ? 'none' : 'auto'}
      >
        {/* Collapsed / Minimized Bar */}
        <Pressable
          onPress={toggleExpand}
          style={[
            styles.bar,
            {
              backgroundColor: t.surface,
              borderColor: t.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            },
          ]}
        >
          <View style={styles.barLeft}>
            {track?.albumArt ? (
              <Image source={{ uri: track.albumArt }} style={styles.thumb} />
            ) : (
              <View style={[styles.thumb, { backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="musical-note" size={14} color={t.ink3} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.trackName, { color: t.ink }]} numberOfLines={1}>
                {track?.name ?? 'Nothing playing'}
              </Text>
              <Text style={[styles.trackArtist, { color: t.ink3 }]} numberOfLines={1}>
                {track?.artist ?? 'Spotify'}
              </Text>
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                if (playback?.isPlaying) {
                  store.pause();
                } else {
                  store.play();
                }
              }}
              hitSlop={10}
              style={[styles.controlBtn, { backgroundColor: t.accentBtn }]}
            >
              <Ionicons
                name={playback?.isPlaying ? 'pause' : 'play'}
                size={14}
                color="#fff"
              />
            </Pressable>
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                store.skipNext();
              }}
              hitSlop={10}
              style={{ marginLeft: 6 }}
            >
              <Ionicons name="play-skip-forward" size={18} color={t.ink} />
            </Pressable>
          </View>
        </Pressable>

        {/* Expanded Panel */}
        <Animated.View style={[expandedStyle, { overflow: 'hidden' }]}>
          <View
            style={[
              styles.expandedPanel,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 6,
              },
            ]}
          >
            {track?.albumArt ? (
              <Image source={{ uri: track.albumArt }} style={styles.artExpanded} />
            ) : (
              <View style={[styles.artExpanded, { backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                <Ionicons name="disc-outline" size={40} color={t.ink3} />
              </View>
            )}

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.trackName, { color: t.ink, fontSize: 15 }]} numberOfLines={1}>
                {track?.name ?? 'Nothing playing'}
              </Text>
              <Text style={[styles.trackArtist, { color: t.ink3, marginTop: 2 }]} numberOfLines={1}>
                {track?.artist ?? 'Spotify'}
              </Text>

              {/* Progress */}
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: t.accentBtn }]} />
              </View>
              <View style={styles.timeRow}>
                <Text style={[styles.timeText, { color: t.ink4 }]}>{formatMs(playback?.progressMs ?? 0)}</Text>
                <Text style={[styles.timeText, { color: t.ink4 }]}>{formatMs(track?.durationMs ?? 0)}</Text>
              </View>

              <View style={styles.expandedControls}>
                <Pressable onPress={() => store.skipPrevious()} hitSlop={10}>
                  <Ionicons name="play-skip-back" size={22} color={t.ink} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    if (playback?.isPlaying) {
                      store.pause();
                    } else {
                      store.play();
                    }
                  }}
                  hitSlop={10}
                  style={[styles.playBtnLarge, { backgroundColor: t.accentBtn }]}
                >
                  <Ionicons name={playback?.isPlaying ? 'pause' : 'play'} size={20} color="#fff" />
                </Pressable>
                <Pressable onPress={() => store.skipNext()} hitSlop={10}>
                  <Ionicons name="play-skip-forward" size={22} color={t.ink} />
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function formatMs(ms: number) {
  const safe = Math.max(0, ms || 0);
  const m = Math.floor(safe / 60000);
  const s = Math.floor((safe % 60000) / 1000);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 999,
  },
  bar: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  barLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  thumb: { width: 40, height: 40, borderRadius: 10 },
  trackName: { fontFamily: F.semibold, fontSize: 13 },
  trackArtist: { fontFamily: F.regular, fontSize: 11, marginTop: 1 },
  controls: { flexDirection: 'row', alignItems: 'center' },
  controlBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  expandedPanel: {
    marginTop: 8,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  artExpanded: { width: 100, height: 100, borderRadius: 14 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(128,128,128,0.2)',
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 2 },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { fontFamily: F.mono, fontSize: 9 },
  expandedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
  },
  playBtnLarge: { width: 44, height: 44, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
