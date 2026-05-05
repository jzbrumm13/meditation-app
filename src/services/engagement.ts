import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as StoreReview from 'expo-store-review';

// ─── Engagement Prompts ──────────────────────────────────────────────
//
// Two well-timed prompts wired into the post-meditation flow:
//
//   After 1st completed meditation → ask permission for daily reminder
//                                    notifications (with a soft pre-prompt
//                                    so we don't burn iOS's one-shot
//                                    native dialog if the user isn't
//                                    interested).
//
//   After 2nd completed meditation → ask for an App Store rating via
//                                    Apple's SKStoreReviewController.
//                                    Apple limits this to 3/year per user
//                                    automatically — no need to track
//                                    locally, but we still gate to avoid
//                                    re-prompting from later sessions.
//
// Both prompts are deliberately rate-limited via AsyncStorage flags so
// we never re-ask if the user has already been prompted, even if their
// session count somehow rolls back (e.g. they reset stats).

const NOTIF_PROMPT_KEY = '@glimmer.notif_prompt_shown_v1';
const REVIEW_PROMPT_KEY = '@glimmer.review_prompt_shown_v1';

/**
 * Called from HomeScreen.onBurnComplete AFTER recordSession resolves.
 * Receives the new totalSessions count. Decides whether to fire either
 * of the engagement prompts based on the count.
 */
export async function handlePostSessionEngagement(totalSessions: number) {
  if (totalSessions === 1) {
    await maybeRequestNotifications();
  } else if (totalSessions === 2) {
    await maybeRequestReview();
  }
}

/**
 * Soft pre-prompt → iOS native permission dialog → done.
 *
 * Why the pre-prompt: iOS only lets you ask for notification permission
 * ONCE. If the user denies, the only way to re-enable is via Settings.
 * A friendly explanation first means people who'd otherwise reflexively
 * tap "Don't Allow" actually consider whether they want it.
 */
async function maybeRequestNotifications() {
  // Bail if we've already prompted (avoids re-asking even if stats roll back)
  const seen = await AsyncStorage.getItem(NOTIF_PROMPT_KEY);
  if (seen) return;
  await AsyncStorage.setItem(NOTIF_PROMPT_KEY, '1');

  // If permission is already granted (rare but possible if user enabled
  // it from Settings before completing a session), skip the pre-prompt.
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return;

  // Brief delay so the alert doesn't compete with the burn-complete bell
  // and the heart fade animation. Lets the user finish exhaling.
  await new Promise((r) => setTimeout(r, 1800));

  Alert.alert(
    'Daily reminder?',
    "If you'd like, Glimmer can send a quiet daily nudge to come sit. " +
      "Helps build a practice. Always optional — you can turn it off any time.",
    [
      { text: 'Not now', style: 'cancel' },
      {
        text: 'Sure',
        onPress: async () => {
          try {
            await Notifications.requestPermissionsAsync({
              ios: {
                allowAlert: true,
                allowBadge: false,
                allowSound: true,
              },
            });
            // We don't actually schedule a daily reminder yet — that's a
            // v1.1 feature. For now we just record permission so v1.1
            // can opt them in automatically without re-asking.
          } catch (e) {
            console.warn('Notification permission request failed:', e);
          }
        },
      },
    ],
  );
}

/**
 * Apple's SKStoreReviewController via expo-store-review. Apple decides
 * whether to actually show the prompt (rate-limited to 3/year/user
 * automatically — there's no way to force it). No-op on platforms
 * where the API isn't available.
 */
async function maybeRequestReview() {
  const seen = await AsyncStorage.getItem(REVIEW_PROMPT_KEY);
  if (seen) return;
  await AsyncStorage.setItem(REVIEW_PROMPT_KEY, '1');

  // Same delay logic — let the user breathe before we interrupt.
  await new Promise((r) => setTimeout(r, 1800));

  try {
    const available = await StoreReview.isAvailableAsync();
    if (!available) return;
    if (Platform.OS === 'ios' && (await StoreReview.hasAction())) {
      await StoreReview.requestReview();
    }
  } catch (e) {
    console.warn('Review request failed:', e);
  }
}
