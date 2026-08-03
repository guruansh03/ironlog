// ─── SpotifyScreen ───────────────────────────────────────────────────────────
// Playlists-only music screen. Now Playing moved to HomeScreen tile.
import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TextInput,
  ActivityIndicator, Pressable, Platform, Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../theme/ThemeContext';
import { F } from '../theme/fonts';
import { getReadableTextColor } from '../theme/contrast';
import { getSpotifyRedirectUri, useSpotifyStore } from '../store/spotifyStore';
import AnimatedPressable from '../components/animations/AnimatedPressable';
import NavBar from '../components/shared/NavBar';
import PopupSheet from '../components/shared/PopupSheet';

export default function SpotifyScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { theme: t } = useAppTheme();
  const store = useSpotifyStore();
  const [showSetup, setShowSetup] = useState(false);
  const [cidInput, setCidInput] = useState(store.clientId);
  const [selectedPlaylist, setSelectedPlaylist] = useState<{ id: string; name: string; uri: string; trackCount: number } | null>(null);
  const onAccent = getReadableTextColor(t.accentBtn);
  const selectedPlaylistId = selectedPlaylist?.id ?? '';
  const selectedTracks = selectedPlaylistId
    ? (store.playlistTracksById[selectedPlaylistId] ?? [])
    : [];
  const selectedPlaylistLoading = selectedPlaylistId
    ? !!store.playlistTrackLoading[selectedPlaylistId]
    : false;
  const selectedPlaylistError = selectedPlaylistId
    ? store.playlistTrackErrors[selectedPlaylistId]
    : '';

  // OAuth callback — web: check URL params on mount; mobile: deep-link listener
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (code) {
        store.handleCallback(window.location.href).catch(() => undefined);
      }
    } else {
      Linking.getInitialURL()
        .then((url) => {
          if (url && (url.includes('code=') || url.includes('spotify-callback'))) {
            store.handleCallback(url).catch(() => undefined);
          }
        })
        .catch(() => undefined);

      const sub = Linking.addEventListener('url', ({ url }) => {
        if (url.includes('code=') || url.includes('spotify-callback')) {
          store.handleCallback(url).catch(() => undefined);
        }
      });
      return () => sub.remove();
    }
  }, []);

  // Fetch playlists when authed
  useEffect(() => {
    if (store.isAuthed) {
      store.fetchPlaylists();
    }
  }, [store.isAuthed]);

  function saveClientId() {
    const trimmed = cidInput.trim();
    if (!trimmed) return;
    store.setClientId(trimmed);
    setShowSetup(false);
  }

  function openPlaylist(pl: { id: string; name: string; uri: string; trackCount?: number }) {
    setSelectedPlaylist({ ...pl, trackCount: pl.trackCount ?? 0 });
    store.fetchPlaylistTracks(pl.id).catch(() => undefined);
  }

  function playFromPlaylist(trackIndex: number) {
    if (!selectedPlaylist) return;
    store.playContext(selectedPlaylist.uri, trackIndex);
  }

  function goBackHome() {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.navigate('MainTabs');
  }

  const backButton = (
    <AnimatedPressable onPress={goBackHome} style={[styles.navBackBtn, { backgroundColor: t.surface2 }]}>
      <Ionicons name="chevron-back" size={18} color={t.ink3} />
    </AnimatedPressable>
  );

  /* ─── Not Authed ────────────────────────────────────── */
  if (!store.isAuthed) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg }]}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator>
          <NavBar title="Music" noPadTop left={backButton} />
          <View style={[styles.emptyCard, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Ionicons name="musical-notes" size={48} color={t.ink4} />
            <Text style={[styles.emptyTitle, { color: t.ink }]}>Connect Spotify</Text>
            <Text style={[styles.emptyDesc, { color: t.ink3 }]}>
              Browse your playlists and control playback — right from IronLog.
            </Text>

            {!store.clientId ? (
              <>
                <Text style={[styles.emptyDesc, { color: t.ink4, fontSize: 11, marginTop: 4 }]}>
                  You need a Spotify Developer Client ID first.
                </Text>
                <AnimatedPressable style={[styles.primaryBtn, { backgroundColor: t.accentBtn }]} onPress={() => setShowSetup(true)}>
                  <Ionicons name="key-outline" size={15} color={onAccent} />
                  <Text style={[styles.primaryBtnText, { color: onAccent }]}>Set Client ID</Text>
                </AnimatedPressable>
              </>
            ) : (
              <AnimatedPressable
                style={[styles.primaryBtn, { backgroundColor: '#1DB954', opacity: store.authStatus === 'exchanging' ? 0.72 : 1 }]}
                onPress={() => store.startAuth()}
                disabled={store.authStatus === 'exchanging' || store.authStatus === 'opening'}
              >
                {store.authStatus === 'exchanging' ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Ionicons name="log-in-outline" size={16} color="#FFF" />
                )}
                <Text style={[styles.primaryBtnText, { color: '#FFF' }]}>
                  {store.authStatus === 'exchanging' ? 'Finishing login...' : 'Login with Spotify'}
                </Text>
              </AnimatedPressable>
            )}

            {!!store.authError && (
              <Text style={[styles.authError, { color: '#ef4444' }]}>{store.authError}</Text>
            )}

            {!!store.clientId && (
              <AnimatedPressable onPress={() => setShowSetup(true)}>
                <Text style={[styles.linkText, { color: t.ink4 }]}>Change Client ID</Text>
              </AnimatedPressable>
            )}
          </View>

          {/* How-to card */}
          <View style={[styles.howTo, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Text style={[styles.howToTitle, { color: t.ink }]}>How to get a Client ID</Text>
            {[
              'Go to developer.spotify.com/dashboard',
              'Create a new app',
              `Set redirect URI to ${getSpotifyRedirectUri()}`,
              'Copy the Client ID and paste it here',
            ].map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: t.surface2 }]}>
                  <Text style={[styles.stepNumText, { color: t.ink3 }]}>{i + 1}</Text>
                </View>
                <Text style={[styles.stepText, { color: t.ink2 }]}>{step}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        <PopupSheet visible={showSetup} onClose={() => setShowSetup(false)}>
          <Text style={[styles.sheetTitle, { color: t.ink }]}>Spotify Client ID</Text>
          <TextInput
            style={[styles.cidInput, { backgroundColor: t.surface2, color: t.ink, borderColor: t.border }]}
            value={cidInput}
            onChangeText={setCidInput}
            placeholder="Paste your Client ID..."
            placeholderTextColor={t.ink4}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <AnimatedPressable style={[styles.primaryBtn, { backgroundColor: t.accentBtn, marginTop: 8 }]} onPress={saveClientId}>
            <Text style={[styles.primaryBtnText, { color: onAccent }]}>Save</Text>
          </AnimatedPressable>
        </PopupSheet>
      </View>
    );
  }

  /* ─── Authed: Playlists View ────────────────────────── */
  return (
    <View style={[styles.container, { backgroundColor: t.bg }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]} showsVerticalScrollIndicator>
        <NavBar title="Music" noPadTop left={backButton} right={
          <AnimatedPressable onPress={store.logout} style={[styles.logoutBtn, { backgroundColor: t.surface2 }]}>
            <Ionicons name="log-out-outline" size={14} color={t.ink3} />
          </AnimatedPressable>
        } />

        {store.isLoadingLibrary && <ActivityIndicator color={t.accentBtn} style={{ marginTop: 20 }} />}

        {/* Playlists */}
        {store.playlists.length > 0 && (
          <>
            <Text style={[styles.sectionLabel, { color: t.ink4 }]}>YOUR PLAYLISTS</Text>
            <View style={[styles.listCard, { backgroundColor: t.surface, borderColor: t.border }]}>
              {store.playlists.map((pl, i) => (
                <Pressable
                  key={pl.id}
                  style={[styles.rowItem, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.surface2 }]}
                  onPress={() => openPlaylist(pl)}
                >
                  {pl.imageUrl ? (
                    <Image source={{ uri: pl.imageUrl }} style={styles.rowThumb} />
                  ) : (
                    <View style={[styles.rowThumb, { backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="musical-notes-outline" size={16} color={t.ink4} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.rowTitle, { color: t.ink }]} numberOfLines={1}>{pl.name}</Text>
                    <Text style={[styles.rowSub, { color: t.ink4 }]}>{pl.trackCount} tracks · {pl.owner}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={t.ink4} />
                </Pressable>
              ))}
            </View>
          </>
        )}

        {store.playlists.length === 0 && !store.isLoadingLibrary && (
          <View style={[styles.emptyCard, { backgroundColor: t.surface, borderColor: t.border, marginTop: 12 }]}>
            <Ionicons name="musical-notes-outline" size={36} color={t.ink4} />
            <Text style={[styles.emptyTitle, { color: t.ink, fontSize: 16 }]}>No Playlists Found</Text>
            <Text style={[styles.emptyDesc, { color: t.ink3 }]}>Create some playlists on Spotify first.</Text>
            <AnimatedPressable style={[styles.secondaryBtn, { backgroundColor: t.surface2 }]} onPress={() => store.fetchPlaylists()}>
              <Ionicons name="refresh-outline" size={14} color={t.ink3} />
              <Text style={[styles.secondaryBtnText, { color: t.ink3 }]}>Refresh</Text>
            </AnimatedPressable>
          </View>
        )}
      </ScrollView>

      {/* ── Playlist Tracks Popup ── */}
      <PopupSheet visible={!!selectedPlaylist} onClose={() => setSelectedPlaylist(null)} maxHeight="90%">
        <View style={styles.sheetHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sheetTitle, { color: t.ink }]} numberOfLines={1}>{selectedPlaylist?.name}</Text>
            <Text style={[styles.sheetSubtitle, { color: t.ink4 }]}>
              {selectedTracks.length || selectedPlaylist?.trackCount || 0} tracks
            </Text>
          </View>
          <Pressable
            onPress={() => selectedPlaylist && store.fetchPlaylistTracks(selectedPlaylist.id, true)}
            style={[styles.iconBtn, { backgroundColor: t.surface2 }]}
            disabled={!selectedPlaylist || selectedPlaylistLoading}
          >
            {selectedPlaylistLoading ? (
              <ActivityIndicator size="small" color={t.ink3} />
            ) : (
              <Ionicons name="refresh-outline" size={15} color={t.ink3} />
            )}
          </Pressable>
        </View>
        {selectedPlaylistLoading && selectedTracks.length === 0 ? (
          <ActivityIndicator color={t.accentBtn} style={{ marginVertical: 18 }} />
        ) : null}
        {!!selectedPlaylistError && (
          <View style={[styles.inlineNotice, { backgroundColor: t.surface2 }]}>
            <Text style={[styles.inlineNoticeText, { color: '#ef4444' }]}>{selectedPlaylistError}</Text>
          </View>
        )}
        {!selectedPlaylistLoading && !selectedPlaylistError && selectedPlaylist && selectedTracks.length === 0 ? (
          <View style={[styles.inlineNotice, { backgroundColor: t.surface2 }]}>
            <Text style={[styles.inlineNoticeText, { color: t.ink3 }]}>No playable tracks returned for this playlist.</Text>
          </View>
        ) : null}
        <View>
          {selectedTracks.map((track, i) => (
            <AnimatedPressable
              key={`${track.id}-${i}`}
              style={[styles.trackRow, i > 0 && { borderTopWidth: 0.5, borderTopColor: t.surface2 }]}
              onPress={() => playFromPlaylist(i)}
            >
              {track.albumArt ? (
                <Image source={{ uri: track.albumArt }} style={styles.trackThumb} />
              ) : (
                <View style={[styles.trackThumb, { backgroundColor: t.surface2, alignItems: 'center', justifyContent: 'center' }]}>
                  <Ionicons name="disc-outline" size={14} color={t.ink4} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.trackName, { color: t.ink }]} numberOfLines={1}>{track.name}</Text>
                <Text style={[styles.trackArtist, { color: t.ink4 }]} numberOfLines={1}>{track.artist}</Text>
              </View>
              <Ionicons name="play-circle-outline" size={22} color={t.accentBtn} />
            </AnimatedPressable>
          ))}
        </View>
      </PopupSheet>
    </View>
  );
}

