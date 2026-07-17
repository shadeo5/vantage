import { FALLBACK_SPOTS, findSpot, windowMeta, spotImageSource, streetViewUrl, HERO_ID, type Spot } from "../lib/spots";

describe("bundled fallback spots", () => {
  test("all carry the fields the UI needs", () => {
    expect(FALLBACK_SPOTS.length).toBeGreaterThanOrEqual(5);
    for (const s of FALLBACK_SPOTS) {
      expect(s.id).toBeTruthy();
      expect(s.name).toBeTruthy();
      expect(s.why.length).toBeGreaterThan(20);
      expect(s.look.length).toBeGreaterThan(0);
      expect(typeof s.lat).toBe("number");
      expect(typeof s.lon).toBe("number");
    }
  });

  test("ids are unique", () => {
    const ids = FALLBACK_SPOTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("the hero id resolves to a real spot", () => {
    expect(FALLBACK_SPOTS.some((s) => s.id === HERO_ID)).toBe(true);
  });
});

describe("findSpot", () => {
  test("returns the matching spot from a pack", () => {
    expect(findSpot(FALLBACK_SPOTS, HERO_ID).id).toBe(HERO_ID);
  });
  test("falls back to the first spot for an unknown id", () => {
    expect(findSpot(FALLBACK_SPOTS, "does-not-exist").id).toBe(FALLBACK_SPOTS[0].id);
  });
});

describe("windowMeta", () => {
  test("maps each light type to color + label + icon", () => {
    expect(windowMeta("golden").color).toBe("#E9B872");
    expect(windowMeta("blue").label).toBe("Blue hour");
    expect(windowMeta("flat").icon).toBeTruthy();
  });
});

describe("spotImageSource", () => {
  test("resolves a bundled illustration for a core spot (no imageUrl)", () => {
    expect(spotImageSource(FALLBACK_SPOTS[0])).toBeDefined();
  });
  test("prefers a remote Storage URL when the spot carries one", () => {
    const remote: Spot = { ...FALLBACK_SPOTS[0], imageUrl: "https://example.com/x.webp" };
    expect(spotImageSource(remote)).toEqual({ uri: "https://example.com/x.webp" });
  });
  test("falls back to the hero bundle for a spot with neither image", () => {
    const orphan: Spot = { ...FALLBACK_SPOTS[0], id: "unknown", img: "unknown", imageUrl: undefined };
    expect(spotImageSource(orphan)).toBe(spotImageSource({ ...FALLBACK_SPOTS[0], img: HERO_ID }));
  });
});

describe("streetViewUrl (PH6)", () => {
  test("builds a Maps URLs API pano link at the spot's coordinates", () => {
    const s = FALLBACK_SPOTS[0];
    const url = streetViewUrl(s);
    expect(url).toContain("map_action=pano");
    expect(url).toContain(`viewpoint=${s.lat},${s.lon}`);
  });
  test("returns null when the spot has no real coordinates (DB default 0,0) → row hides", () => {
    expect(streetViewUrl({ ...FALLBACK_SPOTS[0], lat: 0, lon: 0 })).toBeNull();
  });
});
