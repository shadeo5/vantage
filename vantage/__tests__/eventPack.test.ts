// eventPack — the DB→Opportunity mapper and the bundled-fallback behavior.
// The Supabase client is mocked so these never hit the network; `mockResult` is what
// the query resolves to (the jest.mock factory may only reference vars prefixed "mock").
import * as fs from "fs";
import * as path from "path";
import { fetchEvents, rowToOpportunity, EVENT_COLUMNS } from "../lib/eventPack";
import { ATLANTA_EVENTS } from "../lib/events";

let mockResult: { data: unknown; error: unknown } = { data: null, error: null };
jest.mock("../lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({ eq: () => Promise.resolve(mockResult) }),
      }),
    }),
  },
}));

const fullRow = {
  id: "dragon-con-parade",
  name: "Dragon Con Parade",
  event_type: "Costume parade / spectacle",
  genres: ["Street", "Portraits"],
  neighborhood: "Peachtree St",
  lat: 33.762,
  lon: -84.386,
  venue_spot_id: null,
  recurrence: "Labor Day weekend",
  window_start: "2026-09-05T10:00",
  window_end: "2026-09-05T13:00",
  window_confidence: "high",
  admission: "free",
  ticketing: "not ticketed",
  magnitude: "high",
  window_type: "flat",
  tagline: "Fifty thousand costumes",
  reason: "One of the best parades",
  why: "the density of costumes",
  look: ["a", "b", "c"],
  kit_angles: { wide: "in the march", tele: "pick a face" },
  getting: "arrive early",
  source: "dragoncon.org",
};

describe("rowToOpportunity", () => {
  test("maps a full DB row onto the Opportunity shape (snake_case → camelCase, nested window)", () => {
    const o = rowToOpportunity(fullRow);
    expect(o.kind).toBe("event");
    expect(o.eventType).toBe("Costume parade / spectacle");
    expect(o.venueSpotId).toBeNull();
    expect(o.window).toEqual({ start: "2026-09-05T10:00", end: "2026-09-05T13:00" });
    expect(o.windowType).toBe("flat");
    expect(o.magnitude).toBe("high");
    expect(o.kitAngles).toEqual({ wide: "in the march", tele: "pick a face" });
    expect(o.genres).toEqual(["Street", "Portraits"]);
    expect(o.look).toEqual(["a", "b", "c"]);
  });

  test("coalesces nulls/missing to safe defaults so the strict Opportunity type holds", () => {
    const sparse = { id: "x", name: "X" } as Parameters<typeof rowToOpportunity>[0];
    const o = rowToOpportunity(sparse);
    expect(o.eventType).toBe("");
    expect(o.genres).toEqual([]);
    expect(o.venueSpotId).toBeNull();
    expect(o.window).toEqual({ start: "", end: "" });
    expect(o.windowConfidence).toBe("high");
    expect(o.magnitude).toBe("medium"); // unknown → medium (never crashes the scorer)
    expect(o.windowType).toBe("flat");
    expect(o.kitAngles).toEqual({});
    expect(o.look).toEqual([]);
  });

  test("passes through a venue-backed, needs-verify, low-magnitude row", () => {
    const o = rowToOpportunity({ ...fullRow, venue_spot_id: "piedmont", window_confidence: "needs-date-verify", magnitude: "low" });
    expect(o.venueSpotId).toBe("piedmont");
    expect(o.windowConfidence).toBe("needs-date-verify");
    expect(o.magnitude).toBe("low");
  });
});

describe("schema drift guard", () => {
  // Catches the class of bug where eventPack SELECTs a column the events table doesn't have
  // (e.g. a missing lat/lon) — which fails the query and silently drops us to the bundle.
  test("every column eventPack SELECTs exists in the events table (schema.sql)", () => {
    const schema = fs.readFileSync(path.join(__dirname, "..", "supabase", "schema.sql"), "utf8");
    const block = schema.match(/create table if not exists public\.events \(([\s\S]*?)\n\);/);
    if (!block) throw new Error("could not find the events table in schema.sql");
    const tableCols = new Set(
      block[1]
        .split("\n")
        .map((l) => l.trim().match(/^([a-z_]+)\s/)?.[1])
        .filter((c): c is string => Boolean(c)),
    );
    const missing = EVENT_COLUMNS.split(",").map((c) => c.trim()).filter((c) => !tableCols.has(c));
    expect(missing).toEqual([]);
  });
});

describe("fetchEvents", () => {
  test("returns mapped events when the DB has published rows", async () => {
    mockResult = { data: [fullRow], error: null };
    const events = await fetchEvents("atlanta");
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("dragon-con-parade");
    expect(events[0].kind).toBe("event");
  });

  test("falls back to the bundled Atlanta catalog on a DB error", async () => {
    mockResult = { data: null, error: { message: "boom" } };
    const events = await fetchEvents("atlanta");
    expect(events).toBe(ATLANTA_EVENTS);
  });

  test("returns [] for a non-bundled city with no rows (never the wrong city's events)", async () => {
    mockResult = { data: [], error: null };
    const events = await fetchEvents("nashville");
    expect(events).toEqual([]);
  });
});
