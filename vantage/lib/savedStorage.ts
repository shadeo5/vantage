// On-device persistence for saved (hearted) spots (#D1). Same best-effort pattern
// as gearStorage/journal: a storage failure falls back to the in-app default rather
// than crashing. Cloud sync is a later strengthening — local is the honest baseline
// so the heart keeps its promise across reloads.
import AsyncStorage from "@react-native-async-storage/async-storage";

const SAVED_IDS_KEY = "vantage.saved.spotIds.v1";

// Load the saved spot ids, or null if none stored / the data is unusable.
export async function loadSavedIds(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_IDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) return parsed;
    return null;
  } catch {
    return null;
  }
}

// Persist the saved spot ids (fire-and-forget; failures are swallowed).
export async function saveSavedIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(SAVED_IDS_KEY, JSON.stringify(ids));
  } catch {
    // best-effort; saves just won't persist this session
  }
}
