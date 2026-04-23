import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, Animated, Dimensions, Easing, Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../config/theme';

interface Props {
  visible: boolean;
  onDismiss: () => void;
}

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = Math.min(360, SCREEN_H * 0.45);

export function MenuSheet({ visible, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_H + 40)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: visible ? 0 : SHEET_H + 40,
        duration: visible ? 420 : 260,
        easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 280 : 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateY, backdropOpacity]);

  return (
    <>
      {/* Dim backdrop — tap to dismiss */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.65)']}
            locations={[0.2, 1.0]}
            style={StyleSheet.absoluteFillObject}
          />
        </Pressable>
      </Animated.View>

      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.sheet, { transform: [{ translateY }] }]}
      >
        <View style={styles.handle} />

        <MenuItem
          label="Favorites"
          sublabel="Meditations you've hearted"
          onPress={() => {
            // TODO: open favorites screen (placeholder for now)
            onDismiss();
          }}
        />
        <MenuItem
          label="Settings"
          sublabel="Audio, display, about"
          onPress={() => {
            // TODO: open settings screen (placeholder for now)
            onDismiss();
          }}
        />
        <MenuItem
          label="Support the app"
          sublabel="One-time donation"
          onPress={() => {
            // TODO: in-app-purchase donation flow
            Linking.openURL('https://buymeacoffee.com/').catch(() => {});
            onDismiss();
          }}
        />
      </Animated.View>
    </>
  );
}

function MenuItem({ label, sublabel, onPress }: { label: string; sublabel?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <View>
        <Text style={styles.itemLabel}>{label}</Text>
        {sublabel && <Text style={styles.itemSub}>{sublabel}</Text>}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    height: SHEET_H,
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingBottom: 32,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: 'center',
    marginBottom: 18,
  },
  item: {
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderRadius: theme.radius.md,
    marginHorizontal: 8,
  },
  itemPressed: {
    backgroundColor: theme.surfaceHi,
  },
  itemLabel: {
    color: theme.text,
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  itemSub: {
    color: theme.textDim,
    fontSize: 13,
    marginTop: 3,
  },
});
