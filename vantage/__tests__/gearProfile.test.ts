import {
  DEFAULT_CAMERA_ID, DEFAULT_LENSES, LENS_PRESETS,
  kitGenres, primaryLensLabel, bestLensForGenre, fitLabel, fitGapLabel,
  lensLabel, cameraLabel, cameraMeta,
} from "../lib/gearProfile";
import { getCamera, type LensSpec } from "../lib/gear";

const L = (minFocal: number, maxAperture: number, extra: Partial<LensSpec> = {}): LensSpec =>
  ({ minFocal, maxFocal: minFocal, maxAperture, ...extra });
const ILC = "sony-a7-iv"; // full-frame interchangeable
const l35 = L(35, 1.8), l50 = L(50, 1.8);
const tele: LensSpec = { minFocal: 70, maxFocal: 200, maxAperture: 2.8 };
const macro = L(90, 2.8, { macro: true });

describe("gear profile", () => {
  test("the default camera is a real catalog camera", () => {
    expect(getCamera(DEFAULT_CAMERA_ID).id).toBe(DEFAULT_CAMERA_ID);
  });

  test("presets are all valid generic descriptors", () => {
    for (const p of LENS_PRESETS) {
      expect(p.spec.maxFocal).toBeGreaterThanOrEqual(p.spec.minFocal);
      expect(p.spec.maxAperture).toBeGreaterThan(0);
    }
  });

  test("the default (fixed-lens X100VI) kit covers Street from its built-in lens", () => {
    expect(kitGenres(DEFAULT_CAMERA_ID, DEFAULT_LENSES)).toContain("Street");
  });

  test("adding a long telephoto to an ILC adds Sports", () => {
    expect(kitGenres(ILC, [l35, tele])).toContain("Sports");
  });

  test("adding a macro adds Details and never shrinks coverage", () => {
    const base = kitGenres(ILC, [l35]);
    const more = kitGenres(ILC, [l35, macro]);
    expect(more.length).toBeGreaterThanOrEqual(base.length);
    expect(more).toContain("Details");
  });

  test("a fixed-lens body ignores lingering separate lenses (no phantom coverage)", () => {
    // A Q3's built-in 28mm is the whole kit — a leftover 70–200 + macro must NOT count.
    const g = kitGenres("leica-q3", [tele, macro]);
    expect([...g].sort()).toEqual(["Architecture", "Landscape", "Street"]);
    expect(g).not.toContain("Sports");
    expect(g).not.toContain("Details");
  });

  describe("lensLabel", () => {
    test("prime → focal; zoom → range; macro flagged", () => {
      expect(lensLabel(l50)).toBe("50mm");
      expect(lensLabel(tele)).toBe("70–200mm");
      expect(lensLabel(macro)).toBe("90mm macro");
    });
  });

  describe("primaryLensLabel — honest, no fake default", () => {
    test("a fixed-lens body reports its built-in focal", () => {
      expect(primaryLensLabel("leica-q3", [])).toBe("28mm");
      expect(primaryLensLabel(DEFAULT_CAMERA_ID, [])).toBe("35mm"); // X100VI = 35mm equiv
    });
    test("an ILC reports its first lens, or an honest fallback when empty", () => {
      expect(primaryLensLabel(ILC, [tele])).toBe("70–200mm");
      expect(primaryLensLabel(ILC, [])).toBe("lens");
    });
  });

  describe("bestLensForGenre — never names a lens that doesn't fit", () => {
    test("a selected 35mm is the street pick on an ILC", () => {
      expect(bestLensForGenre(ILC, [l35], "Street")).toBe("35mm");
    });
    test("the telephoto IS the pick for Sports", () => {
      expect(bestLensForGenre(ILC, [tele], "Sports")).toBe("70–200mm");
    });
    test("a telephoto-only ILC has no Street lens → null (honest gap)", () => {
      expect(bestLensForGenre(ILC, [tele], "Street")).toBeNull();
    });
    test("a fixed-lens Q3 names its own 28mm for Street (never the model name)", () => {
      expect(bestLensForGenre("leica-q3", [], "Street")).toBe("28mm");
    });
    test("a fixed-lens Q3 (28mm) has no Wildlife reach → null", () => {
      expect(bestLensForGenre("leica-q3", [], "Wildlife")).toBeNull();
    });
  });

  describe("camera display helpers", () => {
    test("cameraLabel is brand + model", () => {
      expect(cameraLabel(getCamera("fuji-x100vi"))).toBe("Fujifilm X100VI");
    });
    test("cameraMeta shows the fixed-lens equivalent for a compact", () => {
      expect(cameraMeta(getCamera("fuji-x100vi"))).toBe("Fixed 35mm · f/2");
    });
    test("cameraMeta shows sensor + interchangeable for an ILC", () => {
      expect(cameraMeta(getCamera("sony-a7-iv"))).toBe("Full-frame · interchangeable");
    });
    test("changing the body changes the kit's genres", () => {
      const apsc = kitGenres("fuji-xt5", [l50]); // 50mm → ~75mm on APS-C (Portraits, not Street)
      const ff = kitGenres("sony-a7-iv", [l50]); // stays 50mm (Street)
      expect(ff).toContain("Street");
      expect(apsc).not.toContain("Street");
    });
  });

  describe("fitLabel / fitGapLabel", () => {
    test("fitLabel names the fitting lens for a covered genre", () => {
      expect(fitLabel(ILC, [l35], "Street")).toBe("fits your 35mm");
    });
    test("fitLabel offers a positive note for a genre the kit isn't ideal for", () => {
      expect(fitLabel(ILC, [macro], "Wildlife")).toBe("a longer lens would shine here");
    });
    test("fitGapLabel is null when the kit already suits the genre", () => {
      expect(fitGapLabel(ILC, [l35], "Street")).toBeNull();
    });
    test("fitGapLabel surfaces the note only on a real gap", () => {
      expect(fitGapLabel(ILC, [macro], "Wildlife")).toBe("a longer lens would shine here");
    });
  });
});
