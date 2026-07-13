// Shooting journal + return-loop check-in (N4).
//
// Tapping "I'm going" records a Commitment. When you come back in a LATER session,
// the app asks "did you get out?" — that answer is BOTH the engagement metric (did
// the nudge actually move you) and an entry in your shooting log. All on-device.
import AsyncStorage from "@react-native-async-storage/async-storage";

export type Commitment = { spotId: string; at: string };                 // a pending shoot you committed to
export type JournalEntry = { spotId: string; at: string; went: boolean }; // a resolved check-in

const PENDING_KEY = "vantage.journal.pending.v1";
const LOG_KEY = "vantage.journal.log.v1";

async function loadArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
async function saveArray<T>(key: string, value: T[]): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort
  }
}

export const loadPending = () => loadArray<Commitment>(PENDING_KEY);
export const savePending = (p: Commitment[]) => saveArray(PENDING_KEY, p);
export const loadJournal = () => loadArray<JournalEntry>(LOG_KEY);
export const saveJournal = (j: JournalEntry[]) => saveArray(LOG_KEY, j);

// How many times you actually got out (the return metric).
export const shotCount = (journal: JournalEntry[]): number => journal.filter((e) => e.went).length;
