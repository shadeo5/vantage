import { LENS_CHIPS, DEFAULT_CAMERA_ID, DEFAULT_LENS_IDS, kitGenres, primaryLensLabel, bestLensForGenre, fitLabel } from "../lib/gearProfile";
import { getLens, getCamera } from "../lib/gear";

describe("gear profile", () => {
  test("every lens chip maps to a real catalog lens", () => {
    // getLens falls back to LENSES[0] on an unknown id, so a typo would fail this.
    for (const chip of LENS_CHIPS) {
      expect(getLens(chip.id).id).toBe(chip.id);
    }
  });

  test("the default camera is a real catalog camera", () => {
    expect(getCamera(DEFAULT_CAMERA_ID).id).toBe(DEFAULT_CAMERA_ID);
  });

  test("the default kit covers Street", () => {
    expect(kitGenres(DEFAULT_CAMERA_ID, DEFAULT_LENS_IDS)).toContain("Street");
  });

  test("adding a long telephoto adds Sports", () => {
    const g = kitGenres(DEFAULT_CAMERA_ID, [...DEFAULT_LENS_IDS, "sony-fe-70-200-28gm2"]);
    expect(g).toContain("Sports");
  });

  test("adding more gear never shrinks coverage, and a macro adds Details", () => {
    const base = kitGenres(DEFAULT_CAMERA_ID, DEFAULT_LENS_IDS);
    const more = kitGenres(DEFAULT_CAMERA_ID, [...DEFAULT_LENS_IDS, "sony-fe90-macro"]);
    expect(more.length).toBeGreaterThanOrEqual(base.length);
    expect(more).toContain("Details");
  });

  test("primaryLensLabel reflects the selection, with a sane fallback", () => {
    expect(primaryLensLabel(["sony-fe-70-200-28gm2"])).toBe("70–200mm");
    expect(primaryLensLabel([])).toBe("35mm");
  });

  describe("bestLensForGenre — never names a lens that doesn't fit", () => {
    test("a selected 35mm is the street pick", () => {
      expect(bestLensForGenre(DEFAULT_CAMERA_ID, ["sony-fe35-18"], "Street")).toBe("35mm");
    });
    test("a telephoto-only kit falls back to the (street-capable) camera for Street", () => {
      // The 70–200 doesn't cover Street, so it must NOT be named — the X100VI body does.
      expect(bestLensForGenre(DEFAULT_CAMERA_ID, ["sony-fe-70-200-28gm2"], "Street")).toBe("X100VI");
    });
    test("the telephoto IS the pick for Sports", () => {
      expect(bestLensForGenre(DEFAULT_CAMERA_ID, ["sony-fe-70-200-28gm2"], "Sports")).toBe("70–200mm");
    });
  });

  describe("fitLabel", () => {
    test("names the fitting lens for a covered genre", () => {
      expect(fitLabel(DEFAULT_CAMERA_ID, ["sony-fe35-18"], "Street")).toBe("fits your 35mm");
    });
    test("honestly flags a genre the kit can't cover", () => {
      // The X100VI body + only a macro lens covers neither Sports nor Wildlife.
      expect(fitLabel(DEFAULT_CAMERA_ID, ["sony-fe90-macro"], "Wildlife")).toBe("a stretch for your kit");
    });
  });
});
