import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { theme } from '../../config/theme';
import {
  getSupportProduct,
  contributeToRunningCosts,
  isContributionSupported,
  EXPO_GO_UNSUPPORTED,
  SupportProduct,
} from '../../services/tipJar';

// ─── SupportScreen ───────────────────────────────────────────────────
//
// Single-tier StoreKit IAP for users who'd like to help cover Glimmer's
// audio hosting and server costs. Strictly framed as operating costs,
// NOT personal support — the wording and tone deliberately avoid the
// "buy me a coffee" / Patreon vibe.
//
// Apple compliance (§3.2.1): for-profit devs MUST use IAP for any
// real-money contribution. External payment links (buymeacoffee, Stripe,
// Venmo, etc.) get the app rejected. This screen replaces an earlier
// version that linked to buymeacoffee.com — that approach was wrong.

export function SupportScreen() {
  // Three meaningful states for the contribution row:
  //   product === null + no error → loading
  //   productError set            → either Expo Go or App Store reach failure
  //   product !== null            → ready, show button + price
  // Plus transient `purchasing` and `thanked` states.
  const [product, setProduct] = useState<SupportProduct | null>(null);
  const [productError, setProductError] = useState<string | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [thanked, setThanked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isContributionSupported()) {
      setProductError(EXPO_GO_UNSUPPORTED);
      return;
    }
    (async () => {
      try {
        const p = await getSupportProduct();
        if (!cancelled) setProduct(p);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        if (!cancelled) setProductError(msg);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleContribute = async () => {
    if (!product || purchasing) return;
    setPurchasing(true);
    try {
      const ok = await contributeToRunningCosts();
      if (ok) {
        setThanked(true);
        setTimeout(() => setThanked(false), 6000);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      Alert.alert('Could not complete', msg);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Support</Text>

      <View style={styles.body}>
        <Text style={styles.paragraph}>
          Glimmer is free. No ads, no accounts, no subscription, and nothing
          about your practice ever leaves your device.
        </Text>
        <Text style={styles.paragraph}>
          The audio files do live on a server, though, and that costs a small
          amount each month to keep running. If the app's been useful and
          you'd like to help cover those costs, a one-time contribution helps
          keep the lights on.
        </Text>
        <Text style={styles.paragraphFaint}>
          Strictly optional. The app stays free and fully functional either way.
        </Text>
      </View>

      {/* Single contribution button. Renders one of: thank-you, ready, error, loading. */}
      {thanked ? (
        <View style={styles.buttonShell}>
          <Text style={styles.thankYou}>Thank you.</Text>
        </View>
      ) : product ? (
        <Pressable
          onPress={handleContribute}
          disabled={purchasing}
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            purchasing && styles.buttonDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Contribute ${product.price}`}
        >
          <Text style={styles.buttonLabel}>Help keep Glimmer running</Text>
          <Text style={styles.buttonPrice}>
            {purchasing ? 'Loading…' : product.price}
          </Text>
        </Pressable>
      ) : productError === EXPO_GO_UNSUPPORTED ? (
        <View style={styles.buttonShell}>
          <Text style={styles.statusText}>
            Available in production builds only.
          </Text>
        </View>
      ) : productError ? (
        <View style={styles.buttonShell}>
          <Text style={styles.statusText}>
            Couldn't reach the App Store. Try again in a moment.
          </Text>
        </View>
      ) : (
        <View style={styles.buttonShell}>
          <ActivityIndicator size="small" color={theme.textFaint} />
        </View>
      )}
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
    marginBottom: 32,
  },
  body: {
    marginBottom: 36,
  },
  paragraph: {
    fontSize: 15,
    color: theme.textDim,
    lineHeight: 24,
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  // De-emphasised follow-on caveat — visually backs off the request.
  paragraphFaint: {
    fontSize: 13,
    color: theme.textFaint,
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  // The actual contribution button: pill-shaped, accent-tinted, with the
  // localized price aligned to the right of the action label.
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.accentSoft,
    borderWidth: 1,
    borderColor: theme.accent,
    minWidth: 240,
  },
  buttonPressed: {
    backgroundColor: theme.surfaceHi,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonLabel: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.8,
    marginRight: 12,
  },
  buttonPrice: {
    color: theme.accent,
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.5,
    fontVariant: ['tabular-nums'],
    opacity: 0.85,
  },
  // Identical positioning to the button so the layout doesn't jump
  // between loading / ready / thanked states.
  buttonShell: {
    alignSelf: 'center',
    minWidth: 240,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  thankYou: {
    color: theme.accent,
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 1,
  },
  statusText: {
    color: theme.textFaint,
    fontSize: 13,
    letterSpacing: 0.3,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
