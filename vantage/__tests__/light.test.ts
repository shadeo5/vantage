import { getLightWindows, goldenWindowLabel, hourlyLight, goldenCountdown, lightRead, forwardLight, morningPeek } from "../lib/light";

// Atlanta, a fixed summer evening. Assertions are relative/structural so they're
// timezone-robust — we never hard-code exact clock times.
const LAT = 33.749, LON = -84.388;
const DAY = new Date(2026, 6, 11, 14, 0, 0); // Jul 11 2026, 2pm local

describe("getLightWindows", () => {
  const w = getLightWindows(DAY, LAT, LON);
  test("golden evening is a valid window before sunset", () => {
    expect(w.goldenEvening.start.getTime()).toBeLessThan(w.goldenEvening.end.getTime());
    expect(w.goldenEvening.end.getTime()).toBeLessThanOrEqual(w.sunset.getTime());
  });
  test("goldenWindowLabel renders a start–end range", () => {
    expect(goldenWindowLabel(w)).toMatch(/\d{1,2}:\d{2}\s?[AP]M.*–.*\d{1,2}:\d{2}\s?[AP]M/);
  });
});

describe("hourlyLight curve", () => {
  const bars = hourlyLight(DAY, LAT, LON);

  test("returns bars with valid types and 0..1 quality", () => {
    expect(bars.length).toBeGreaterThan(10);
    for (const b of bars) {
      expect(["golden", "blue", "flat", "night"]).toContain(b.type);
      expect(b.quality).toBeGreaterThanOrEqual(0);
      expect(b.quality).toBeLessThanOrEqual(1);
    }
  });

  // Regression guard: this suncalc build returns sun altitude in DEGREES, not
  // radians. If a dependency change flips that, midday stops being "flat" and the
  // golden peak collapses — these assertions catch it.
  test("midday is flat and golden hour peaks", () => {
    expect(bars.some((b) => b.type === "golden")).toBe(true);
    expect(bars.some((b) => b.type === "flat")).toBe(true); // fails if altitude is misread as radians
    const goldenQ = Math.max(...bars.filter((b) => b.type === "golden").map((b) => b.quality));
    const flatQ = Math.min(...bars.filter((b) => b.type === "flat").map((b) => b.quality));
    expect(goldenQ).toBeGreaterThan(0.6); // a real peak, not a flat ~0.05
    expect(flatQ).toBeLessThan(0.25);     // harsh midday sits low
  });
});

describe("goldenCountdown", () => {
  test("returns an 'Xh Ym' label", () => {
    const w = getLightWindows(DAY, LAT, LON);
    expect(goldenCountdown(DAY, w).label).toMatch(/^\d+h \d+m$/);
  });
});

// E9 · PH1/PH2 — the phase-honest light read. Times are DERIVED from the computed
// windows so the assertions hold regardless of the test machine's timezone.
describe("lightRead — never say 'not now'", () => {
  const w = getLightWindows(DAY, LAT, LON);
  const night = new Date(w.blueEvening.end.getTime() + 60 * 60000);          // an hour past dusk
  const midday = new Date(w.goldenMorning.end.getTime() + 3 * 60 * 60000);   // a few hours after morning golden
  const golden = new Date((w.goldenEvening.start.getTime() + w.goldenEvening.end.getTime()) / 2);
  const blue = new Date((w.blueEvening.start.getTime() + w.blueEvening.end.getTime()) / 2);

  // Every string the read produces, for the "no negative light" guard.
  const allCopy = (r: ReturnType<typeof lightRead>) => [r.chipLabel, r.heroPhrase, r.stripMain, r.stripSub ?? ""].join(" | ");
  const FORBIDDEN = /\b(gone|closed|missed|too late|harsh|dull)\b|not now/i;

  test("full night affirms the night — positive, with a morning peek, no mourning", () => {
    const r = lightRead(night, LAT, LON);
    expect(r.phase).toBe("night");
    expect(r.stripMain).toMatch(/night/i);
    expect(r.stripSub).toMatch(/next golden/i);
    expect(allCopy(r)).not.toMatch(FORBIDDEN);
  });

  test("REGRESSION (the 9:30pm bug): after evening golden, the read never headlines golden", () => {
    const r = lightRead(night, LAT, LON);
    expect(r.phase).not.toBe("golden");
    expect(r.heroPhrase).not.toMatch(/^Golden hour/i); // must NOT say "Golden hour's on…"
    expect(r.chipLabel).not.toMatch(/golden/i);
  });

  test("flat daytime names the current light AND counts down to golden (rides alongside)", () => {
    const r = lightRead(midday, LAT, LON);
    expect(r.phase).toBe("flat");
    expect(r.chipLabel).toMatch(/(hard|soft) light/i); // flat is first-class, not "harsh"
    expect(r.stripSub).toMatch(/golden in/i);
    expect(allCopy(r)).not.toMatch(FORBIDDEN);
  });

  test("overcast flat reads as soft even light; clear flat as hard light", () => {
    const overcast = { fetchedAt: 0, cloudAt: () => 1, rainAt: () => 0, wetAt: () => false };
    const clear = { fetchedAt: 0, cloudAt: () => 0, rainAt: () => 0, wetAt: () => false };
    expect(lightRead(midday, LAT, LON, overcast).stripMain).toMatch(/soft/i);
    expect(lightRead(midday, LAT, LON, clear).stripMain).toMatch(/hard/i);
  });

  test("in-window golden and blue name themselves with a 'till' end time", () => {
    const g = lightRead(golden, LAT, LON);
    expect(g.phase).toBe("golden");
    expect(g.stripMain).toMatch(/golden hour/i);
    expect(g.stripSub).toMatch(/^till /);
    const b = lightRead(blue, LAT, LON);
    expect(b.phase).toBe("blue");
    expect(b.stripSub).toMatch(/^till /);
  });
});

describe("forwardLight / morningPeek (PH4 sparklines)", () => {
  const w = getLightWindows(DAY, LAT, LON);
  const night = new Date(w.blueEvening.end.getTime() + 60 * 60000);

  test("forwardLight returns a now-anchored 6h window (13 half-hour bars, only the first is 'now')", () => {
    const bars = forwardLight(DAY, LAT, LON);
    expect(bars).toHaveLength(13);
    expect(bars[0].isNow).toBe(true);
    expect(bars.slice(1).every((b) => !b.isNow)).toBe(true);
    for (const b of bars) {
      expect(["golden", "blue", "flat", "night"]).toContain(b.type);
      expect(b.quality).toBeGreaterThanOrEqual(0);
      expect(b.quality).toBeLessThanOrEqual(1);
    }
  });

  test("morningPeek ramps up into tomorrow's dawn light (not a flat-dark chart)", () => {
    const bars = morningPeek(night, LAT, LON);
    expect(bars).toHaveLength(8);
    const q = bars.map((b) => b.quality);
    expect(Math.max(...q)).toBeGreaterThan(Math.min(...q) + 0.2); // a real ramp
    expect(bars.some((b) => b.type !== "night")).toBe(true);       // reaches daylight
  });
});
