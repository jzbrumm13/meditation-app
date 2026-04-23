# Meditation App

An ultra-minimalist iOS/Android meditation timer built around a single interaction: **drag a candle to set a session length, release to light it, then sit.** The candle burns down in real time over the session; when the flame goes out, the session is over.

No navigation, no library screens, no account. One canvas, one gesture, one session.

---

## The experience

1. App opens to a dimly-lit scene with a candle in a brass holder and a small moon button in the corner.
2. Drag up on the candle. It snaps to one of seven preset heights (5 / 10 / 15 / 20 / 30 / 45 / 60 minutes), with a soft amber number drifting beside it showing the current length.
3. Release. The flame ignites, and a random meditation matching the chosen length begins playing.
4. The candle burns down proportionally over the session. A single bell tone closes the session, and a small stub remains.
5. Tap the flame at any time to extinguish early — the audio stops, smoke curls up, and the moon returns.

The moon button in the corner opens a discreet menu (Favorites, Settings, Support).

---

## Tech stack

- **Expo SDK 54** (React Native 0.81) — shipped via Expo Go during development, EAS builds for production
- **TypeScript** throughout
- **react-native-webview** — the candle itself is a self-contained HTML canvas file loaded inside a WebView; this preserves the tuned visual as-is and lets the rest of the app be native RN
- **react-native-svg** — moon icon + sparkle glimmer
- **react-native-reanimated** + **react-native-gesture-handler** — animation primitives (currently installed but minimally used)
- **expo-av** — audio playback (scheduled to migrate to `expo-audio` in SDK 55)
- **expo-file-system** (legacy API) — offline meditation caching, not yet wired into the UI
- **@react-native-async-storage/async-storage** — streak, favorites, theme, offline cache index
- **@supabase/supabase-js** — meditation catalog + MP3 storage

---

## Project layout

```
meditation-app/
├── App.tsx                          # Entry — renders HomeScreen
├── app.json                         # Expo config: iOS bundleId, background audio, status bar
├── metro.config.js                  # Registers .html as an asset so candle_timer.html bundles untouched
├── candle_timer.html                # ← Reference copy of the candle (same as asset version)
├── assets/
│   └── html/
│       └── candle_timer.html        # ← Bundled copy loaded by the WebView
├── src/
│   ├── components/
│   │   ├── CandleView.tsx           # WebView host + JS bridge: reads candle globals, emits state + transition events
│   │   ├── MoonButton.tsx           # Top-right moon icon (SVG crescent, breath pulse, drifting sparkles)
│   │   └── MenuSheet.tsx            # Bottom sheet shown when moon is tapped
│   ├── config/
│   │   ├── tiers.ts                 # Seven meditation length tiers + candle-height → tier mapping
│   │   └── theme.ts                 # Color tokens and spacing scale (warm/dark to harmonize with candle)
│   ├── screens/
│   │   └── HomeScreen.tsx           # Single screen: candle, drag-number overlay, moon, menu
│   └── services/
│       ├── supabase.ts              # Supabase client singleton (anon key, public-safe)
│       ├── meditations.ts           # Fetch catalog, random-pick by tier; falls back to placeholders if unconfigured
│       ├── audioPlayer.ts           # expo-av wrapper with background-audio, pause/resume, cached-first playback
│       └── offlineCache.ts          # expo-file-system download + index for offline playback (not yet surfaced in UI)
└── supabase/
    └── schema.sql                   # Meditations table + storage bucket + RLS policies (run once in SQL editor)
```

---

## The candle file

`assets/html/candle_timer.html` is a single self-contained HTML file with no dependencies — a `<canvas>` + vanilla JS particle/flame/smoke simulation. It is the visual heart of the app and has been tuned deliberately. It exposes a handful of top-level `var` globals (`cH`, `aH`, `lit`, `burning`, `mode`, `bStart`, `bDur`, `extinguishing`, etc.) that `CandleView.tsx` reads via an injected polling script to stay in sync with the WebView.

Things to know if you touch the candle:

- **Don't refactor the flame/smoke/ember drawing logic.** It is tuned by hand and any "improvement" tends to regress the look. Positional constants and the `SNAP_HEIGHTS` array are safe to adjust.
- **`SNAP_HEIGHTS`** defines the seven preset lengths. If you add/remove one, also update `src/config/tiers.ts` and the `tier_id` CHECK constraint in Supabase.
- **The in-canvas timer** was removed (the app renders a brighter timer natively, though it's currently also turned off in favor of reading burn progress from the candle shrink alone).

---

## Supabase

Schema is in `supabase/schema.sql`. The `meditations` table holds catalog rows with:
- `tier_id` — one of `five`, `ten`, `fifteen`, `twenty`, `thirty`, `fortyFive`, `sixty`
- `audio_path` — relative path inside the `meditation-audio` bucket
- `published` — only `true` rows are fetched by the client
- `sort_order` — within-tier ordering (the client picks randomly from published rows in the tier)

Client reads are anonymous via RLS policy (`published = true` is publicly readable). Writes require service_role and are done via the Supabase dashboard, not the app.

To wire a fresh Supabase project: update `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `src/services/supabase.ts`.

---

## Current state

**Shipped:**
- Full candle interaction (drag-snap, haptic ticks, ignite, burn, extinguish-on-flame-tap)
- Moon button with glimmer
- Catalog pulling from Supabase with random-pick per tier
- Seven tiers populated with 1–4 meditations each (except the 5-min tier, which is intentionally empty so far)
- Voice: a single Attenborough-adjacent voice designed in ElevenLabs; all audio is TTS-rendered with specific dials then post-produced with silence gaps and a closing bell

**Not yet in UI but implemented underneath:**
- Offline pre-download (`offlineCache.ts`) — methods exist, no UI entry point
- Favorites (`favorites.ts`) — storage exists, no UI entry point
- Menu sheet items (Favorites, Settings, Support) are placeholders that dismiss on tap

**Design areas most open to enhancement:**
- Everything around the candle except the candle itself. Typography on the drag-number. Menu sheet layout and content. Menu sheet entry transitions. The moon button's relationship to its halo. The visual treatment of the "session complete" moment (currently silent except the bell — no UI change at session end).
- The 5-min tier's empty state. What should drag-snap to 5-min do if there's no catalog entry? Currently plays nothing.
- Onboarding. There is none. First-launch users get no explanation of the candle gesture.
- Icon + splash. Currently using the Expo template placeholders.

---

## Dev setup

```bash
npm install
npx expo start --tunnel
```

Scan the QR with Expo Go (iOS/Android). Tunnel mode works across any network; `--lan` is faster if phone and Mac are on the same WiFi.

To run on an iOS simulator you'll need full Xcode installed and run `npx expo run:ios`.

---

## Guiding principles (for anyone enhancing this)

1. **Nothing competes with the candle.** The candle is the app. Any other UI element must earn its visual weight and get out of the way the moment a session begins.
2. **Discretion over explanation.** No onboarding popups, no tooltips, no "tap to start" labels by default. The interface should feel like it has always been here. Minor hints are allowed but should fade.
3. **The world of the scene is warm and dim.** Moonlight blue in the outer UI, flame amber for activity, soft muted text. No pure whites, no sharp edges, no standard Material/iOS chrome.
4. **The tuned candle visual is sacred.** Add around it, don't refactor inside it. Functional changes (e.g., the `SNAP_HEIGHTS` array) are fine.
5. **Every session ends in silence.** The user is descending into something; the app should not bounce them back into "you did it!" UI. A closing bell + stub + moon returning is plenty.
