import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadLenses, saveLenses, loadCameraId, saveCameraId } from "../lib/gearStorage";
import type { LensSpec } from "../lib/gear";

// Use the package's in-memory jest mock so getItem/setItem behave realistically.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

const l35: LensSpec = { minFocal: 35, maxFocal: 35, maxAperture: 1.8 };
const macro: LensSpec = { minFocal: 90, maxFocal: 90, maxAperture: 2.8, macro: true };

describe("gear storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("returns null when nothing is stored", async () => {
    expect(await loadLenses()).toBeNull();
  });

  test("round-trips saved lens descriptors", async () => {
    await saveLenses([l35, macro]);
    expect(await loadLenses()).toEqual([l35, macro]);
  });

  test("persists an empty selection distinctly from unset", async () => {
    await saveLenses([]);
    expect(await loadLenses()).toEqual([]);
  });

  test("returns null for corrupt (non-array) data", async () => {
    await AsyncStorage.setItem("vantage.gear.lenses.v2", JSON.stringify({ nope: true }));
    expect(await loadLenses()).toBeNull();
  });

  test("migrates legacy v1 lens ids → generic descriptors", async () => {
    await AsyncStorage.setItem("vantage.gear.lensIds.v1", JSON.stringify(["sony-fe35-18", "sony-fe90-macro"]));
    expect(await loadLenses()).toEqual([l35, macro]);
  });

  test("camera id round-trips, null when unset", async () => {
    expect(await loadCameraId()).toBeNull();
    await saveCameraId("sony-a7-iv");
    expect(await loadCameraId()).toBe("sony-a7-iv");
  });
});
