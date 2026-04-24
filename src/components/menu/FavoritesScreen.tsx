import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { listFavorites } from '../../services/favorites';
import { theme } from '../../config/theme';

// ─── FavoritesScreen ─────────────────────────────────────────────────
//
// Shows meditations the user has hearted. Currently there's no UI for
// hearting a meditation (that belongs in the now-playing view we haven't
// built yet), so for v1 this will almost always show the empty state.
//
// When hearting is wired in, this screen will list the favorited tracks
// and let the user tap one to replay it from this screen.

export function FavoritesScreen() {
  const [favIds, setFavIds] = useState<string[] | null>(null);

  useEffect(() => {
    listFavorites().then(setFavIds).catch(() => setFavIds([]));
  }, []);

  if (favIds === null) {
    return <View style={styles.container} />;
  }

  if (favIds.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.heading}>Favorites</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No favorites yet</Text>
          <Text style={styles.emptyBody}>
            After a meditation plays, tap the heart on the now-playing view to save
            it here. You'll be able to replay your favorites any time.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Favorites</Text>
      {favIds.map((id) => (
        <Pressable key={id} style={styles.item}>
          <Text style={styles.itemTitle}>{id}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 2,
    color: theme.text,
    marginBottom: 32,
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
  item: {
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  itemTitle: {
    fontSize: 17,
    color: theme.text,
    fontWeight: '400',
  },
});
