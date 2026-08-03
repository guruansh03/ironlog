import { create } from 'zustand';
import { Linking, Platform } from 'react-native';
import * as Crypto from 'expo-crypto';
import { mmkvStorage } from './mmkv';

const AUTH_URL = 'https://accounts.spotify.com/authorize';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const API_BASE = 'https://api.spotify.com/v1';

const CACHE_TTL_MS = 5 * 60 * 1000;
const STATS_CACHE_TTL_MS = 15 * 60 * 1000;

const SCOPES = [
  'user-read-playback-state',
  'user-modify-playback-state',
  'user-read-currently-playing',
  'user-library-read',
  'user-library-modify',
  'playlist-read-private',
  'playlist-read-collaborative',
  'user-top-read',
  'user-read-recently-played',
].join(' ');

const STORAGE = {
  access: 'spotify_access',
  refresh: 'spotify_refresh',
  expires: 'spotify_expires',
  clientId: 'spotify_client_id',
  verifier: 'spotify_code_verifier',
  tileTheme: 'spotify_tile_theme',
  playlists: 'spotify_playlists_cache',
  stats: 'spotify_stats_cache',
  pinned: 'spotify_pinned_playlists',
  favorites: 'spotify_favorite_playlists',
};

export function getSpotifyRedirectUri(): string {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return window.location.origin;
  }

  return 'ironlog://spotify-callback';
}

export type SpotifyTileTheme = 'spotify-dark' | 'spotify-light' | 'spotify-brand' | 'app-theme';
export type SpotifyRepeatState = 'off' | 'context' | 'track';

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  album: string;
  albumArt: string;
  durationMs: number;
  uri: string;
  externalUrl: string;
  trackNumber?: number;
  playedAt?: string;
  isLocal?: boolean;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  imageUrl: string;
  trackCount: number;
  owner: string;
  uri: string;
  tracksHref: string;
  externalUrl: string;
  description: string;
  isPinned: boolean;
  isFavorite: boolean;
}

export interface SpotifyTopArtist {
  id: string;
  name: string;
  imageUrl: string;
  genres: string[];
  uri: string;
  externalUrl: string;
}

export interface SpotifyPlaybackState {
  isPlaying: boolean;
  track: SpotifyTrack | null;
  progressMs: number;
  shuffleState: boolean;
  repeatState: SpotifyRepeatState;
  deviceName: string;
  deviceVolumePercent: number;
}

export interface SpotifyAnalytics {
  mostPlayedArtist: string;
  mostPlayedGenre: string;
  mostPlayedTrack: string;
  recentMinutes: number;
  listeningStreakDays: number;
  genreDistribution: { genre: string; count: number }[];
  historyByDay: { label: string; count: number }[];
}

interface PagedResponse<T> {
  items?: T[];
  next?: string | null;
}

interface SpotifyState {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  isAuthed: boolean;
  clientId: string;
  codeVerifier: string;
  authStatus: 'idle' | 'opening' | 'exchanging' | 'ready' | 'error';
  authError: string;
  tileTheme: SpotifyTileTheme;

  playback: SpotifyPlaybackState | null;
  isLoadingPlayback: boolean;
  playbackError: string;
  queue: SpotifyTrack[];
  isLoadingQueue: boolean;

  playlists: SpotifyPlaylist[];
  playlistTracks: SpotifyTrack[];
  playlistTracksById: Record<string, SpotifyTrack[]>;
  playlistTrackCounts: Record<string, number>;
  playlistTrackLoading: Record<string, boolean>;
  playlistTrackErrors: Record<string, string>;
  isLoadingPlaylistTracks: boolean;
  isLoadingLibrary: boolean;
  libraryError: string;
  favoritePlaylistIds: string[];
  pinnedPlaylistIds: string[];

  savedTracks: SpotifyTrack[];
  savedTrackIds: string[];
  recentlyPlayed: SpotifyTrack[];
  topTracks: SpotifyTrack[];
  topArtists: SpotifyTopArtist[];
  analytics: SpotifyAnalytics;
  isLoadingStats: boolean;
  statsError: string;

