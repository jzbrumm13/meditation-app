import { Audio, AVPlaybackStatus } from 'expo-av';
import { Meditation } from './meditations';
import { getCachedUri } from './offlineCache';

// ─── Audio Player ────────────────────────────────────────────────────
//
// Thin wrapper around expo-av's Sound API. Owns a single `Sound` instance
// at a time — we play one meditation per session. Background-audio is
// already enabled in app.json via UIBackgroundModes=["audio"].

let current: Audio.Sound | null = null;
let activeMeditationId: string | null = null;

export interface PlayerStatus {
  playing: boolean;
  positionMs: number;
  durationMs: number;
  didJustFinish: boolean;
}

type Listener = (status: PlayerStatus) => void;
const listeners = new Set<Listener>();

function emit(status: AVPlaybackStatus) {
  if (!status.isLoaded) return;
  const s: PlayerStatus = {
    playing: status.isPlaying,
    positionMs: status.positionMillis,
    durationMs: status.durationMillis ?? 0,
    didJustFinish: status.didJustFinish ?? false,
  };
  listeners.forEach(l => l(s));
}

export async function configureAudioSession() {
  // Configure once at app startup. Values chosen so meditation audio:
  //  - continues playing when phone locks or user leaves the app
  //  - ducks background music (Spotify etc) rather than stopping it
  //  - plays through speaker even if phone is on silent
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    staysActiveInBackground: true,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    interruptionModeIOS: 1, // DoNotMix
    interruptionModeAndroid: 1, // DoNotMix
  });
}

export async function play(meditation: Meditation) {
  // If already playing the same meditation, just resume.
  if (current && activeMeditationId === meditation.id) {
    await current.playAsync();
    return;
  }

  // Otherwise unload any previous sound and load the new one.
  await stop();

  // Prefer a cached local copy if available (works offline + zero latency).
  const localUri = await getCachedUri(meditation.id);
  const sourceUri = localUri ?? meditation.audioUrl;

  if (!sourceUri) {
    console.warn(`No audio source for meditation ${meditation.id} — skipping load`);
    return;
  }

  const { sound } = await Audio.Sound.createAsync(
    { uri: sourceUri },
    { shouldPlay: true, progressUpdateIntervalMillis: 500 },
    emit,
  );
  current = sound;
  activeMeditationId = meditation.id;
}

export async function pause() {
  if (!current) return;
  await current.pauseAsync();
}

export async function resume() {
  if (!current) return;
  await current.playAsync();
}

export async function stop() {
  if (!current) return;
  try {
    await current.stopAsync();
    await current.unloadAsync();
  } catch {
    // ignore — sound may already be unloaded
  }
  current = null;
  activeMeditationId = null;
}

export function addStatusListener(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function isPlaying(): boolean {
  return activeMeditationId !== null;
}
