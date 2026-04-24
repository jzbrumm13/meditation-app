import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing, Modal, SafeAreaView,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { NightSkyBackground } from './NightSkyBackground';
import { FavoritesScreen } from './menu/FavoritesScreen';
import { PracticeScreen } from './menu/PracticeScreen';
import { SupportScreen } from './menu/SupportScreen';
import { AboutScreen } from './menu/AboutScreen';
import { theme } from '../config/theme';

// ─── MenuSheet ───────────────────────────────────────────────────────
//
// Full-screen immersive menu surfaced when the user taps the moon button.
// Visually: tapping the small moon transports you to a starry sky with a
// large dim moon in the upper right — continuity with the moon icon you
// just tapped.
//
// Internally it's a simple state machine: the 'main' screen shows the
// four items, tapping one navigates to a sub-screen, and the top-left
// button either goes back to main or closes the whole modal depending
// on where you are.

type SubScreen = 'main' | 'favorites' | 'practice' | 'support' | 'about';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

// ─── Icons (inline SVG — small enough not to warrant separate files) ─

const HeartIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 21s-7.5-4.5-10-9.5C.5 7 4 3 8 3c2 0 3 1 4 2 1-1 2-2 4-2 4 0 7.5 4 6 8.5-2.5 5-10 9.5-10 9.5z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const FlameIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22c4 0 7-3 7-7 0-4-3-7-5-9-1 3-4 3-4 6 0-2-2-3-3-4-2 2-2 5-2 7 0 4 3 7 7 7z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
);

const CoffeeIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8z"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Path
      d="M17 10h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2"
      stroke={color}
      strokeWidth={1.5}
      strokeLinejoin="round"
    />
    <Path
      d="M8 3c0 1-1 1.5-1 3M12 3c0 1-1 1.5-1 3"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
    />
  </Svg>
);

const InfoIcon = ({ color }: { color: string }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z"
      stroke={color}
      strokeWidth={1.5}
    />
    <Path d="M12 11v6" stroke={color} strokeWidth={1.5} strokeLinecap="round" />
    <Path d="M12 7v.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
  </Svg>
);

// ─── Main menu (the 'main' state shown on entry) ─────────────────────

interface MainMenuProps {
  onSelect: (screen: SubScreen) => void;
}

interface MenuItemSpec {
  key: Exclude<SubScreen, 'main'>;
  label: string;
  sublabel: string;
  Icon: React.FC<{ color: string }>;
}

const MENU_ITEMS: MenuItemSpec[] = [
  { key: 'favorites', label: 'Favorites',      sublabel: 'Meditations you\'ve hearted', Icon: HeartIcon },
  { key: 'practice',  label: 'Your Practice',  sublabel: 'Streak and total time',       Icon: FlameIcon },
  { key: 'support',   label: 'Support',        sublabel: 'Leave a tip',                 Icon: CoffeeIcon },
  { key: 'about',     label: 'About',          sublabel: 'Voice, credits, privacy',     Icon: InfoIcon },
];

function MainMenu({ onSelect }: MainMenuProps) {
  return (
    <View style={mainStyles.wrapper}>
      {MENU_ITEMS.map((item) => (
        <Pressable
          key={item.key}
          onPress={() => onSelect(item.key)}
          style={({ pressed }) => [
            mainStyles.item,
            pressed && mainStyles.itemPressed,
          ]}
        >
          <View style={mainStyles.iconBox}>
            <item.Icon color={theme.accent} />
          </View>
          <View style={mainStyles.textBox}>
            <Text style={mainStyles.itemLabel}>{item.label}</Text>
            <Text style={mainStyles.itemSub}>{item.sublabel}</Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}

const mainStyles = StyleSheet.create({
  wrapper: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 22,
    paddingHorizontal: 12,
    borderRadius: theme.radius.md,
    marginBottom: 4,
  },
  itemPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconBox: {
    width: 40,
    alignItems: 'center',
    marginRight: 16,
  },
  textBox: { flex: 1 },
  itemLabel: {
    fontSize: 19,
    color: theme.text,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  itemSub: {
    fontSize: 13,
    color: theme.textDim,
    marginTop: 3,
    letterSpacing: 0.2,
  },
});

// ─── The modal itself ────────────────────────────────────────────────

export function MenuSheet({ visible, onDismiss }: Props) {
  const [screen, setScreen] = useState<SubScreen>('main');
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    if (visible) {
      // Reset to main whenever the modal opens.
      setScreen('main');
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 550,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.94,
          duration: 320,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, opacity, scale]);

  const handleBack = () => {
    if (screen === 'main') {
      onDismiss();
    } else {
      setScreen('main');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      statusBarTranslucent
      animationType="none"
      onRequestClose={handleBack}
    >
      <Animated.View style={[StyleSheet.absoluteFill, { opacity, transform: [{ scale }] }]}>
        {/* Starfield + gradient + backdrop moon */}
        <NightSkyBackground />

        {/* Foreground content in safe area */}
        <SafeAreaView style={styles.safeArea}>
          {/* Top bar: close/back button */}
          <View style={styles.topBar}>
            <Pressable
              onPress={handleBack}
              style={styles.backButton}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityLabel={screen === 'main' ? 'Close menu' : 'Back'}
              accessibilityRole="button"
            >
              <Text style={styles.backButtonText}>
                {screen === 'main' ? '×' : '‹'}
              </Text>
            </Pressable>
          </View>

          {/* Sub-screen content */}
          <View style={styles.body}>
            {screen === 'main'      && <MainMenu onSelect={setScreen} />}
            {screen === 'favorites' && <FavoritesScreen />}
            {screen === 'practice'  && <PracticeScreen />}
            {screen === 'support'   && <SupportScreen />}
            {screen === 'about'     && <AboutScreen />}
          </View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 8,
    height: 48,
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: theme.text,
    fontSize: 30,
    fontWeight: '200',
    opacity: 0.7,
    // Slight nudge up so the × is optically centered in its hit area.
    marginTop: -2,
  },
  body: { flex: 1 },
});
