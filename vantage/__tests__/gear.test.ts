import {
  CAMERAS,
  LENSES,
  getCamera,
  getLens,
  equivalentFocal,
  categoryForFocal,
  genresForLens,
  genresForCamera,
  genresForKit,
  type Camera,
  type Lens,
} from "../lib/gear";

describe("catalog data", () => {
  test("cameras carry the fields the matcher needs", () => {
    expect(CAMERAS.length).toBeGreaterThanOrEqual(15);
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

  test("lenses carry sane focal + aperture specs", () => {
    expect(LENSES.length).toBeGreaterThanOrEqual(15);
    for (const l of LENSES) {
      expect(l.maxFocal).toBeGreaterThanOrEqual(l.minFocal);
      if (l.type === "prime") expect(l.maxFocal).toBe(l.minFocal);
      expect(l.maxAperture).toBeGreaterThan(0);
    }
  });

  test("every lens category is represented in the catalog", () => {
    const cats = new Set(LENSES.map((l) => l.category));
    for (const cat of ["ultra-wide", "wide", "normal", "short-tele", "tele", "super-tele", "macro"] as const) {
      expect(cats.has(cat)).toBe(true);
    }
  });

  test("ids are unique across cameras and lenses", () => {
    const camIds = CAMERAS.map((c) => c.id);
    const lensIds = LENSES.map((l) => l.id);
    expect(new Set(camIds).size).toBe(camIds.length);
    expect(new Set(lensIds).size).toBe(lensIds.length);
  });
});

describe("lookups", () => {
  test("getCamera / getLens return the match", () => {
    expect(getCamera("fuji-x100vi").model).toBe("X100VI");
    expect(getLens("sony-fe-70-200-28gm2").minFocal).toBe(70);
  });
  test("fall back to the first entry for an unknown id", () => {
    expect(getCamera("nope").id).toBe(CAMERAS[0].id);
    expect(getLens("nope").id).toBe(LENSES[0].id);
  });
});

describe("equivalentFocal", () => {
  const apsc = getCamera("fuji-xt5"); // 1.5x crop
  test("a 33mm lens on an APS-C 1.5x body ≈ 50mm equiv", () => {
    const lens = getLens("fuji-xf33-14");
    expect(equivalentFocal(lens, apsc)).toBe(50); // 33 * 1.5 = 49.5 → 50
  });
  test("a 50mm on full-frame stays 50mm", () => {
    const ff = getCamera("sony-a7-iv");
    expect(equivalentFocal(getLens("sony-fe50-18"), ff)).toBe(50);
  });
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

describe("genresForLens", () => {
  test("a fast 35mm prime is a Street lens", () => {
    expect(genresForLens(getLens("sigma-35-14-art"))).toContain("Street");
  });
  test("a 70-200mm zoom covers Sports", () => {
    expect(genresForLens(getLens("sony-fe-70-200-28gm2"))).toContain("Sports");
  });
  test("a macro lens is for Details", () => {
    expect(genresForLens(getLens("sony-fe90-macro"))).toContain("Details");
  });
  test("an ultra-wide covers Landscape and Architecture", () => {
    const g = genresForLens(getLens("sigma-14-18-art"));
    expect(g).toContain("Landscape");
    expect(g).toContain("Architecture");
  });
  test("an 85mm f/1.8 is a Portraits lens", () => {
    expect(genresForLens(getLens("sony-fe85-18"))).toContain("Portraits");
  });
  test("crop factor shifts a normal prime toward Portraits on APS-C", () => {
    // 50mm on a 1.5x body = 75mm equiv → portrait territory
    const g = genresForLens(getLens("sony-fe50-18"), getCamera("sony-a6700"));
    expect(g).toContain("Portraits");
  });
});

describe("genresForCamera", () => {
  test("the X100VI (23mm f/2, 1.5x → 35mm equiv) shoots Street", () => {
    expect(genresForCamera(getCamera("fuji-x100vi"))).toContain("Street");
  });
  test("an interchangeable-lens body contributes no built-in genres", () => {
    expect(genresForCamera(getCamera("sony-a7-iv"))).toEqual([]);
  });
});

describe("genresForKit", () => {
  test("a street + reach kit unions to cover Street and Sports", () => {
    const cams: Camera[] = [getCamera("sony-a7-iv")];
    const kit: Lens[] = [getLens("sigma-35-14-art"), getLens("sony-fe-70-200-28gm2")];
    const g = genresForKit(cams, kit);
    expect(g).toContain("Street");
    expect(g).toContain("Sports");
  });
  test("result is deduped", () => {
    const g = genresForKit([getCamera("sony-a7-iv")], [getLens("sony-fe50-18"), getLens("sony-fe50-18")]);
    expect(new Set(g).size).toBe(g.length);
  });
});
