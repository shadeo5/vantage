import { fastestAperture, kitReadiness, shotsFor, shootBrief } from "../lib/shootBrief";
import { conditionsFor, type Conditions } from "../lib/conditions";
import type { Forecast } from "../lib/weather";
import { FALLBACK_SPOTS } from "../lib/spots";
import type { LensSpec } from "../lib/gear";

// A generic prime descriptor helper for the tests.
const L = (min: number, ap: number, extra: Partial<LensSpec> = {}): LensSpec => ({ minFocal: min, maxFocal: min, maxAperture: ap, ...extra });

const cond = (over: Partial<Conditions>): Conditions =>
  ({ phase: "flat", cloud: 0, rain: 0, wet: false, dark: false, ...over });
const fc = (cloud: number, rain = 0, wet = false): Forecast =>
  ({ fetchedAt: 0, cloudAt: () => cloud, rainAt: () => rain, wetAt: () => wet });

describe("fastestAperture", () => {
  test("takes the brightest across an ILC's lenses", () => {
    // a7 IV + a 35 f/1.8 and a 50 f/1.4 → 1.4 is the fastest.
    expect(fastestAperture("sony-a7-iv", [L(35, 1.8), L(50, 1.4)])).toBeCloseTo(1.4);
  });
  test("a slow tele-only kit reads slow", () => {
    // a7 IV (no fixed lens) + 200-600 f/5.6 → 5.6.
    expect(fastestAperture("sony-a7-iv", [{ minFocal: 200, maxFocal: 600, maxAperture: 5.6 }])).toBeCloseTo(5.6);
  });
  test("a fixed-lens body ignores lingering separate lenses", () => {
    // Q3 is f/1.7 built-in; a phantom f/5.6 tele must not change it.
    expect(fastestAperture("leica-q3", [{ minFocal: 200, maxFocal: 600, maxAperture: 5.6 }])).toBeCloseTo(1.7);
  });
});

describe("kitReadiness — aperture vs. darkness", () => {
  const night = cond({ phase: "night", dark: true });

  test("fast glass at night → set", () => {
    const r = kitReadiness("fuji-x100vi", [L(35, 1.8)], night); // f/1.8
    expect(r.level).toBe("set");
    expect(r.line).toMatch(/eats the dark/);
  });
  test("slow glass at night → slow, and offers a way to make it work", () => {
    const r = kitReadiness("sony-a7-iv", [{ minFocal: 200, maxFocal: 600, maxAperture: 5.6 }], night); // f/5.6
    expect(r.level).toBe("slow");
    expect(r.line).toMatch(/tripod|last light|silhouette/i); // ideal-for, never "can't"
  });
  test("mid glass at night → borderline", () => {
    const r = kitReadiness("sony-a7-iv", [{ minFocal: 14, maxFocal: 30, maxAperture: 4.0 }], night); // f/4.0
    expect(r.level).toBe("borderline");
  });
  test("blue hour → fine, with a tripod nudge", () => {
    const r = kitReadiness("sony-a7-iv", [{ minFocal: 200, maxFocal: 600, maxAperture: 5.6 }], cond({ phase: "blue", dark: true }));
    expect(r.level).toBe("fine");
    expect(r.line).toMatch(/tripod/i);
  });
  test("daylight → fine, no darkness line", () => {
    expect(kitReadiness("sony-a7-iv", [{ minFocal: 200, maxFocal: 600, maxAperture: 5.6 }], cond({ phase: "flat" })).line).toBeNull();
  });
});

describe("shotsFor — condition → what to shoot", () => {
  test("wet weather wins: reflections & cover", () => {
    const s = shotsFor(cond({ wet: true, rain: 0.9, cloud: 0.9 }));
    expect(s.join(" ")).toMatch(/reflection|umbrella|cover/i);
  });
  test("overcast daylight → even-light street (the honest overcast win)", () => {
    const s = shotsFor(cond({ phase: "flat", cloud: 0.9 }));
    expect(s.join(" ")).toMatch(/even-light|no harsh shadow|color/i);
  });
  test("clear harsh daylight → hard-shadow / graphic", () => {
    const s = shotsFor(cond({ phase: "flat", cloud: 0.1 }));
    expect(s.join(" ")).toMatch(/hard-shadow|contrast|shade/i);
  });
  test("night → shoot the light sources", () => {
    expect(shotsFor(cond({ phase: "night", dark: true })).join(" ")).toMatch(/neon|light source|light trail/i);
  });
  test("always 1–3 prompts", () => {
    for (const c of [cond({}), cond({ phase: "night" }), cond({ wet: true })]) {
      const n = shotsFor(c).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });
});

describe("shootBrief — the composed plan", () => {
  const spot = FALLBACK_SPOTS[0];
  const night = new Date(2026, 6, 13, 2, 0, 0); // 2am → unambiguously night

  test("rain likely → a sealing warning (warn-first, D3)", () => {
    const b = shootBrief(night, spot, "fuji-x100vi", [L(35, 1.8)], fc(0.9, 0.8, false));
    expect(b.rainWarning).toMatch(/seal|cover/i);
  });
  test("actively wet → warning + wet-weather shots", () => {
    const b = shootBrief(night, spot, "fuji-x100vi", [L(35, 1.8)], fc(1, 0.9, true));
    expect(b.rainWarning).toMatch(/seal|cover/i);
    expect(b.shots.join(" ")).toMatch(/reflection|umbrella|cover/i);
  });
  test("dry night → no rain warning, readiness + shots present", () => {
    const b = shootBrief(night, spot, "fuji-x100vi", [L(35, 1.8)], fc(0.2, 0.1, false));
    expect(b.rainWarning).toBeNull();
    expect(b.readiness.line).toBeTruthy();
    expect(b.shots.length).toBeGreaterThan(0);
  });
  test("no forecast → still a brief (phase-only, dry)", () => {
    const b = shootBrief(night, spot, "fuji-x100vi", [L(35, 1.8)], null);
    expect(b.rainWarning).toBeNull();
    expect(b.conditions.cloud).toBe(0);
  });
});

describe("conditionsFor", () => {
  test("null forecast → clear & dry, phase still read", () => {
    const c = conditionsFor(new Date(2026, 6, 13, 2, 0, 0), 33.75, -84.39, null);
    expect(c.phase).toBe("night");
    expect(c.dark).toBe(true);
    expect(c.cloud).toBe(0);
    expect(c.wet).toBe(false);
  });
  test("reads the forecast when present", () => {
    const c = conditionsFor(new Date(2026, 6, 13, 14, 0, 0), 33.75, -84.39, fc(0.8, 0.3, false));
    expect(c.cloud).toBeCloseTo(0.8);
    expect(c.rain).toBeCloseTo(0.3);
  });
});
