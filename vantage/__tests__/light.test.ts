import { getLightWindows, goldenWindowLabel, hourlyLight, goldenCountdown } from "../lib/light";

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
