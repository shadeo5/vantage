import {
  ATLANTA_EVENTS,
  eventWindow,
  daysUntil,
  isLive,
  liveEvents,
  upcomingEvents,
  whenLabel,
  eventToSpot,
  type Opportunity,
} from "../lib/events";
import { FALLBACK_SPOTS } from "../lib/spots";

const byId = (id: string): Opportunity => {
  const e = ATLANTA_EVENTS.find((x) => x.id === id);
  if (!e) throw new Error(`no event ${id}`);
  return e;
};

describe("events catalog", () => {
  it("loads the bundled catalog, all shaped as events", () => {
    expect(ATLANTA_EVENTS.length).toBeGreaterThanOrEqual(12);
    for (const e of ATLANTA_EVENTS) {
      expect(e.kind).toBe("event");
      expect(e.genres.length).toBeGreaterThan(0);
    }
  });
});

describe("eventWindow — mixed date/datetime parsing", () => {
  it("parses a datetime window in local time", () => {
    const { start, end } = eventWindow(byId("dragon-con-parade")); // 2026-09-05T10:00–13:00
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(8); // September
    expect(start.getDate()).toBe(5);
    expect(start.getHours()).toBe(10);
    expect(end.getHours()).toBe(13);
  });

  it("parses a date-only END as the end of that day (event runs through it)", () => {
    const { end } = eventWindow(byId("atlanta-pride-festival-parade")); // ...–2026-10-11 (date only)
    expect(end.getMonth()).toBe(9); // October
    expect(end.getDate()).toBe(11);
    expect(end.getHours()).toBe(23); // end-of-day, not midnight
  });
});

describe("isLive / liveEvents — the takeover gate", () => {
  const dragon = byId("dragon-con-parade"); // 2026-09-05 10:00–13:00

  it("is live inside the window", () => {
    expect(isLive(dragon, new Date(2026, 8, 5, 11, 0))).toBe(true);
  });
  it("is not live before or after the window", () => {
    expect(isLive(dragon, new Date(2026, 8, 5, 9, 0))).toBe(false);
    expect(isLive(dragon, new Date(2026, 8, 5, 14, 0))).toBe(false);
  });
  it("liveEvents returns only what's happening now", () => {
    const live = liveEvents(ATLANTA_EVENTS, new Date(2026, 8, 5, 11, 30));
    expect(live.map((e) => e.id)).toEqual(["dragon-con-parade"]);
  });
  it("a date-only multi-day event is live across its whole span", () => {
    const pride = byId("atlanta-pride-festival-parade"); // 2026-10-10 .. 10-11
    expect(isLive(pride, new Date(2026, 9, 10, 20, 0))).toBe(true); // evening of day 1
    expect(isLive(pride, new Date(2026, 9, 11, 15, 0))).toBe(true); // afternoon of day 2
  });
});

describe("upcomingEvents — the Coming-up shelf", () => {
  const now = new Date(2026, 6, 25); // Jul 25 2026

  it("surfaces near-term future events, soonest first, within the horizon", () => {
    const up = upcomingEvents(ATLANTA_EVENTS, now, { horizonDays: 60 });
    // Dragon Con (Sep 5, ~42d) and Shaky Knees (Sep 18, ~55d) are in; spring 2027 is not.
    expect(up[0].id).toBe("dragon-con-parade");
    expect(up.map((e) => e.id)).toContain("shaky-knees");
    expect(up.every((e) => daysUntil(now, e) <= 60)).toBe(true);
    // sorted ascending by start
    const starts = up.map((e) => eventWindow(e).start.getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });

  it("respects the limit", () => {
    expect(upcomingEvents(ATLANTA_EVENTS, now, { horizonDays: 365, limit: 3 })).toHaveLength(3);
  });

  it("excludes an event that is live right now (that belongs to the takeover)", () => {
    const during = new Date(2026, 8, 5, 11, 0); // mid Dragon Con
    const up = upcomingEvents(ATLANTA_EVENTS, during, { horizonDays: 60 });
    expect(up.map((e) => e.id)).not.toContain("dragon-con-parade");
  });
});

describe("whenLabel — forward, never a passed time", () => {
  const dragon = byId("dragon-con-parade");
  it("reads in weeks when it's over a week out", () => {
    expect(whenLabel(new Date(2026, 6, 25), dragon)).toMatch(/weeks/);
  });
  it("reads 'Tomorrow' the day before", () => {
    expect(whenLabel(new Date(2026, 8, 4), dragon)).toBe("Tomorrow");
  });
});

describe("eventToSpot — the adapter (inherit/override seam)", () => {
  it("carries the event as the SUBJECT (name, why, look, window, genre)", () => {
    const pride = byId("atlanta-pride-festival-parade");
    const s = eventToSpot(pride, FALLBACK_SPOTS);
    expect(s.id).toBe(pride.id);
    expect(s.name).toBe(pride.name);
    expect(s.why).toBe(pride.why);
    expect(s.look).toEqual(pride.look);
    expect(s.genre).toBe(pride.genres[0]);
    expect(s.windowType).toBe(pride.windowType);
  });

  it("INHERITS the venue spot's imagery when venueSpotId is set", () => {
    const pride = byId("atlanta-pride-festival-parade"); // venue: piedmont
    const piedmont = FALLBACK_SPOTS.find((s) => s.id === "piedmont")!;
    const s = eventToSpot(pride, FALLBACK_SPOTS);
    expect(s.img).toBe(piedmont.img);
  });

  it("a standalone event (no venue) leaves imagery to the default fallback", () => {
    const dragon = byId("dragon-con-parade"); // venue: null
    const s = eventToSpot(dragon, FALLBACK_SPOTS);
    expect(s.img).toBe("");
  });
});
