import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { Linking, Platform, StyleSheet } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useFonts } from 'expo-font';
import {
  DMSans_300Light,
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_600SemiBold,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from '@expo-google-fonts/dm-mono';

import { ThemeProvider, useAppTheme } from './src/theme/ThemeContext';
import { useUserStore } from './src/store/userStore';
import { useSpotifyStore } from './src/store/spotifyStore';
import RootNavigator from './src/navigation/RootNavigator';
import AppErrorBoundary from './src/components/app/AppErrorBoundary';
import AppRecoveryScreen from './src/components/app/AppRecoveryScreen';
import FloatingMusicController from './src/components/app/FloatingMusicController';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowList: true,
  }),
});

function AppInner({ onReady }: { onReady: () => void }) {
  const { loadUser } = useUserStore();
  const handleSpotifyCallback = useSpotifyStore((s) => s.handleCallback);
  const { theme, isDark } = useAppTheme();

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    const maybeHandleSpotifyUrl = (url?: string | null) => {
      if (!url || (!url.includes('code=') && !url.includes('spotify-callback'))) return;
      handleSpotifyCallback(url).catch(() => undefined);
    };

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      maybeHandleSpotifyUrl(window.location.href);
      return undefined;
    }

    Linking.getInitialURL()
      .then(maybeHandleSpotifyUrl)
      .catch(() => undefined);

    const sub = Linking.addEventListener('url', ({ url }) => maybeHandleSpotifyUrl(url));
    return () => sub.remove();
  }, [handleSpotifyCallback]);

  return (
    <NavigationContainer
      onReady={onReady}
      theme={{
        dark: isDark,
        colors: {
          primary: theme.accent,
          background: theme.bg,
          card: theme.surface,
          text: theme.ink,
          border: 'transparent',
          notification: theme.accent,
        },
      }}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <RootNavigator />
      <FloatingMusicController />
    </NavigationContainer>
  );
}

function AppRecoveryShell() {
  const [appSessionKey, setAppSessionKey] = useState(0);

  const retrySession = () => {
    setAppSessionKey((value) => value + 1);
  };

  return (
    <AppErrorBoundary
      resetKey={appSessionKey}
      fallback={({ error, reset }) => (
        <AppRecoveryScreen
          title="Something went wrong"
          message={error.message || 'IronLog hit an unexpected error while rendering this screen.'}
          primaryLabel="Try again"
          onPrimaryPress={() => {
            reset();
            retrySession();
          }}
          secondaryLabel="Restart app session"
          onSecondaryPress={retrySession}
          tone="error"
        />
      )}
    >
      <AppInner
        key={appSessionKey}
        onReady={() => {}}
      />
    </AppErrorBoundary>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    DMSans_300Light,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
    DMMono_400Regular,
    DMMono_500Medium,
  });

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppRecoveryShell />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
