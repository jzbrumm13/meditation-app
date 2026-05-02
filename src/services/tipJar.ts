// ─── Running-Costs Contribution (StoreKit IAP) ───────────────────────
//
// Single consumable IAP product used to let users optionally contribute
// toward the app's actual operating costs — Supabase audio hosting,
// ElevenLabs renders for new meditations, etc. This is NOT a tip jar
// in the "buy the dev a coffee" sense. The framing in AboutScreen.tsx
// is strictly: "the app costs money to run; help cover that if you'd
// like." Always optional. The app remains 100% free either way.
//
// Behaviour:
//   • In a production / dev-client build, calls real StoreKit via
//     react-native-iap.
//   • In Expo Go (no native modules), falls back to a stub that throws
//     EXPO_GO_UNSUPPORTED so the UI can show a sensible message.
//
// Apple rules recap (App Review §3.2.1):
//   • Real-money contributions from a for-profit dev MUST go through
//     StoreKit IAP. External payment links → app rejected.
//   • Calling it a "donation" requires nonprofit (501(c)(3)) status.
//     Wording must be functional ("support running costs", "help keep
//     the app running") rather than charitable.

import { Platform } from 'react-native';

// The single product ID. Must EXACTLY match the IAP record in App Store
// Connect (Features → In-App Purchases). If we ever add more tiers we'll
// turn this into an array.
export const SUPPORT_PRODUCT_ID = 'com.jbrumm.glimmer.support';

// Sentinel error so the UI can distinguish "not supported in this build"
// from "user canceled" or "payment failed".
export const EXPO_GO_UNSUPPORTED = 'EXPO_GO_UNSUPPORTED';

// react-native-iap is a native module; importing it inside Expo Go throws.
// We dynamically require it and feature-detect so the rest of the app
// doesn't crash when running in Expo Go for development.
type IAPModule = typeof import('react-native-iap');
let _iap: IAPModule | null = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _iap = require('react-native-iap');
} catch {
  _iap = null;
}

/** Fields the UI needs from a fetched product. */
export interface SupportProduct {
  productId: string;
  title: string;
  description: string;
  /** Localized, e.g. "$2.99" or "€2,99". */
  price: string;
}

let _initialized = false;
let _cached: SupportProduct | null = null;

/**
 * Lazily initialize the StoreKit connection and fetch the support product.
 * Cached after first success — repeated calls are no-ops.
 *
 * Throws EXPO_GO_UNSUPPORTED when the native module is unavailable.
 */
export async function getSupportProduct(): Promise<SupportProduct> {
  if (_cached) return _cached;
  if (!_iap) throw new Error(EXPO_GO_UNSUPPORTED);

  if (!_initialized) {
    await _iap.initConnection();
    _initialized = true;
  }

  // getProducts returns Product[] — for a single SKU we take the first.
  const products = await _iap.getProducts({ skus: [SUPPORT_PRODUCT_ID] });
  if (!products.length) {
    throw new Error(`Product not found: ${SUPPORT_PRODUCT_ID}`);
  }

  const p = products[0] as {
    productId: string;
    title?: string;
    description?: string;
    localizedPrice?: string;
    price?: string;
  };

  _cached = {
    productId: p.productId,
    title: p.title ?? 'Keep Glimmer running',
    description: p.description ?? 'Helps cover audio hosting and server costs.',
    price: p.localizedPrice ?? p.price ?? '',
  };
  return _cached;
}

/**
 * Trigger the native purchase sheet and resolve when the transaction
 * completes successfully. Resolves false if the user cancels; throws on
 * any other error.
 *
 * For consumable products we MUST call finishTransaction with
 * isConsumable=true, otherwise StoreKit will keep re-delivering the
 * transaction on every app launch.
 */
export async function contributeToRunningCosts(): Promise<boolean> {
  if (!_iap) throw new Error(EXPO_GO_UNSUPPORTED);
  if (!_initialized) {
    await _iap.initConnection();
    _initialized = true;
  }

  return new Promise<boolean>((resolve, reject) => {
    // Listen for transaction success — fires once StoreKit finishes the
    // purchase. We finish the transaction inline and resolve true.
    const purchaseSub = _iap!.purchaseUpdatedListener(async (purchase) => {
      try {
        if (purchase.productId === SUPPORT_PRODUCT_ID) {
          await _iap!.finishTransaction({ purchase, isConsumable: true });
          purchaseSub.remove();
          errorSub.remove();
          resolve(true);
        }
      } catch (e) {
        purchaseSub.remove();
        errorSub.remove();
        reject(e);
      }
    });

    // Listen for cancellation / failure. Apple's cancel error code is
    // 'E_USER_CANCELLED' — we treat it as a benign "no" rather than an error.
    const errorSub = _iap!.purchaseErrorListener((err) => {
      purchaseSub.remove();
      errorSub.remove();
      if (err.code === 'E_USER_CANCELLED') {
        resolve(false);
      } else {
        reject(new Error(err.message || 'Purchase failed'));
      }
    });

    // Kick off the native purchase sheet. iOS only for v1.
    _iap!
      .requestPurchase({
        sku: SUPPORT_PRODUCT_ID,
        andDangerouslyFinishTransactionAutomaticallyIOS: false,
      })
      .catch((e: Error) => {
        purchaseSub.remove();
        errorSub.remove();
        reject(e);
      });
  });
}

/** True when StoreKit IAP is available on this build. */
export function isContributionSupported(): boolean {
  return _iap !== null && Platform.OS === 'ios';
}
