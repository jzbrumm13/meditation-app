import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Easing, Modal, SafeAreaView,
  Dimensions,
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

// Cached once — good enough for the anchor math; we're not supporting
// mid-animation rotation here.
const { width: WINDOW_W, height: WINDOW_H } = Dimensions.get('window');

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

  // Sky (backdrop) animation — starts tiny and zooms up past 1 then settles,
  // giving a rocket-launch feeling of travelling up into space.
  const skyOpacity = useRef(new Animated.Value(0)).current;
  const skyScale = useRef(new Animated.Value(0.15)).current;

  // Content (menu items / sub-screen) animation — held back until the sky
  // has largely arrived, so the sky reads as the "destination" and the UI
  // then condenses into view on top of it.
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const contentTranslate = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (visible) {
      // Reset to main whenever the modal opens.
      setScreen('main');

      // Reset to starting positions so re-opens don't snap in.
      skyOpacity.setValue(0);
      skyScale.setValue(0.15);
      contentOpacity.setValue(0);
      contentTranslate.setValue(24);

      Animated.parallel([
        // Sky zooms up from tiny → full, fast ease-out quart for the sense
        // of rapid acceleration followed by a soft settle.
        Animated.timing(skyScale, {
          toValue: 1,
          duration: 900,
          easing: Easing.out(Easing.poly(4)),
          useNativeDriver: true,
        }),
        Animated.timing(skyOpacity, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Menu items fade + lift in after the sky is mostly there.
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 500,
          delay: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslate, {
          toValue: 0,
          duration: 600,
          delay: 500,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Close: reverse of launch — content drops first, then sky recedes.
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 0,
          duration: 180,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(skyOpacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(skyScale, {
          toValue: 0.5,
          duration: 320,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, skyOpacity, skyScale, contentOpacity, contentTranslate]);

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
      {/* Sky layer: zooms up from a tiny point at the upper-right corner
          (where the moon button lives) out to full screen, so it feels like
          the camera is being launched toward the home moon icon. */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: skyOpacity,
            transform: [
              // Pin the upper-right corner: derive translate from the current
              // scale such that the view's top-right stays at the window's
              // top-right throughout the zoom.
              {
                translateX: skyScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [WINDOW_W / 2, 0],
                }),
              },
              {
                translateY: skyScale.interpolate({
                  inputRange: [0, 1],
                  outputRange: [-WINDOW_H / 2, 0],
                }),
              },
              { scale: skyScale },
            ],
          },
        ]}
      >
        <NightSkyBackground />
      </Animated.View>

      {/* Foreground content — fades + lifts in after the sky has arrived */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            opacity: contentOpacity,
            transform: [{ translateY: contentTranslate }],
          },
        ]}
      >
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
