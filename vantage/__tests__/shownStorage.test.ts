import AsyncStorage from "@react-native-async-storage/async-storage";
import { loadShown, saveShown, recordShown } from "../lib/shownStorage";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock")
);

describe("recordShown (hero-shown log)", () => {
  test("appends a new hero for the day", () => {
    const log = recordShown([], "mural", new Date(2026, 3, 10, 13, 0, 0));
    expect(log).toEqual([{ spotId: "mural", at: new Date(2026, 3, 10, 13, 0, 0).toISOString() }]);
  });

  test("is idempotent per calendar day — same spot, same day returns the SAME reference", () => {
    const log = recordShown([], "mural", new Date(2026, 3, 10, 9, 0, 0));
    const again = recordShown(log, "mural", new Date(2026, 3, 10, 21, 0, 0)); // later same day
    expect(again).toBe(log); // no growth, no state churn
  });

  test("records a different spot on the same day, and the same spot on a new day", () => {
    let log = recordShown([], "mural", new Date(2026, 3, 10, 9, 0, 0));
    log = recordShown(log, "other", new Date(2026, 3, 10, 12, 0, 0)); // gear changed → new hero same day
    log = recordShown(log, "mural", new Date(2026, 3, 11, 9, 0, 0));   // next day
    expect(log.map((e) => e.spotId)).toEqual(["mural", "other", "mural"]);
  });

  test("prunes entries older than 30 days", () => {
    const old = [{ spotId: "ancient", at: new Date(2026, 1, 1, 12, 0, 0).toISOString() }];
    const log = recordShown(old, "fresh", new Date(2026, 3, 10, 12, 0, 0)); // ~68 days later
    expect(log.map((e) => e.spotId)).toEqual(["fresh"]);
  });
});

describe("shown-log storage round-trip", () => {
  beforeEach(async () => { await AsyncStorage.clear(); });

  test("returns an empty array when nothing is stored", async () => {
    expect(await loadShown()).toEqual([]);
  });

  test("round-trips the log", async () => {
    const log = [{ spotId: "mural", at: new Date(2026, 3, 10, 13, 0, 0).toISOString() }];
    await saveShown(log);
    expect(await loadShown()).toEqual(log);
  });

  test("returns an empty array for corrupt data", async () => {
    await AsyncStorage.setItem("vantage.hero.shown.v1", "not json{");
    expect(await loadShown()).toEqual([]);
  });
});
