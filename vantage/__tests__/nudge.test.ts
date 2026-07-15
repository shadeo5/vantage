import { lightTiming, gearFitScore, tonightNudge, bestNearYou, MAX_NEAR_YOU } from "../lib/nudge";
import { FALLBACK_SPOTS as SPOTS, type Spot } from "../lib/spots";
import { getLightWindows } from "../lib/light";

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
  const v = tonightNudge(SPOTS, new Date(2026, 6, 13, 19, 0, 0), "fuji-x100vi", ["sony-fe35-18"]);

  test("returns a real spot and the Why-signals in order (no unbuilt Activity row)", () => {
    expect(SPOTS.some((s) => s.id === v.spot.id)).toBe(true);
    expect(v.signals.map((s) => s.key)).toEqual(["light", "gear"]);
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
  test("exposes tonight's window for the copy layer", () => {
    expect(v.window.label).toMatch(/\d/);
    expect(["golden", "blue", "flat"]).toContain(v.window.type);
  });
  test("picks the highest-scoring spot (deterministic for a fixed input)", () => {
    // Re-running with the same inputs yields the same pick — no hidden randomness.
    const again = tonightNudge(SPOTS, new Date(2026, 6, 13, 19, 0, 0), "fuji-x100vi", ["sony-fe35-18"]);
    expect(again.spot.id).toBe(v.spot.id);
    expect(again.score).toBe(v.score);
  });
});

describe("bestNearYou (capped, quality-gated)", () => {
  const cam = "fuji-x100vi";
  const kit = ["sony-fe35-18"];
  const now = new Date(2026, 6, 13, 19, 0, 0);

  test("caps at MAX_NEAR_YOU and excludes the hero, even when many spots clear", () => {
    // Build 8 strong copies of a golden spot and evaluate at its prime golden moment
    // (timing 1.0) so all of them clear — TZ-independent since the moment is derived
    // from the computed window, not wall-clock.
    const golden = SPOTS.find((s) => s.windowType === "golden")!;
    const w = getLightWindows(now, golden.lat, golden.lon);
    const primeNow = new Date((w.goldenEvening.start.getTime() + w.goldenEvening.end.getTime()) / 2);
    const pack = Array.from({ length: 8 }, (_, i) => ({ ...golden, id: `g${i}` }));
    const hero = tonightNudge(pack, primeNow, cam, kit).spot;
    const near = bestNearYou(pack, primeNow, cam, kit, hero.id);
    expect(near).toHaveLength(MAX_NEAR_YOU);
    expect(near.map((s) => s.id)).not.toContain(hero.id);
    expect(new Set(near.map((s) => s.id)).size).toBe(near.length); // no duplicates
  });

  test("only includes spots that clear the go bar on their own (quality gate)", () => {
    const hero = tonightNudge(SPOTS, now, cam, kit).spot;
    const near = bestNearYou(SPOTS, now, cam, kit, hero.id);
    // Each alternate would itself be a 'go' if it were the only spot.
    for (const s of near) expect(tonightNudge([s], now, cam, kit).go).toBe(true);
    // ...and it's exactly the top non-hero clearers, capped.
    const clearing = SPOTS.filter((s) => s.id !== hero.id && tonightNudge([s], now, cam, kit).go);
    expect(near).toHaveLength(Math.min(clearing.length, MAX_NEAR_YOU));
  });

  test("drops a spot below the go bar even while stronger ones clear (the gate)", () => {
    const g = SPOTS.find((s) => s.windowType === "golden")!;
    const w = getLightWindows(now, g.lat, g.lon);
    const primeNow = new Date((w.goldenEvening.start.getTime() + w.goldenEvening.end.getTime()) / 2);
    // Two strong golden spots the street kit fits (score high) + one that CAN'T clear:
    // a flat window (base 0.55) with a genre nothing in the kit covers (gear 0.35) tops
    // out at ~0.47 < 0.55 for any timing, so the gate must always exclude it.
    const strongA: Spot = { ...g, id: "strongA", windowType: "golden", genre: "Street" };
    const strongB: Spot = { ...g, id: "strongB", windowType: "golden", genre: "Street" };
    const weak: Spot = { ...g, id: "weak", windowType: "flat", genre: "Wildlife" };
    const pack = [strongA, strongB, weak];
    const hero = tonightNudge(pack, primeNow, cam, kit).spot;
    const near = bestNearYou(pack, primeNow, cam, kit, hero.id);
    expect(near.map((s) => s.id)).toContain(hero.id === "strongA" ? "strongB" : "strongA");
    expect(near.map((s) => s.id)).not.toContain("weak");
  });

  test("returns nothing when the hero is the only spot (section hides)", () => {
    const one = [SPOTS[0]];
    const hero = tonightNudge(one, now, cam, kit).spot;
    expect(bestNearYou(one, now, cam, kit, hero.id)).toHaveLength(0);
  });

  test("is deterministic for a fixed input", () => {
    const hero = tonightNudge(SPOTS, now, cam, kit).spot;
    expect(bestNearYou(SPOTS, now, cam, kit, hero.id)).toEqual(bestNearYou(SPOTS, now, cam, kit, hero.id));
  });
});
