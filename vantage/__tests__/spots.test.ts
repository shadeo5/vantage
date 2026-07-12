import { SPOTS, getSpot, windowMeta, img, HERO_ID } from "../lib/spots";

describe("spots data", () => {
  test("curated spots all carry the fields the UI needs", () => {
    expect(SPOTS.length).toBeGreaterThanOrEqual(5);
    for (const s of SPOTS) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.why.length).toBeGreaterThan(20);
      expect(s.look.length).toBeGreaterThan(0);
      expect(typeof s.lat).toBe("number");
      expect(typeof s.lon).toBe("number");
    }
  });

  test("ids are unique", () => {
    const ids = SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the hero id resolves to a real spot", () => {
    expect(SPOTS.some((s) => s.id === HERO_ID)).toBe(true);
  });
});

describe("getSpot", () => {
  test("returns the matching spot", () => {
    expect(getSpot(HERO_ID).id).toBe(HERO_ID);
  });
  test("falls back to the first spot for an unknown id", () => {
    expect(getSpot("does-not-exist").id).toBe(SPOTS[0].id);
  });
});

describe("windowMeta", () => {
  test("maps each light type to color + label + icon", () => {
    expect(windowMeta("golden").color).toBe("#E9B872");
    expect(windowMeta("blue").label).toBe("Blue hour");
    expect(windowMeta("flat").icon).toBeTruthy();
  });
});

describe("img", () => {
  test("resolves a spot's bundled illustration", () => {
    expect(img("sweetauburn")).toBeDefined();
  });
  test("falls back to the hero image for an unknown id", () => {
    expect(img("does-not-exist")).toBe(img(HERO_ID));
  });
});
