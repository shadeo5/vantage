// On-device persistence for the chosen city. Same best-effort pattern as
// gearStorage/savedStorage: a storage failure falls back to the default city rather
// than crashing. Once the user picks a city it sticks across reloads; a
// location-based default (device GPS) is the later P2 strengthening — for now the
// default is simply the last city they chose, else Atlanta.
import AsyncStorage from "@react-native-async-storage/async-storage";

const CITY_ID_KEY = "vantage.city.id.v1";

// Load the chosen city id, or null if none stored / the data is unusable.
export async function loadCityId(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(CITY_ID_KEY);
    if (raw && typeof raw === "string") return raw;
    return null;
  } catch {
    return null;
  }
}

// Persist the chosen city id (fire-and-forget; failures are swallowed).
export async function saveCityId(id: string): Promise<void> {
  try {
    await AsyncStorage.setItem(CITY_ID_KEY, id);
  } catch {
    // best-effort; the choice just won't persist this session
  }
}
