import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { listFavorites, removeFavorite } from '../../services/favorites';
import { getMeditationsByIds, Meditation } from '../../services/meditations';
import { theme } from '../../config/theme';

// ─── FavoritesScreen ─────────────────────────────────────────────────
//
// Lists meditations the user has hearted (added during the wind-down
// phase of a previous sit). Tapping a row plays that meditation
// immediately — the menu closes, the candle programmatically lights at
// the right height, and audio begins. The user can also un-favorite a
// row by tapping the small heart on the right.

interface Props {
  /**
   * Called when the user taps a row to play. The menu's parent (HomeScreen
   * via MenuSheet) is responsible for dismissing the menu and lighting
   * the candle with this meditation.
   */
  onPlay?: (meditation: Meditation) => void;
}

export function FavoritesScreen({ onPlay }: Props) {
  const [meditations, setMeditations] = useState<Meditation[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ids = await listFavorites();
        const ms = await getMeditationsByIds(ids);
        if (!cancelled) setMeditations(ms);
      } catch {
        if (!cancelled) setMeditations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUnfavorite = async (m: Meditation) => {
    try {
      await removeFavorite(m.id);
      setMeditations((prev) => (prev ? prev.filter((x) => x.id !== m.id) : prev));
    } catch (e) {
      console.warn('removeFavorite failed:', e);
    }
  };

  if (meditations === null) {
    return <View style={styles.container} />;
  }

  if (meditations.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Favorites</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyBody}>
            After a meditation finishes, a small heart appears below the candle.
            Tap it to save that meditation here. You'll be able to play your
            favorites any time.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Favorites</Text>

      {meditations.map((m) => (
        <View key={m.id} style={styles.row}>
          {/* Tap the title area to play */}
          <Pressable
            onPress={() => onPlay?.(m)}
            style={({ pressed }) => [styles.playArea, pressed && styles.playAreaPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Play ${m.title}`}
          >
            {/* Tiny play triangle on the left */}
            <View style={styles.playIcon}>
              <Svg width={16} height={16} viewBox="0 0 16 16">
                <Polygon points="3,2 13,8 3,14" fill={theme.accent} fillOpacity={0.85} />
              </Svg>
            </View>
            <View style={styles.textBox}>
              <Text style={styles.itemTitle} numberOfLines={1}>
                {m.title}
              </Text>
              <Text style={styles.itemSub}>{m.lengthMinutes} min</Text>
            </View>
          </Pressable>

          {/* Filled heart on the right — tap to unfavorite */}
          <Pressable
            onPress={() => handleUnfavorite(m)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.heartButton}
            accessibilityRole="button"
            accessibilityLabel={`Remove ${m.title} from favorites`}
          >
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12 21s-7.5-4.5-10-9.5C.5 7 4 3 8 3c2 0 3 1 4 2 1-1 2-2 4-2 4 0 7.5 4 6 8.5-2.5 5-10 9.5-10 9.5z"
                fill={theme.accent}
                fillOpacity={0.85}
                stroke={theme.accent}
                strokeWidth={1.2}
                strokeLinejoin="round"
              />
            </Svg>
          </Pressable>
        </View>
      ))}

      <Text style={styles.footnote}>
        Tap a row to play. Tap the heart to remove.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 60,
  },
  heading: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
    color: theme.text,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  emptyState: {
    marginTop: 40,
    paddingHorizontal: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '400',
    color: theme.accent,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyBody: {
    fontSize: 15,
    color: theme.textDim,
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  playArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 18,
    paddingHorizontal: 8,
    borderRadius: theme.radius.sm,
  },
  playAreaPressed: {
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  playIcon: {
    width: 28,
    alignItems: 'center',
    marginRight: 8,
  },
  textBox: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 17,
    color: theme.text,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  itemSub: {
    fontSize: 13,
    color: theme.textDim,
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heartButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  footnote: {
    marginTop: 36,
    textAlign: 'center',
    fontSize: 12,
    color: theme.textFaint,
    letterSpacing: 1,
  },
});
