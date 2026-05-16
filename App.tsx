import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import * as Updates from 'expo-updates';

import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingTutorial, isOnboardingComplete } from './src/components/OnboardingTutorial';
import { theme } from './src/config/theme';

// On first launch we show a brief sequential tutorial (welcome → candle →
// moon). The completion flag is persisted in AsyncStorage; returning users
// go straight to the home screen and never see the tutorial again.
//
// Before showing any UI, we silently check for an OTA update. If a newer
// JS bundle is available on the Expo update server, we fetch it and
// hard-reload the app — the user never sees the stale code. Adds 1–4s
// to launch on the (rare) occasions when an update is available; zero
// perceptible delay otherwise. The check is wrapped in try/catch so
// network failures can never brick startup.

type AppState = 'loading' | 'tutorial' | 'home';

export default function App() {
  const [state, setState] = useState<AppState>('loading');

  useEffect(() => {
    async function bootstrap() {
      // OTA check — runs while the loading splash is on screen.
      // Skipped in dev so Metro stays the source of truth.
      if (!__DEV__) {
        try {
          const update = await Updates.checkForUpdateAsync();
          if (update.isAvailable) {
            await Updates.fetchUpdateAsync();
            await Updates.reloadAsync();
            return; // reloadAsync() hard-restarts; nothing below runs
          }
        } catch {
          // Network failures, missing manifest, server hiccups — never
          // block app startup on an OTA check. Fall through with the
          // bundled JS the user already has installed.
        }
      }

      // No update available (or dev mode) — proceed with normal launch.
      try {
        const done = await isOnboardingComplete();
        setState(done ? 'home' : 'tutorial');
      } catch {
        setState('home'); // fail-open so the app is never bricked
      }
    }
    bootstrap();
  }, []);

  if (state === 'loading') {
    return (
      <View style={styles.splash}>
        <ActivityIndicator color={theme.accent} />
      </View>
    );
  }

  if (state === 'tutorial') {
    return <OnboardingTutorial onComplete={() => setState('home')} />;
  }

  return <HomeScreen />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
