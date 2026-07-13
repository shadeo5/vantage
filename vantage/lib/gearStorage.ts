// On-device persistence for the gear profile (G1). Kept separate from gearProfile.ts
// so the pure matching logic stays dependency-free. Best-effort: any storage failure
// falls back to the in-app default rather than crashing the onboarding flow.
import AsyncStorage from "@react-native-async-storage/async-storage";

const LENS_IDS_KEY = "vantage.gear.lensIds.v1";
const CAMERA_ID_KEY = "vantage.gear.cameraId.v1";

// Load the saved lens ids, or null if none stored / the data is unusable.
export async function loadLensIds(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(LENS_IDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) return parsed;
    return null;
  } catch {
    return null;
  }
}

// Persist the selected lens ids (fire-and-forget; failures are swallowed).
export async function saveLensIds(ids: string[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LENS_IDS_KEY, JSON.stringify(ids));
  } catch {
    // best-effort; the profile just won't persist this session
  }
}

// Load the saved camera id, or null if none stored.
export async function loadCameraId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(CAMERA_ID_KEY);
    return typeof raw === "string" && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

// Persist the selected camera id (fire-and-forget).
export async function saveCameraId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CAMERA_ID_KEY, id);
  } catch {
    // best-effort
  }
}
