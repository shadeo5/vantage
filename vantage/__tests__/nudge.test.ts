import { lightTiming, gearFitScore, tonightNudge } from "../lib/nudge";
import { SPOTS } from "../lib/spots";

describe("lightTiming", () => {
  // All times same-day / same-zone, so comparisons are timezone-independent.
  const start = new Date(2026, 6, 13, 14, 0, 0);
  const end = new Date(2026, 6, 13, 15, 0, 0);

  test("prime (1.0) while the window is happening", () => {
    expect(lightTiming(new Date(2026, 6, 13, 14, 30, 0), start, end)).toBe(1.0);
  });
  test("imminent (0.9) within 2h before", () => {
    expect(lightTiming(new Date(2026, 6, 13, 13, 0, 0), start, end)).toBe(0.9);
  });
  test("later today (0.6) a few hours out", () => {
    expect(lightTiming(new Date(2026, 6, 13, 9, 0, 0), start, end)).toBe(0.6);
  });
  test("much later (0.45) many hours out", () => {
    expect(lightTiming(new Date(2026, 6, 13, 3, 0, 0), start, end)).toBe(0.45);
  });
  test("passed (0.2) after the window ends", () => {
    expect(lightTiming(new Date(2026, 6, 13, 16, 0, 0), start, end)).toBe(0.2);
  });
});

describe("gearFitScore", () => {
  const cam = "fuji-x100vi";
  test("a dedicated lens for the genre scores highest", () => {
    expect(gearFitScore(cam, ["sony-fe35-18"], "Street")).toBe(1.0);
  });
  test("falling back to the body scores lower (but not a stretch)", () => {
    // A 70-200 doesn't cover Street, so the street-capable X100VI body carries it.
    expect(gearFitScore(cam, ["sony-fe-70-200-28gm2"], "Street")).toBe(0.7);
  });
  test("a genre nothing in the kit covers is a stretch", () => {
    expect(gearFitScore(cam, ["sony-fe90-macro"], "Wildlife")).toBe(0.35);
  });
});

describe("tonightNudge", () => {
  const v = tonightNudge(new Date(2026, 6, 13, 19, 0, 0), "fuji-x100vi", ["sony-fe35-18"]);

  test("returns a real spot and the three Why-signals in order", () => {
    expect(SPOTS.some((s) => s.id === v.spot.id)).toBe(true);
    expect(v.signals.map((s) => s.key)).toEqual(["light", "activity", "gear"]);
  });
  test("score is a 0..1 value and go tracks the threshold", () => {
    expect(v.score).toBeGreaterThanOrEqual(0);
    expect(v.score).toBeLessThanOrEqual(1);
    expect(v.go).toBe(v.score >= 0.55);
  });
  test("confidence is consistent with the score band", () => {
    const expected = v.score >= 0.75 ? "high" : v.score >= 0.55 ? "medium" : "low";
    expect(v.confidence).toBe(expected);
  });
  test("the headline reflects the go/no-go decision", () => {
    if (v.go) expect(v.headline).toContain(v.spot.name);
    else expect(v.headline.toLowerCase()).toContain("quiet");
  });
  test("picks the highest-scoring spot (deterministic for a fixed input)", () => {
    // Re-running with the same inputs yields the same pick — no hidden randomness.
    const again = tonightNudge(new Date(2026, 6, 13, 19, 0, 0), "fuji-x100vi", ["sony-fe35-18"]);
    expect(again.spot.id).toBe(v.spot.id);
    expect(again.score).toBe(v.score);
  });
});