  setClientId: (id: string) => void;
  setTileTheme: (theme: SpotifyTileTheme) => void;
  setPlaylistFavorite: (playlistId: string, favorite: boolean) => void;
  setPlaylistPinned: (playlistId: string, pinned: boolean) => void;
  startAuth: () => Promise<void>;
  handleCallback: (urlOrHash: string) => Promise<boolean>;
  exchangeCodeForToken: (code: string) => Promise<boolean>;
  refreshAccessToken: () => Promise<void>;
  logout: () => void;
  fetchPlayback: (force?: boolean) => Promise<void>;
  fetchQueue: () => Promise<void>;
  play: () => Promise<void>;
  pause: () => Promise<void>;
  skipNext: () => Promise<void>;
  skipPrevious: () => Promise<void>;
  toggleShuffle: () => Promise<void>;
  setRepeatMode: (repeat: SpotifyRepeatState) => Promise<void>;
  cycleRepeat: () => Promise<void>;
  setVolume: (volumePercent: number) => Promise<void>;
  seekToPosition: (positionMs: number) => Promise<void>;
  fetchPlaylists: (force?: boolean) => Promise<void>;
  fetchSavedTracks: (force?: boolean) => Promise<void>;
  checkSavedTracks: (uris: string[]) => Promise<void>;
  saveTrack: (track: SpotifyTrack) => Promise<void>;
  removeSavedTrack: (track: SpotifyTrack) => Promise<void>;
  toggleSavedTrack: (track: SpotifyTrack) => Promise<void>;
  fetchRecentlyPlayed: (force?: boolean) => Promise<void>;
  fetchTopTracks: (force?: boolean) => Promise<void>;
  fetchTopArtists: (force?: boolean) => Promise<void>;
  fetchStats: (force?: boolean) => Promise<void>;
  fetchPlaylistTracks: (playlistId: string, force?: boolean) => Promise<void>;
  playContext: (contextUri: string, offset?: number) => Promise<void>;
  playTrackUri: (trackUri: string) => Promise<void>;
  addToQueue: (trackUri: string) => Promise<void>;
  openInSpotify: (urlOrUri: string) => Promise<void>;
  apiFetch: (pathOrUrl: string, options?: RequestInit) => Promise<any>;
  fetchAllPages: <T = any>(pathOrUrl: string, maxPages?: number) => Promise<T[]>;
}

function generateRandomString(length: number): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let text = '';
  for (let i = 0; i < length; i += 1) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const base64Digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    verifier,
    { encoding: Crypto.CryptoEncoding.BASE64 },
  );
  return base64Digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function readJson<T>(key: string, fallback: T): T {
  const raw = mmkvStorage.getString(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  mmkvStorage.set(key, JSON.stringify(value));
}

function readCache<T>(key: string, ttlMs: number): T | null {
  const cached = readJson<{ ts: number; data: T } | null>(key, null);
  if (!cached || Date.now() - cached.ts > ttlMs) return null;
  return cached.data;
}

function writeCache<T>(key: string, data: T) {
  writeJson(key, { ts: Date.now(), data });
}

function normalizeTileTheme(value: string): SpotifyTileTheme {
  if (value === 'green-black') return 'spotify-dark';
  if (value === 'green-white') return 'spotify-light';
  if (value === 'spotify-light' || value === 'spotify-brand' || value === 'app-theme') return value;
  return 'spotify-dark';
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function withQuery(path: string, params: Record<string, string | number | boolean | undefined>) {
  const pairs = Object.entries(params).filter(([, value]) => value !== undefined);
  if (!pairs.length) return path;
  const joiner = path.includes('?') ? '&' : '?';
  const query = new URLSearchParams(pairs.map(([key, value]) => [key, String(value)]));
  return `${path}${joiner}${query.toString()}`;
}

function formatApiError(status: number, body: string) {
  if (status === 401) return 'Spotify authorization expired. Please log in again.';
  if (status === 403) return 'Spotify denied this action. Some playback controls require Spotify Premium or an active device.';
  if (status === 404) return 'Spotify could not find an active playback device.';
  if (status === 429) return 'Spotify rate limit reached. Please wait a moment and try again.';
  return body ? `Spotify API error ${status}: ${body}` : `Spotify API error ${status}`;
}

function parseTrack(item: any, trackNumber?: number, playedAt?: string): SpotifyTrack {
  const track = item?.track && item.track.type === 'track' ? item.track : item;
  return {
    id: track?.id ?? '',
    name: track?.name ?? 'Unknown track',
    artist: track?.artists?.map((a: any) => a.name).join(', ') ?? 'Unknown artist',
    album: track?.album?.name ?? '',
    albumArt: track?.album?.images?.[0]?.url ?? '',
    durationMs: track?.duration_ms ?? 0,
    uri: track?.uri ?? '',
    externalUrl: track?.external_urls?.spotify ?? '',
    trackNumber,
    playedAt,
    isLocal: track?.is_local ?? false,
  };
}

function parseArtist(item: any): SpotifyTopArtist {
  return {
    id: item?.id ?? '',
    name: item?.name ?? 'Unknown artist',
    imageUrl: item?.images?.[0]?.url ?? '',
    genres: item?.genres ?? [],
    uri: item?.uri ?? '',
    externalUrl: item?.external_urls?.spotify ?? '',
  };
}

function parsePlaylist(item: any, pinnedIds: string[], favoriteIds: string[]): SpotifyPlaylist {
  return {
    id: item?.id ?? '',
    name: item?.name ?? 'Untitled playlist',
    imageUrl: item?.images?.[0]?.url ?? '',
    trackCount: item?.items?.total ?? item?.tracks?.total ?? 0,
    owner: item?.owner?.display_name ?? item?.owner?.id ?? '',
    uri: item?.uri ?? '',
    tracksHref: item?.tracks?.href ?? '',
    externalUrl: item?.external_urls?.spotify ?? '',
    description: item?.description ?? '',
    isPinned: pinnedIds.includes(item?.id),
    isFavorite: favoriteIds.includes(item?.id),
  };
}

function extractCallbackCode(urlOrHash: string): string {
  const candidates = [urlOrHash];
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    candidates.unshift(window.location.href, window.location.search, window.location.hash);
  }

  for (const raw of candidates) {
    if (!raw) continue;
    const clean = raw.replace(/^[?#]/, '');
    const directCode = new URLSearchParams(clean).get('code');
    if (directCode) return directCode;

    try {
      const url = raw.startsWith('http') || raw.includes('://')
        ? new URL(raw)
        : new URL(`https://ironlog.local/?${clean}`);
      const code = url.searchParams.get('code') ?? new URLSearchParams(url.hash.replace(/^#/, '')).get('code');
      if (code) return code;
    } catch {
      const code = new URLSearchParams(clean).get('code');
      if (code) return code;
    }
  }

  return '';
}

function emptyAnalytics(): SpotifyAnalytics {
  return {
    mostPlayedArtist: 'Not enough data',
    mostPlayedGenre: 'Not enough data',
    mostPlayedTrack: 'Not enough data',
    recentMinutes: 0,
    listeningStreakDays: 0,
    genreDistribution: [],
    historyByDay: [],
  };
}

function deriveAnalytics(
  topTracks: SpotifyTrack[],
  topArtists: SpotifyTopArtist[],
  recentlyPlayed: SpotifyTrack[],
): SpotifyAnalytics {
  const genreCounts = new Map<string, number>();
  topArtists.forEach((artist) => {
    artist.genres.forEach((genre) => genreCounts.set(genre, (genreCounts.get(genre) ?? 0) + 1));
  });
  const genreDistribution = Array.from(genreCounts.entries())
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const recentMinutes = Math.round(
    recentlyPlayed.reduce((sum, track) => sum + (track.durationMs || 0), 0) / 60000,
  );

  const byDate = new Map<string, number>();
  recentlyPlayed.forEach((track) => {
    if (!track.playedAt) return;
    const label = track.playedAt.slice(0, 10);
    byDate.set(label, (byDate.get(label) ?? 0) + 1);
  });

  const historyByDay = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - offset));
    const label = date.toISOString().slice(0, 10);
    return { label, count: byDate.get(label) ?? 0 };
  });

  let streak = 0;
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const label = date.toISOString().slice(0, 10);
    if ((byDate.get(label) ?? 0) === 0) break;
    streak += 1;
  }

  return {
    mostPlayedArtist: topArtists[0]?.name ?? topTracks[0]?.artist ?? 'Not enough data',
    mostPlayedGenre: genreDistribution[0]?.genre ?? 'Not enough data',
    mostPlayedTrack: topTracks[0]?.name ?? recentlyPlayed[0]?.name ?? 'Not enough data',
    recentMinutes,
    listeningStreakDays: streak,
    genreDistribution,
    historyByDay,
  };
}

