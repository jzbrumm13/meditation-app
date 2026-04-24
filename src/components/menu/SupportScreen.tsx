import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, Alert } from 'react-native';
import { theme } from '../../config/theme';

// ─── SupportScreen ───────────────────────────────────────────────────
//
// The donation entry point. For v1 this sends the user to an external
// Buy-Me-a-Coffee page. When the app ships, this screen is the natural
// place to integrate StoreKit / Google Play Billing in-app purchases
// for one-time tips instead of an external link (App Store reviewers
// prefer this approach for tipping/donation flows).

// TODO: replace with Jason's actual Buy-Me-a-Coffee (or similar) URL
// once he's set one up.
const DONATION_URL = 'https://buymeacoffee.com/';

export function SupportScreen() {
  const onDonate = async () => {
    try {
      const supported = await Linking.canOpenURL(DONATION_URL);
      if (supported) {
        await Linking.openURL(DONATION_URL);
      } else {
        Alert.alert('Could not open link');
      }
    } catch {
      Alert.alert('Could not open link');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Support</Text>

      <View style={styles.body}>
        <Text style={styles.paragraph}>
          This app is free, has no ads, and will never sell your data.
        </Text>
        <Text style={styles.paragraph}>
          If the practice has been meaningful to you, a small contribution helps keep
          it going — covering voice rendering, storage, and development time.
        </Text>
        <Text style={styles.paragraph}>
          Any amount is appreciated. Nothing is expected.
        </Text>
      </View>

      <Pressable
        onPress={onDonate}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>Leave a tip</Text>
      </Pressable>

      <Text style={styles.footnote}>Opens in your browser</Text>
    </View>
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
    marginBottom: 40,
  },
  body: {
    marginBottom: 48,
  },
  paragraph: {
    fontSize: 15,
    color: theme.textDim,
    lineHeight: 24,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  button: {
    alignSelf: 'center',
    paddingHorizontal: 44,
    paddingVertical: 16,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  buttonPressed: {
    backgroundColor: theme.surfaceHi,
  },
  buttonText: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 1.5,
  },
  footnote: {
    marginTop: 16,
    textAlign: 'center',
    fontSize: 12,
    color: theme.textFaint,
    letterSpacing: 0.5,
  },
});
