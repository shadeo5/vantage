import { cloudFactor, skyLabel, type CloudCover } from "../lib/weather";
import { hourlyLight } from "../lib/light";

describe("cloudFactor — the honest sky model", () => {
  test("clear skies leave golden light untouched", () => {
    expect(cloudFactor(0, "golden")).toBeCloseTo(1, 5);
    expect(cloudFactor(0.1, "golden")).toBeGreaterThan(0.98); // a few clouds barely register
  });

  test("heavy overcast tempers golden hour hard — but never to zero", () => {
    const f = cloudFactor(1, "golden");
    expect(f).toBeLessThan(0.5);   // overcast kills the warm low light
    expect(f).toBeGreaterThan(0.3); // ...but soft light + a dramatic sky remain
  });

  test("cloud never REWARDS golden light (monotonic decay — can't tell thin-high from thick-low)", () => {
    for (let c = 0; c < 1; c += 0.1) {
      expect(cloudFactor(c + 0.1, "golden")).toBeLessThanOrEqual(cloudFactor(c, "golden") + 1e-9);
    }
  });

  test("blue hour is tempered like golden", () => {
    expect(cloudFactor(1, "blue")).toBeLessThan(0.5);
  });

  test("flat daylight is neutral-to-better under cloud (overcast softens harsh sun)", () => {
    expect(cloudFactor(0, "flat")).toBeCloseTo(1, 5);
    expect(cloudFactor(1, "flat")).toBeGreaterThanOrEqual(1); // never penalized; a mild lift
  });
});

describe("skyLabel", () => {
  test("reads the sky in plain language", () => {
    expect(skyLabel(0)).toBe("clear skies");
    expect(skyLabel(0.3)).toBe("a few clouds");
    expect(skyLabel(0.6)).toBe("partly cloudy");
    expect(skyLabel(1)).toBe("mostly cloudy");
  });
});

describe("hourlyLight with a cloud forecast", () => {
  const LAT = 33.749, LON = -84.388;
  const DAY = new Date(2026, 6, 11, 14, 0, 0);
  const overcast: CloudCover = { fetchedAt: 0, at: () => 1 };   // fully socked in
  const clear: CloudCover = { fetchedAt: 0, at: () => 0 };      // bluebird

  test("overcast knocks the golden peak below the clear-sky peak", () => {
    const goldenPeak = (cloud?: CloudCover) =>
      Math.max(...hourlyLight(DAY, LAT, LON, cloud).filter((b) => b.type === "golden").map((b) => b.quality));
    expect(goldenPeak(overcast)).toBeLessThan(goldenPeak(clear));
  });

  test("a clear forecast matches the astronomical-only curve", () => {
    const clearBars = hourlyLight(DAY, LAT, LON, clear);
    const bareBars = hourlyLight(DAY, LAT, LON);
    for (let i = 0; i < bareBars.length; i++) {
      // flat bars get a tiny lift only at heavy cloud; at 0 cloud everything matches.
      expect(clearBars[i].quality).toBeCloseTo(bareBars[i].quality, 5);
    }
  });
});
