import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadLensIds, saveLensIds } from "../lib/gearStorage";

// Use the package's in-memory jest mock so getItem/setItem behave realistically.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("gear storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("returns null when nothing is stored", async () => {
    expect(await loadLensIds()).toBeNull();
  });

  test("round-trips saved lens ids", async () => {
    await saveLensIds(["sony-fe35-18", "sony-fe90-macro"]);
    expect(await loadLensIds()).toEqual(["sony-fe35-18", "sony-fe90-macro"]);
  });

  test("persists an empty selection distinctly from unset", async () => {
    await saveLensIds([]);
    expect(await loadLensIds()).toEqual([]);
  });

  test("returns null for corrupt (non-array) data", async () => {
    await AsyncStorage.setItem("vantage.gear.lensIds.v1", JSON.stringify({ nope: true }));
    expect(await loadLensIds()).toBeNull();
  });

  test("returns null for unparseable data", async () => {
    await AsyncStorage.setItem("vantage.gear.lensIds.v1", "not json{");
    expect(await loadLensIds()).toBeNull();
  });
});
