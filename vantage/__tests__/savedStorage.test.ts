import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadSavedIds, saveSavedIds } from "../lib/savedStorage";

// Use the package's in-memory jest mock so getItem/setItem behave realistically.
jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("saved-spot storage", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("returns null when nothing is stored", async () => {
    expect(await loadSavedIds()).toBeNull();
  });

  test("round-trips saved spot ids", async () => {
    await saveSavedIds(["piedmont", "krog"]);
    expect(await loadSavedIds()).toEqual(["piedmont", "krog"]);
  });

  test("persists an empty selection distinctly from unset", async () => {
    await saveSavedIds([]);
    expect(await loadSavedIds()).toEqual([]);
  });

  test("returns null for corrupt (non-array) data", async () => {
    await AsyncStorage.setItem("vantage.saved.spotIds.v1", JSON.stringify({ nope: true }));
    expect(await loadSavedIds()).toBeNull();
  });

  test("returns null for unparseable data", async () => {
    await AsyncStorage.setItem("vantage.saved.spotIds.v1", "not json{");
    expect(await loadSavedIds()).toBeNull();
  });
});
