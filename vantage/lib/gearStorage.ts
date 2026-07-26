// On-device persistence for the gear profile (G1). Kept separate from gearProfile.ts
// so the pure matching logic stays dependency-free. Best-effort: any storage failure
// falls back to the in-app default rather than crashing onboarding.
//
// Lenses are stored as GENERIC descriptors (LensSpec) as of v2. A one-time migration
// maps the old v1 lens *ids* (the 6 catalog chips) → descriptors so a returning user
// keeps their selection.
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LensSpec } from "./gear";

const LENSES_KEY = "vantage.gear.lenses.v2";
const LEGACY_LENS_IDS_KEY = "vantage.gear.lensIds.v1";
const CAMERA_ID_KEY = "vantage.gear.cameraId.v1";

// Old chip ids → the generic descriptor they represented.
const LEGACY_LENS_MAP: Record<string, LensSpec> = {
  "fuji-xf23-2": { minFocal: 23, maxFocal: 23, maxAperture: 2.0 },
  "sony-fe35-18": { minFocal: 35, maxFocal: 35, maxAperture: 1.8 },
  "sony-fe50-18": { minFocal: 50, maxFocal: 50, maxAperture: 1.8 },
  "sony-fe85-18": { minFocal: 85, maxFocal: 85, maxAperture: 1.8 },
  "sony-fe-70-200-28gm2": { minFocal: 70, maxFocal: 200, maxAperture: 2.8 },
  "sony-fe90-macro": { minFocal: 90, maxFocal: 90, maxAperture: 2.8, macro: true },
};

const isSpec = (x: unknown): x is LensSpec =>
  !!x && typeof x === "object" &&
  typeof (x as LensSpec).minFocal === "number" &&
  typeof (x as LensSpec).maxFocal === "number" &&
  typeof (x as LensSpec).maxAperture === "number";

// Load the saved lens descriptors, or null if none stored / unusable. Falls back to
// migrating the legacy v1 lens ids the first time.
export async function loadLenses(): Promise<LensSpec[] | null> {
  try {
    const raw = await AsyncStorage.getItem(LENSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.every(isSpec)) return parsed;
    }
    // Migrate legacy ids → descriptors (once).
    const legacy = await AsyncStorage.getItem(LEGACY_LENS_IDS_KEY);
    if (legacy) {
      const ids = JSON.parse(legacy);
      if (Array.isArray(ids)) {
        const migrated = ids.map((id) => LEGACY_LENS_MAP[id]).filter(isSpec);
        await saveLenses(migrated);
        return migrated;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Persist the lens descriptors (fire-and-forget; failures are swallowed).
export async function saveLenses(lenses: LensSpec[]): Promise<void> {
  try {
    await AsyncStorage.setItem(LENSES_KEY, JSON.stringify(lenses));
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
