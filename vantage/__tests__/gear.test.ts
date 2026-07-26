import {
  CAMERAS,
  getCamera,
  equivFocal,
  categoryForFocal,
  genresForSpec,
  genresForCamera,
  genresForKit,
  type LensSpec,
} from "../lib/gear";

// A generic prime descriptor (the shape the UI now produces).
const lens = (minFocal: number, maxAperture: number, extra: Partial<LensSpec> = {}): LensSpec =>
  ({ minFocal, maxFocal: minFocal, maxAperture, ...extra });

describe("camera catalog", () => {
  test("cameras carry the fields the matcher needs", () => {
    expect(CAMERAS.length).toBeGreaterThanOrEqual(50);
    for (const c of CAMERAS) {
      expect(c.id).toBeTruthy();
      expect(c.brand).toBeTruthy();
      expect(c.model).toBeTruthy();
      expect(c.cropFactor).toBeGreaterThan(0);
      if (c.fixedLens) {
        expect(c.fixedLens.minFocal).toBeGreaterThan(0);
        expect(c.fixedLens.maxFocal).toBeGreaterThanOrEqual(c.fixedLens.minFocal);
        expect(c.fixedLens.maxAperture).toBeGreaterThan(0);
      }
    }
  });

  test("scoped to Fujifilm / Sony / Leica, with unique ids", () => {
    expect([...new Set(CAMERAS.map((c) => c.brand))].sort()).toEqual(["Fujifilm", "Leica", "Sony"]);
    const ids = CAMERAS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getCamera", () => {
  test("returns the match; falls back to the first entry for an unknown id", () => {
    expect(getCamera("fuji-x100vi").model).toBe("X100VI");
    expect(getCamera("nope").id).toBe(CAMERAS[0].id);
  });
});

describe("equivFocal", () => {
  test("33mm on APS-C 1.5x ≈ 50mm equiv", () => expect(equivFocal(33, 1.5)).toBe(50));
  test("full-frame keeps the physical focal", () => expect(equivFocal(50, 1.0)).toBe(50));
});

describe("categoryForFocal", () => {
  test("buckets physical focal lengths", () => {
    expect(categoryForFocal(16)).toBe("ultra-wide");
    expect(categoryForFocal(35)).toBe("wide");
    expect(categoryForFocal(50)).toBe("normal");
    expect(categoryForFocal(85)).toBe("short-tele");
    expect(categoryForFocal(200)).toBe("tele");
    expect(categoryForFocal(500)).toBe("super-tele");
  });
});

describe("genresForSpec (generic lenses)", () => {
  test("a fast 35mm prime is a Street lens", () => expect(genresForSpec(lens(35, 1.4))).toContain("Street"));
  test("a 70-200mm zoom covers Sports", () => expect(genresForSpec({ minFocal: 70, maxFocal: 200, maxAperture: 2.8 })).toContain("Sports"));
  test("a macro lens is for Details", () => expect(genresForSpec(lens(90, 2.8, { macro: true }))).toContain("Details"));
  test("an ultra-wide covers Landscape and Architecture", () => {
    const g = genresForSpec(lens(14, 1.8));
    expect(g).toContain("Landscape");
    expect(g).toContain("Architecture");
  });
  test("an 85mm f/1.8 is a Portraits lens", () => expect(genresForSpec(lens(85, 1.8))).toContain("Portraits"));
  test("crop factor shifts a 50mm toward Portraits on APS-C (→75mm equiv)", () => {
    expect(genresForSpec(lens(50, 1.8), getCamera("sony-a6700"))).toContain("Portraits");
  });
});

describe("genresForCamera (fixed-lens bodies)", () => {
  test("the X100VI (23mm f/2, 1.5x → 35mm equiv) shoots Street", () => {
    expect(genresForCamera(getCamera("fuji-x100vi"))).toContain("Street");
  });
  test("the Leica Q3 (28mm f/1.7) shoots Street", () => {
    expect(genresForCamera(getCamera("leica-q3"))).toContain("Street");
  });
  test("a fixed ZOOM compact (RX100 VII, ~24–194mm equiv) covers wide AND reach", () => {
    const g = genresForCamera(getCamera("sony-rx100-vii"));
    expect(g).toContain("Street");
    expect(g).toContain("Sports");
  });
  test("an interchangeable-lens body contributes no built-in genres", () => {
    expect(genresForCamera(getCamera("sony-a7-iv"))).toEqual([]);
  });
});

describe("genresForKit", () => {
  test("a street + reach kit unions to cover Street and Sports", () => {
    const g = genresForKit([getCamera("sony-a7-iv")], [lens(35, 1.4), { minFocal: 70, maxFocal: 200, maxAperture: 2.8 }]);
    expect(g).toContain("Street");
    expect(g).toContain("Sports");
  });
  test("result is deduped", () => {
    const g = genresForKit([getCamera("sony-a7-iv")], [lens(50, 1.8), lens(50, 1.8)]);
    expect(new Set(g).size).toBe(g.length);
  });
});