export const useSpotifyStore = create<SpotifyState>((set, get) => {
  const storedAccess = mmkvStorage.getString(STORAGE.access) ?? '';
  const storedRefresh = mmkvStorage.getString(STORAGE.refresh) ?? '';
  const storedExpires = Number(mmkvStorage.getString(STORAGE.expires) || '0');
  const storedClientId = mmkvStorage.getString(STORAGE.clientId) ?? '';
  const storedVerifier = mmkvStorage.getString(STORAGE.verifier) ?? '';
  const storedTileTheme = normalizeTileTheme(mmkvStorage.getString(STORAGE.tileTheme) ?? 'spotify-dark');
  const favoritePlaylistIds = readJson<string[]>(STORAGE.favorites, []);
  const pinnedPlaylistIds = readJson<string[]>(STORAGE.pinned, []);
  const playlistCache = readCache<SpotifyPlaylist[]>(STORAGE.playlists, CACHE_TTL_MS) ?? [];
  const statsCache = readCache<{
    recentlyPlayed: SpotifyTrack[];
    topTracks: SpotifyTrack[];
    topArtists: SpotifyTopArtist[];
  }>(STORAGE.stats, STATS_CACHE_TTL_MS);
  const refreshPlayerState = (includeQueue = false) => {
    const run = () => {
      get().fetchPlayback(true).catch(() => undefined);
      if (includeQueue) get().fetchQueue().catch(() => undefined);
    };

    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 0);
    }
  };

  return {
    accessToken: storedAccess,
    refreshToken: storedRefresh,
    expiresAt: storedExpires,
    isAuthed: !!storedAccess && Date.now() < storedExpires,
    clientId: storedClientId,
    codeVerifier: storedVerifier,
    authStatus: storedAccess && Date.now() < storedExpires ? 'ready' : 'idle',
    authError: '',
    tileTheme: storedTileTheme,

    playback: null,
    isLoadingPlayback: false,
    playbackError: '',
    queue: [],
    isLoadingQueue: false,

    playlists: playlistCache.map((playlist) => ({
      ...playlist,
      isPinned: pinnedPlaylistIds.includes(playlist.id),
      isFavorite: favoritePlaylistIds.includes(playlist.id),
    })),
    playlistTracks: [],
    playlistTracksById: {},
    playlistTrackCounts: {},
    playlistTrackLoading: {},
    playlistTrackErrors: {},
    isLoadingPlaylistTracks: false,
    isLoadingLibrary: false,
    libraryError: '',
    favoritePlaylistIds,
    pinnedPlaylistIds,

    savedTracks: [],
    savedTrackIds: [],
    recentlyPlayed: statsCache?.recentlyPlayed ?? [],
    topTracks: statsCache?.topTracks ?? [],
    topArtists: statsCache?.topArtists ?? [],
    analytics: deriveAnalytics(
      statsCache?.topTracks ?? [],
      statsCache?.topArtists ?? [],
      statsCache?.recentlyPlayed ?? [],
    ),
    isLoadingStats: false,
    statsError: '',

    setClientId: (id: string) => {
      mmkvStorage.set(STORAGE.clientId, id);
      set({ clientId: id.trim() });
    },

    setTileTheme: (theme: SpotifyTileTheme) => {
      mmkvStorage.set(STORAGE.tileTheme, theme);
      set({ tileTheme: theme });
    },

    setPlaylistFavorite: (playlistId: string, favorite: boolean) => {
      const ids = favorite
        ? unique([...get().favoritePlaylistIds, playlistId])
        : get().favoritePlaylistIds.filter((id) => id !== playlistId);
      writeJson(STORAGE.favorites, ids);
      set((state) => ({
        favoritePlaylistIds: ids,
        playlists: state.playlists.map((playlist) => (
          playlist.id === playlistId ? { ...playlist, isFavorite: favorite } : playlist
        )),
      }));
    },

    setPlaylistPinned: (playlistId: string, pinned: boolean) => {
      const ids = pinned
        ? unique([...get().pinnedPlaylistIds, playlistId])
        : get().pinnedPlaylistIds.filter((id) => id !== playlistId);
      writeJson(STORAGE.pinned, ids);
      set((state) => ({
        pinnedPlaylistIds: ids,
        playlists: state.playlists.map((playlist) => (
          playlist.id === playlistId ? { ...playlist, isPinned: pinned } : playlist
        )),
      }));
    },

    startAuth: async () => {
      const cid = get().clientId.trim();
      if (!cid) return;
      set({ authStatus: 'opening', authError: '' });

      const verifier = generateRandomString(64);
      mmkvStorage.set(STORAGE.verifier, verifier);
      set({ codeVerifier: verifier });

      const challenge = await generateCodeChallenge(verifier);
      const params = new URLSearchParams({
        client_id: cid,
        response_type: 'code',
        redirect_uri: getSpotifyRedirectUri(),
        scope: SCOPES,
        show_dialog: 'true',
        code_challenge_method: 'S256',
        code_challenge: challenge,
      });

      try {
        const url = `${AUTH_URL}?${params.toString()}`;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.location.href = url;
          return;
        }

        const canOpen = await Linking.canOpenURL(url);
        if (!canOpen) throw new Error('Unable to open Spotify authorization page.');
        await Linking.openURL(url);
      } catch (e) {
        set({ authStatus: 'error', authError: e instanceof Error ? e.message : String(e) });
      }
    },

    handleCallback: async (urlOrHash: string) => {
      const code = extractCallbackCode(urlOrHash);
      if (!code) return false;
      return get().exchangeCodeForToken(code);
    },

    exchangeCodeForToken: async (code: string) => {
      const cid = get().clientId.trim();
      const verifier = get().codeVerifier || mmkvStorage.getString(STORAGE.verifier) || '';
      if (!cid || !verifier) {
        set({
          authStatus: 'error',
          authError: 'Spotify auth could not finish because the Client ID or login verifier is missing. Start login again.',
        });
        return false;
      }

      try {
        set({ authStatus: 'exchanging', authError: '' });
        const body = new URLSearchParams({
          client_id: cid,
          grant_type: 'authorization_code',
          code,
          redirect_uri: getSpotifyRedirectUri(),
          code_verifier: verifier,
        });

        const res = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!res.ok) {
          const err = await res.text();
          console.error('Token exchange failed:', err);
          set({
            authStatus: 'error',
            authError: `Spotify token exchange failed. Check that your redirect URI is exactly ${getSpotifyRedirectUri()}.`,
          });
          return false;
        }

        const data = await res.json();
        const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

        mmkvStorage.set(STORAGE.access, data.access_token);
        if (data.refresh_token) mmkvStorage.set(STORAGE.refresh, data.refresh_token);
        mmkvStorage.set(STORAGE.expires, String(expiresAt));

        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? get().refreshToken,
          expiresAt,
          isAuthed: true,
          authStatus: 'ready',
          authError: '',
        });

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          window.history.replaceState({}, '', window.location.pathname);
        }

        get().fetchPlayback(true).catch(() => undefined);
        get().fetchStats(true).catch(() => undefined);
        get().fetchPlaylists(true).catch(() => undefined);
        return true;
      } catch (e) {
        console.error('Token exchange error:', e);
        set({ authStatus: 'error', authError: e instanceof Error ? e.message : String(e) });
        return false;
      }
    },

    refreshAccessToken: async () => {
      const cid = get().clientId.trim();
      const refresh = get().refreshToken;
      if (!refresh || !cid) {
        get().logout();
        return;
      }

      try {
        const body = new URLSearchParams({
          client_id: cid,
          grant_type: 'refresh_token',
          refresh_token: refresh,
        });

        const res = await fetch(TOKEN_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });

        if (!res.ok) {
          get().logout();
          return;
        }

        const data = await res.json();
        const expiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;

        mmkvStorage.set(STORAGE.access, data.access_token);
        if (data.refresh_token) mmkvStorage.set(STORAGE.refresh, data.refresh_token);
        mmkvStorage.set(STORAGE.expires, String(expiresAt));

        set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token ?? refresh,
          expiresAt,
          isAuthed: true,
          authStatus: 'ready',
          authError: '',
        });
      } catch {
        get().logout();
      }
    },

    logout: () => {
      [
        STORAGE.access,
        STORAGE.refresh,
        STORAGE.expires,
        STORAGE.verifier,
        STORAGE.playlists,
        STORAGE.stats,
      ].forEach((key) => mmkvStorage.delete(key));
      set({
        accessToken: '',
        refreshToken: '',
        expiresAt: 0,
        isAuthed: false,
        authStatus: 'idle',
        authError: '',
        playback: null,
        playbackError: '',
        queue: [],
        playlists: [],
        playlistTracks: [],
        playlistTracksById: {},
        playlistTrackCounts: {},
        playlistTrackLoading: {},
        playlistTrackErrors: {},
        libraryError: '',
        savedTracks: [],
        savedTrackIds: [],
        recentlyPlayed: [],
        topTracks: [],
        topArtists: [],
        analytics: emptyAnalytics(),
        statsError: '',
      });
    },

    apiFetch: async (pathOrUrl, options = {}) => {
      let token = get().accessToken;
      if (!token || Date.now() > get().expiresAt) {
        await get().refreshAccessToken();
        token = get().accessToken;
        if (!token) throw new Error('Spotify authorization expired. Please log in again.');
      }

      const run = async (bearer: string) => {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${bearer}`,
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...(options.headers as Record<string, string> | undefined),
        };
        return fetch(pathOrUrl.startsWith('http') ? pathOrUrl : `${API_BASE}${pathOrUrl}`, {
          ...options,
          headers,
        });
      };

      let res = await run(token);
      if (res.status === 401) {
        await get().refreshAccessToken();
        token = get().accessToken;
        if (!token) throw new Error('Spotify authorization expired. Please log in again.');
        res = await run(token);
      }

      if (res.status === 204) return null;
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(formatApiError(res.status, body));
      }

      const text = await res.text();
      return text ? JSON.parse(text) : null;
    },

    fetchAllPages: async <T,>(pathOrUrl: string, maxPages = 50) => {
      const items: T[] = [];
      let next: string | null = pathOrUrl;
      let pages = 0;

      while (next && pages < maxPages) {
        const page: PagedResponse<T> = await get().apiFetch(next);
        items.push(...(page?.items ?? []));
        next = page?.next ?? null;
        pages += 1;
      }

      return items;
    },

    fetchPlayback: async (silent = false) => {
      if (!silent) set({ isLoadingPlayback: true, playbackError: '' });
      else set({ playbackError: '' });
      try {
        const data = await get().apiFetch('/me/player');
        if (!data) {
          set({ playback: null, isLoadingPlayback: false });
          return;
        }

        set({
          playback: {
            isPlaying: data.is_playing ?? false,
            track: data.item ? parseTrack(data.item) : null,
            progressMs: data.progress_ms ?? 0,
            shuffleState: data.shuffle_state ?? false,
            repeatState: data.repeat_state ?? 'off',
            deviceName: data.device?.name ?? 'Unknown device',
            deviceVolumePercent: data.device?.volume_percent ?? 0,
          },
          isLoadingPlayback: false,
          playbackError: '',
        });
      } catch (e) {
        set({ isLoadingPlayback: false, playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    fetchQueue: async () => {
      set({ isLoadingQueue: true });
      try {
        const data = await get().apiFetch('/me/player/queue');
        set({
          queue: (data?.queue ?? [])
            .filter((item: any) => item?.type === 'track')
            .map((item: any, index: number) => parseTrack(item, index + 1)),
          isLoadingQueue: false,
          playbackError: '',
        });
      } catch (e) {
        set({ isLoadingQueue: false, playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    play: async () => {
      const prev = get().playback;
      if (prev) set({ playback: { ...prev, isPlaying: true } });
      try {
        await get().apiFetch('/me/player/play', { method: 'PUT' });
        refreshPlayerState();
      } catch (e) {
        if (prev) set({ playback: prev });
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    pause: async () => {
      const prev = get().playback;
      if (prev) set({ playback: { ...prev, isPlaying: false } });
      try {
        await get().apiFetch('/me/player/pause', { method: 'PUT' });
        refreshPlayerState();
      } catch (e) {
        if (prev) set({ playback: prev });
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    skipNext: async () => {
      const prev = get().playback;
      const prevQueue = get().queue;
      const nextTrack = prevQueue[0];
      if (prev) {
        set({
          playback: {
            ...prev,
            track: nextTrack ?? prev.track,
            progressMs: 0,
            isPlaying: true,
          },
          queue: nextTrack ? prevQueue.slice(1) : prevQueue,
          playbackError: '',
        });
      }
      try {
        await get().apiFetch('/me/player/next', { method: 'POST' });
        refreshPlayerState(true);
      } catch (e) {
        if (prev) set({ playback: prev, queue: prevQueue });
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    skipPrevious: async () => {
      const prev = get().playback;
      if (prev) set({ playback: { ...prev, progressMs: 0 }, playbackError: '' });
      try {
        await get().apiFetch('/me/player/previous', { method: 'POST' });
        refreshPlayerState(true);
      } catch (e) {
        if (prev) set({ playback: prev });
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    toggleShuffle: async () => {
      const prev = get().playback;
      const next = !(prev?.shuffleState ?? false);
      if (prev) set({ playback: { ...prev, shuffleState: next } });
      try {
        await get().apiFetch(withQuery('/me/player/shuffle', { state: next }), { method: 'PUT' });
        refreshPlayerState();
      } catch (e) {
        if (prev) set({ playback: prev });
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    setRepeatMode: async (repeat) => {
      const prev = get().playback;
      if (prev) set({ playback: { ...prev, repeatState: repeat } });
      try {
        await get().apiFetch(withQuery('/me/player/repeat', { state: repeat }), { method: 'PUT' });
        refreshPlayerState();
      } catch (e) {
        if (prev) set({ playback: prev });
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    cycleRepeat: async () => {
      const current = get().playback?.repeatState ?? 'off';
      const next = current === 'off' ? 'context' : current === 'context' ? 'track' : 'off';
      await get().setRepeatMode(next);
    },

    setVolume: async (volumePercent) => {
      const clamped = Math.max(0, Math.min(100, Math.round(volumePercent)));
      const prev = get().playback;
      if (prev) set({ playback: { ...prev, deviceVolumePercent: clamped } });
      try {
        await get().apiFetch(withQuery('/me/player/volume', { volume_percent: clamped }), { method: 'PUT' });
      } catch (e) {
        if (prev) set({ playback: prev });
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    seekToPosition: async (positionMs) => {
      const target = Math.max(0, Math.round(positionMs));
      const prev = get().playback;
      if (prev) set({ playback: { ...prev, progressMs: target } });
      try {
        await get().apiFetch(withQuery('/me/player/seek', { position_ms: target }), { method: 'PUT' });
        refreshPlayerState();
      } catch (e) {
        if (prev) set({ playback: prev });
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    fetchPlaylists: async (force = false) => {
      const cached = force ? null : readCache<SpotifyPlaylist[]>(STORAGE.playlists, CACHE_TTL_MS);
      if (cached) {
        const pinned = get().pinnedPlaylistIds;
        const favorites = get().favoritePlaylistIds;
        set({
          playlists: cached.map((playlist) => ({
            ...playlist,
            isPinned: pinned.includes(playlist.id),
            isFavorite: favorites.includes(playlist.id),
          })),
        });
        return;
      }

      set({ isLoadingLibrary: true, libraryError: '' });
      try {
        const items = await get().fetchAllPages<any>('/me/playlists?limit=50');
        const pinned = get().pinnedPlaylistIds;
        const favorites = get().favoritePlaylistIds;
        const playlists = items
          .filter((item) => item?.id)
          .map((item) => parsePlaylist(item, pinned, favorites));
        writeCache(STORAGE.playlists, playlists);
        set({ playlists, isLoadingLibrary: false, libraryError: '' });
      } catch (e) {
        set({ isLoadingLibrary: false, libraryError: e instanceof Error ? e.message : String(e) });
      }
    },

    fetchSavedTracks: async (force = false) => {
      if (!force && get().savedTracks.length > 0) return;
      try {
        const items = await get().fetchAllPages<any>('/me/tracks?limit=50', 4);
        const tracks = items.map((item) => parseTrack(item.track));
        set({
          savedTracks: tracks,
          savedTrackIds: unique([...get().savedTrackIds, ...tracks.map((track) => track.uri)]),
        });
      } catch (e) {
        set({ libraryError: e instanceof Error ? e.message : String(e) });
      }
    },

    checkSavedTracks: async (uris) => {
      const cleanUris = unique(uris.filter(Boolean));
      if (!cleanUris.length) return;
      try {
        const saved = new Set(get().savedTrackIds);
        for (let i = 0; i < cleanUris.length; i += 40) {
          const chunk = cleanUris.slice(i, i + 40);
          const result: boolean[] = await get().apiFetch(withQuery('/me/library/contains', { uris: chunk.join(',') }));
          result.forEach((isSaved, index) => {
            if (isSaved) saved.add(chunk[index]);
            else saved.delete(chunk[index]);
          });
        }
        set({ savedTrackIds: Array.from(saved) });
      } catch (e) {
        set({ libraryError: e instanceof Error ? e.message : String(e) });
      }
    },

    saveTrack: async (track) => {
      if (!track.uri) return;
      const prev = get().savedTrackIds;
      set({ savedTrackIds: unique([...prev, track.uri]) });
      try {
        await get().apiFetch(withQuery('/me/library', { uris: track.uri }), { method: 'PUT' });
      } catch (e) {
        set({ savedTrackIds: prev, libraryError: e instanceof Error ? e.message : String(e) });
      }
    },

    removeSavedTrack: async (track) => {
      if (!track.uri) return;
      const prev = get().savedTrackIds;
      set({ savedTrackIds: prev.filter((uri) => uri !== track.uri) });
      try {
        await get().apiFetch(withQuery('/me/library', { uris: track.uri }), { method: 'DELETE' });
      } catch (e) {
        set({ savedTrackIds: prev, libraryError: e instanceof Error ? e.message : String(e) });
      }
    },

    toggleSavedTrack: async (track) => {
      if (get().savedTrackIds.includes(track.uri)) {
        await get().removeSavedTrack(track);
      } else {
        await get().saveTrack(track);
      }
    },

    fetchRecentlyPlayed: async (force = false) => {
      if (!force && get().recentlyPlayed.length > 0) return;
      try {
        const data = await get().apiFetch('/me/player/recently-played?limit=50');
        const recentlyPlayed = (data?.items ?? []).map((item: any) => parseTrack(item.track, undefined, item.played_at));
        const analytics = deriveAnalytics(get().topTracks, get().topArtists, recentlyPlayed);
        set({ recentlyPlayed, analytics });
      } catch (e) {
        set({ statsError: e instanceof Error ? e.message : String(e) });
      }
    },

    fetchTopTracks: async (force = false) => {
      if (!force && get().topTracks.length > 0) return;
      try {
        const data = await get().apiFetch('/me/top/tracks?limit=20&time_range=short_term');
        const topTracks = (data?.items ?? []).map((item: any, index: number) => parseTrack(item, index + 1));
        const analytics = deriveAnalytics(topTracks, get().topArtists, get().recentlyPlayed);
        set({ topTracks, analytics });
      } catch (e) {
        set({ statsError: e instanceof Error ? e.message : String(e) });
      }
    },

    fetchTopArtists: async (force = false) => {
      if (!force && get().topArtists.length > 0) return;
      try {
        const data = await get().apiFetch('/me/top/artists?limit=20&time_range=short_term');
        const topArtists = (data?.items ?? []).map(parseArtist);
        const analytics = deriveAnalytics(get().topTracks, topArtists, get().recentlyPlayed);
        set({ topArtists, analytics });
      } catch (e) {
        set({ statsError: e instanceof Error ? e.message : String(e) });
      }
    },

    fetchStats: async (force = false) => {
      const cached = force ? null : readCache<{
        recentlyPlayed: SpotifyTrack[];
        topTracks: SpotifyTrack[];
        topArtists: SpotifyTopArtist[];
      }>(STORAGE.stats, STATS_CACHE_TTL_MS);
      if (cached) {
        set({
          ...cached,
          analytics: deriveAnalytics(cached.topTracks, cached.topArtists, cached.recentlyPlayed),
        });
        return;
      }

      set({ isLoadingStats: true, statsError: '' });
      try {
        const [recentData, tracksData, artistsData] = await Promise.all([
          get().apiFetch('/me/player/recently-played?limit=50'),
          get().apiFetch('/me/top/tracks?limit=20&time_range=short_term'),
          get().apiFetch('/me/top/artists?limit=20&time_range=short_term'),
        ]);
        const recentlyPlayed = (recentData?.items ?? []).map((item: any) => parseTrack(item.track, undefined, item.played_at));
        const topTracks = (tracksData?.items ?? []).map((item: any, index: number) => parseTrack(item, index + 1));
        const topArtists = (artistsData?.items ?? []).map(parseArtist);
        const analytics = deriveAnalytics(topTracks, topArtists, recentlyPlayed);
        writeCache(STORAGE.stats, { recentlyPlayed, topTracks, topArtists });
        set({
          recentlyPlayed,
          topTracks,
          topArtists,
          analytics,
          isLoadingStats: false,
          statsError: '',
        });
      } catch (e) {
        set({ isLoadingStats: false, statsError: e instanceof Error ? e.message : String(e) });
      }
    },

    fetchPlaylistTracks: async (playlistId, force = false) => {
      const cacheKey = `spotify_playlist_tracks_${playlistId}`;
      const cached = force ? null : readCache<SpotifyTrack[]>(cacheKey, CACHE_TTL_MS);
      if (cached) {
        set((state) => ({
          playlistTracks: cached,
          playlistTracksById: { ...state.playlistTracksById, [playlistId]: cached },
          playlistTrackCounts: { ...state.playlistTrackCounts, [playlistId]: cached.length },
          playlists: state.playlists.map((playlist) => (
            playlist.id === playlistId ? { ...playlist, trackCount: cached.length } : playlist
          )),
        }));
        get().checkSavedTracks(cached.map((track) => track.uri)).catch(() => undefined);
        return;
      }

      set((state) => ({
        playlistTrackLoading: { ...state.playlistTrackLoading, [playlistId]: true },
        playlistTrackErrors: { ...state.playlistTrackErrors, [playlistId]: '' },
        isLoadingPlaylistTracks: true,
      }));

      try {
        const playlist = get().playlists.find((item) => item.id === playlistId);
        const tracksPath = withQuery(
          playlist?.tracksHref || `/playlists/${playlistId}/tracks`,
          { limit: 50, additional_types: 'track' },
        );
        const items = await get().fetchAllPages<any>(tracksPath);
        const tracks = items
          .map((item: any, index: number) => {
            const track = item?.track ?? item;
            if (!track || track.type !== 'track') return null;
            return parseTrack(track, index + 1);
          })
          .filter(Boolean) as SpotifyTrack[];
        writeCache(cacheKey, tracks);
        set((state) => ({
          playlistTracks: tracks,
          playlistTracksById: { ...state.playlistTracksById, [playlistId]: tracks },
          playlistTrackCounts: { ...state.playlistTrackCounts, [playlistId]: tracks.length },
          playlistTrackLoading: { ...state.playlistTrackLoading, [playlistId]: false },
          playlistTrackErrors: { ...state.playlistTrackErrors, [playlistId]: '' },
          isLoadingPlaylistTracks: false,
          playlists: state.playlists.map((playlist) => (
            playlist.id === playlistId ? { ...playlist, trackCount: tracks.length } : playlist
          )),
        }));
        get().checkSavedTracks(tracks.map((track) => track.uri)).catch(() => undefined);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        set((state) => ({
          playlistTrackLoading: { ...state.playlistTrackLoading, [playlistId]: false },
          playlistTrackErrors: { ...state.playlistTrackErrors, [playlistId]: message },
          isLoadingPlaylistTracks: false,
        }));
      }
    },

    playContext: async (contextUri, offset) => {
      try {
        const body: any = { context_uri: contextUri };
        if (offset !== undefined) body.offset = { position: offset };
        await get().apiFetch('/me/player/play', { method: 'PUT', body: JSON.stringify(body) });
        refreshPlayerState(true);
      } catch (e) {
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    playTrackUri: async (trackUri) => {
      if (!trackUri) return;
      try {
        await get().apiFetch('/me/player/play', {
          method: 'PUT',
          body: JSON.stringify({ uris: [trackUri] }),
        });
        refreshPlayerState(true);
      } catch (e) {
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    addToQueue: async (trackUri) => {
      if (!trackUri) return;
      try {
        await get().apiFetch(withQuery('/me/player/queue', { uri: trackUri }), { method: 'POST' });
        refreshPlayerState(true);
      } catch (e) {
        set({ playbackError: e instanceof Error ? e.message : String(e) });
      }
    },

    openInSpotify: async (urlOrUri) => {
      if (!urlOrUri) return;
      try {
        const target = urlOrUri.startsWith('spotify:')
          ? urlOrUri
          : urlOrUri;
        await Linking.openURL(target);
      } catch (e) {
        set({ libraryError: e instanceof Error ? e.message : String(e) });
      }
    },
  };
});


