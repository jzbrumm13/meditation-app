import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { HomeScreen } from './src/screens/HomeScreen';
import { OnboardingTutorial, isOnboardingComplete } from './src/components/OnboardingTutorial';
import { theme } from './src/config/theme';

// TEMP — one-shot reset of the onboarding flag so we can re-test the
// tutorial. Remove this block (and the import above) after confirming.
AsyncStorage.removeItem('@onboarding_tutorial_complete_v1').catch(() => {});

// On first launch we show a brief sequential tutorial (welcome → candle →
// moon). The completion flag is persisted in AsyncStorage; returning users
// go straight to the home screen.

type AppState = 'loading' | 'tutorial' | 'home';

export default function App() {
  const [state, setState] = useState<AppState>('loading');

  useEffect(() => {
    isOnboardingComplete()
      .then((done) => setState(done ? 'home' : 'tutorial'))
      .catch(() => setState('home')); // fail-open so the app is never bricked
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
