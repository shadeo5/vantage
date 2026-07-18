// On-device log of which spot Today HEADLINED (the hero) each day, so the picker can
// avoid showing you the same spot day after day — the anti-repeat rule (ADR
// HERO_ANTI_REPEAT). The existing variety layer only steps a spot aside once you've
// actually SHOT it (the journal); but a spot you keep being *shown* and never shoot
// (e.g. an always-on flat-light street spot that structurally outranks time-specific
// windows) never yields. This log is the missing half. Same best-effort AsyncStorage
// pattern as journal/savedStorage: a failure falls back to "no history", never crashes.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ShownEntry } from "./nudge";

const KEY = "vantage.hero.shown.v1";
const MAX_AGE_DAYS = 30; // bound growth — the picker only ever looks back a couple days

export async function loadShown(): Promise<ShownEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveShown(log: ShownEntry[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(log));
  } catch {
    // best-effort; the anti-repeat just won't persist across a reload this session
  }
}

function sameLocalDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Record that `spotId` was the hero at `now`. Idempotent per calendar day (re-renders
// don't grow the log or churn React state) and pruned to MAX_AGE_DAYS. Returns the SAME
// array reference when nothing changed, so a functional setState bails out of a re-render.
export function recordShown(log: ShownEntry[], spotId: string, now: Date): ShownEntry[] {
  if (log.some((e) => e.spotId === spotId && sameLocalDay(new Date(e.at), now))) return log;
  const cutoff = now.getTime() - MAX_AGE_DAYS * 86_400_000;
  const pruned = log.filter((e) => new Date(e.at).getTime() >= cutoff);
  return [...pruned, { spotId, at: now.toISOString() }];
}
