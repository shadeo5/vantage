import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadPending, savePending, loadJournal, saveJournal, shotCount, JournalEntry } from "../lib/journal";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("journal", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test("pending commitments round-trip; empty by default", async () => {
    expect(await loadPending()).toEqual([]);
    await savePending([{ spotId: "krog", at: "2026-07-13T19:00:00.000Z" }]);
    expect(await loadPending()).toEqual([{ spotId: "krog", at: "2026-07-13T19:00:00.000Z" }]);
  });

  test("journal entries round-trip", async () => {
    const log: JournalEntry[] = [{ spotId: "sweetauburn", at: "2026-07-12T20:00:00.000Z", went: true }];
    await saveJournal(log);
    expect(await loadJournal()).toEqual(log);
  });

  test("shotCount counts only the times you actually went", () => {
    const log: JournalEntry[] = [
      { spotId: "a", at: "x", went: true },
      { spotId: "b", at: "y", went: false },
      { spotId: "c", at: "z", went: true },
    ];
    expect(shotCount(log)).toBe(2);
    expect(shotCount([])).toBe(0);
  });
});