/* ─── Styles ──────────────────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 15, gap: 6 },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', gap: 10, marginTop: 8 },
  emptyTitle: { fontFamily: F.bold, fontSize: 20, letterSpacing: -0.3, marginTop: 4 },
  emptyDesc: { fontFamily: F.regular, fontSize: 13, textAlign: 'center', lineHeight: 19 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  primaryBtnText: { fontFamily: F.semibold, fontSize: 14 },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, marginTop: 4 },
  secondaryBtnText: { fontFamily: F.medium, fontSize: 12 },
  linkText: { fontFamily: F.regular, fontSize: 12, marginTop: 6 },
  authError: { fontFamily: F.medium, fontSize: 11.5, textAlign: 'center', lineHeight: 16, marginTop: 2 },
  howTo: { borderRadius: 20, borderWidth: 1, padding: 16, gap: 10, marginTop: 8 },
  howToTitle: { fontFamily: F.bold, fontSize: 15, letterSpacing: -0.2, marginBottom: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: F.bold, fontSize: 10 },
  stepText: { fontFamily: F.regular, fontSize: 12.5, flex: 1, lineHeight: 18 },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  sheetTitle: { fontFamily: F.bold, fontSize: 20, letterSpacing: -0.4 },
  sheetSubtitle: { fontFamily: F.regular, fontSize: 12, marginTop: 2 },
  iconBtn: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  inlineNotice: { borderRadius: 14, padding: 12, marginBottom: 10 },
  inlineNoticeText: { fontFamily: F.regular, fontSize: 12, lineHeight: 17 },
  cidInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontFamily: F.regular, fontSize: 14 },
  navBackBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoutBtn: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontFamily: F.semibold, fontSize: 10.5, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 10, marginBottom: 4, marginLeft: 4 },
  listCard: { borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  rowItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  rowThumb: { width: 40, height: 40, borderRadius: 8 },
  rowTitle: { fontFamily: F.medium, fontSize: 13.5 },
  rowSub: { fontFamily: F.regular, fontSize: 11, marginTop: 1 },
  trackRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  trackThumb: { width: 36, height: 36, borderRadius: 6 },
  trackName: { fontFamily: F.medium, fontSize: 13 },
  trackArtist: { fontFamily: F.regular, fontSize: 11, marginTop: 1 },
});

