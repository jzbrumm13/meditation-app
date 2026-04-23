import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Pressable, FlatList, Animated, Dimensions, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../config/theme';
import { Tier } from '../config/tiers';
import { Meditation } from '../services/meditations';

interface Props {
  visible: boolean;
  tier: Tier | null;
  meditations: Meditation[];
  onSelect: (m: Meditation) => void;
  onDismiss: () => void;
}

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * theme.sheet.height;

export function MeditationSheet({ visible, tier, meditations, onSelect, onDismiss }: Props) {
  const translateY = useRef(new Animated.Value(SHEET_H + 40)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SHEET_H + 40,
          duration: 300,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, translateY, backdropOpacity]);

  return (
    <>
      {/* Gradient backdrop — subtle dim so the candle's light still reads through */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[StyleSheet.absoluteFillObject, { opacity: backdropOpacity }]}
      >
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onDismiss}>
          <LinearGradient
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']}
            locations={[0.3, 1.0]}
            style={StyleSheet.absoluteFillObject}
          />
        </Pressable>
      </Animated.View>

      {/* The sheet itself */}
      <Animated.View
        pointerEvents={visible ? 'auto' : 'none'}
        style={[styles.sheet, { transform: [{ translateY }] }]}
      >
        <View style={styles.handle} />

        {tier && (
          <View style={styles.header}>
            <Text style={styles.tierLabel}>{tier.label}</Text>
            <Text style={styles.tierSublabel}>{tier.sublabel}</Text>
          </View>
        )}

        <FlatList
          data={meditations}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
              onPress={() => onSelect(item)}
            >
              <View style={styles.itemMain}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.description && (
                  <Text style={styles.itemDesc} numberOfLines={1}>
                    {item.description}
                  </Text>
                )}
              </View>
              <Text style={styles.itemLength}>{item.lengthMinutes} min</Text>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No meditations in this range yet.</Text>
            </View>
          }
        />
      </Animated.View>
    </>
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
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  handle: {
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  tierLabel: {
    fontSize: 22,
    fontWeight: '300',
    letterSpacing: 0.5,
    color: theme.text,
  },
  tierSublabel: {
    fontSize: 13,
    color: theme.textDim,
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
    marginVertical: 2,
    marginHorizontal: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: theme.radius.md,
  },
  itemPressed: {
    backgroundColor: theme.surfaceHi,
  },
  itemMain: {
    flex: 1,
    marginRight: 12,
  },
  itemTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: theme.text,
  },
  itemDesc: {
    fontSize: 13,
    color: theme.textDim,
    marginTop: 2,
  },
  itemLength: {
    fontSize: 13,
    color: theme.accent,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  empty: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyText: {
    color: theme.textDim,
    fontSize: 14,
  },
});
