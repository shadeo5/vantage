// Camera & lens reference catalog — a self-contained data module that powers the
// upcoming "gear → subject matching" feature (e.g. telephoto → sports/distance;
// fast 35–50mm prime → low-light street; wide → architecture; macro → details).
//
// Specs are real. Focal lengths and apertures are the manufacturer figures for the
// named products. Crop factors are the standard sensor multipliers per format.
// This mirrors the style of lib/spots.ts: exported typed const arrays + arrow-function
// helpers, no runtime/Expo dependencies.

export type SensorFormat =
  | "full-frame"
  | "aps-c"
  | "micro-4-3"
  | "1-inch"
  | "medium-format";

export type Camera = {
  id: string;
  brand: string;
  model: string;
  sensorFormat: SensorFormat;
  cropFactor: number; // full-frame-equivalent multiplier for this sensor
  // Present only on fixed-lens compacts (X100VI, GR IIIx, Q3, phones). The focal is
  // the lens's ACTUAL focal length; multiply by cropFactor for the ff-equivalent.
  fixedLens?: { minFocal: number; maxFocal: number; maxAperture: number };
};

export type LensCategory =
  | "ultra-wide"
  | "wide"
  | "normal"
  | "short-tele"
  | "tele"
  | "super-tele"
  | "macro";

export type Lens = {
  id: string;
  brand: string;
  model: string;
  minFocal: number; // for a prime, maxFocal === minFocal
  maxFocal: number;
  maxAperture: number; // widest (brightest) f-number; for a variable zoom, the fast end
  type: "prime" | "zoom";
  category: LensCategory;
};

// Genre vocabulary — the first five align with the BagScreen style chips
// (Street, Portraits, Landscape, Architecture, Nature); the last three extend it for
// the reach/detail end of the matching feature.
export type Genre =
  | "Street"
  | "Portraits"
  | "Landscape"
  | "Architecture"
  | "Nature"
  | "Sports"
  | "Wildlife"
  | "Details";

// ---------------------------------------------------------------------------
// Cameras — popular enthusiast / street / hybrid bodies across brands.
// Crop factors: full-frame 1.0 · APS-C 1.5 (Canon APS-C 1.6) · Micro 4/3 2.0 ·
// 1-inch 2.7. Flagship phone main sensors are ~1/1.3" (smaller than a true 1-inch);
// we file them under "1-inch" as the nearest listed class and use their real
// physical focal + effective crop so the ff-equivalent still lands at ~24mm.
// ---------------------------------------------------------------------------
export const CAMERAS: Camera[] = [
  // Fixed-lens compacts
  { id: "fuji-x100vi", brand: "Fujifilm", model: "X100VI", sensorFormat: "aps-c", cropFactor: 1.5, fixedLens: { minFocal: 23, maxFocal: 23, maxAperture: 2.0 } },
  { id: "ricoh-gr-iiix", brand: "Ricoh", model: "GR IIIx", sensorFormat: "aps-c", cropFactor: 1.5, fixedLens: { minFocal: 26.1, maxFocal: 26.1, maxAperture: 2.8 } },
  { id: "ricoh-gr-iii", brand: "Ricoh", model: "GR III", sensorFormat: "aps-c", cropFactor: 1.5, fixedLens: { minFocal: 18.3, maxFocal: 18.3, maxAperture: 2.8 } },
  { id: "leica-q3", brand: "Leica", model: "Q3", sensorFormat: "full-frame", cropFactor: 1.0, fixedLens: { minFocal: 28, maxFocal: 28, maxAperture: 1.7 } },

  // Fujifilm interchangeable-lens (APS-C X-mount)
  { id: "fuji-xt5", brand: "Fujifilm", model: "X-T5", sensorFormat: "aps-c", cropFactor: 1.5 },
  { id: "fuji-xs20", brand: "Fujifilm", model: "X-S20", sensorFormat: "aps-c", cropFactor: 1.5 },

  // Sony E-mount
  { id: "sony-a7-iv", brand: "Sony", model: "a7 IV", sensorFormat: "full-frame", cropFactor: 1.0 },
  { id: "sony-a7c-ii", brand: "Sony", model: "a7C II", sensorFormat: "full-frame", cropFactor: 1.0 },
  { id: "sony-a6700", brand: "Sony", model: "a6700", sensorFormat: "aps-c", cropFactor: 1.5 },

  // Canon RF-mount
  { id: "canon-r6-ii", brand: "Canon", model: "EOS R6 Mark II", sensorFormat: "full-frame", cropFactor: 1.0 },
  { id: "canon-r8", brand: "Canon", model: "EOS R8", sensorFormat: "full-frame", cropFactor: 1.0 },
  { id: "canon-r50", brand: "Canon", model: "EOS R50", sensorFormat: "aps-c", cropFactor: 1.6 },

  // Nikon Z-mount
  { id: "nikon-zf", brand: "Nikon", model: "Z f", sensorFormat: "full-frame", cropFactor: 1.0 },
  { id: "nikon-z6-iii", brand: "Nikon", model: "Z6 III", sensorFormat: "full-frame", cropFactor: 1.0 },
  { id: "nikon-zfc", brand: "Nikon", model: "Z fc", sensorFormat: "aps-c", cropFactor: 1.5 },

  // Micro 4/3 & full-frame others
  { id: "om-om5", brand: "OM System", model: "OM-5", sensorFormat: "micro-4-3", cropFactor: 2.0 },
  { id: "panasonic-s5-ii", brand: "Panasonic", model: "Lumix S5 II", sensorFormat: "full-frame", cropFactor: 1.0 },

  // Phones (main/wide camera). Filed as "1-inch" (nearest listed class); physical
  // focal + crop chosen so the ff-equivalent is the marketed ~24mm.
  { id: "apple-iphone-16-pro", brand: "Apple", model: "iPhone 16 Pro", sensorFormat: "1-inch", cropFactor: 3.5, fixedLens: { minFocal: 6.9, maxFocal: 6.9, maxAperture: 1.78 } },
  { id: "samsung-s24-ultra", brand: "Samsung", model: "Galaxy S24 Ultra", sensorFormat: "1-inch", cropFactor: 3.8, fixedLens: { minFocal: 6.3, maxFocal: 6.3, maxAperture: 1.7 } },
];

// ---------------------------------------------------------------------------
// Lenses — common primes & zooms spanning every category, with real specs.
// `category` is the lens's own class (by nominal focal / purpose); genre matching
// below works off the ff-EQUIVALENT focal, which depends on the body it's mounted on.
// ---------------------------------------------------------------------------
export const LENSES: Lens[] = [
  // Ultra-wide
  { id: "sigma-14-18-art", brand: "Sigma", model: "14mm f/1.8 DG HSM Art", minFocal: 14, maxFocal: 14, maxAperture: 1.8, type: "prime", category: "ultra-wide" },
  { id: "nikon-z-14-30-f4", brand: "Nikon", model: "NIKKOR Z 14-30mm f/4 S", minFocal: 14, maxFocal: 30, maxAperture: 4.0, type: "zoom", category: "ultra-wide" },
  { id: "sony-fe-16-35-28gm", brand: "Sony", model: "FE 16-35mm f/2.8 GM", minFocal: 16, maxFocal: 35, maxAperture: 2.8, type: "zoom", category: "ultra-wide" },
  { id: "fuji-xf16-14", brand: "Fujifilm", model: "XF 16mm f/1.4 R WR", minFocal: 16, maxFocal: 16, maxAperture: 1.4, type: "prime", category: "ultra-wide" },

  // Wide
  { id: "fuji-xf23-2", brand: "Fujifilm", model: "XF 23mm f/2 R WR", minFocal: 23, maxFocal: 23, maxAperture: 2.0, type: "prime", category: "wide" },
  { id: "sony-fe35-18", brand: "Sony", model: "FE 35mm f/1.8", minFocal: 35, maxFocal: 35, maxAperture: 1.8, type: "prime", category: "wide" },
  { id: "sigma-35-14-art", brand: "Sigma", model: "35mm f/1.4 DG DN Art", minFocal: 35, maxFocal: 35, maxAperture: 1.4, type: "prime", category: "wide" },
  { id: "canon-rf35-18", brand: "Canon", model: "RF 35mm f/1.8 IS Macro STM", minFocal: 35, maxFocal: 35, maxAperture: 1.8, type: "prime", category: "wide" },
  { id: "fuji-xf33-14", brand: "Fujifilm", model: "XF 33mm f/1.4 R LM WR", minFocal: 33, maxFocal: 33, maxAperture: 1.4, type: "prime", category: "wide" },

  // Normal
  { id: "sony-fe50-18", brand: "Sony", model: "FE 50mm f/1.8", minFocal: 50, maxFocal: 50, maxAperture: 1.8, type: "prime", category: "normal" },
  { id: "nikon-z50-18", brand: "Nikon", model: "NIKKOR Z 50mm f/1.8 S", minFocal: 50, maxFocal: 50, maxAperture: 1.8, type: "prime", category: "normal" },
  { id: "canon-rf50-18", brand: "Canon", model: "RF 50mm f/1.8 STM", minFocal: 50, maxFocal: 50, maxAperture: 1.8, type: "prime", category: "normal" },
  { id: "sigma-24-70-28", brand: "Sigma", model: "24-70mm f/2.8 DG DN Art", minFocal: 24, maxFocal: 70, maxAperture: 2.8, type: "zoom", category: "normal" },
  { id: "sony-fe-24-70-gm2", brand: "Sony", model: "FE 24-70mm f/2.8 GM II", minFocal: 24, maxFocal: 70, maxAperture: 2.8, type: "zoom", category: "normal" },

  // Short telephoto
  { id: "sony-fe85-18", brand: "Sony", model: "FE 85mm f/1.8", minFocal: 85, maxFocal: 85, maxAperture: 1.8, type: "prime", category: "short-tele" },
  { id: "nikon-z85-18", brand: "Nikon", model: "NIKKOR Z 85mm f/1.8 S", minFocal: 85, maxFocal: 85, maxAperture: 1.8, type: "prime", category: "short-tele" },
  { id: "canon-rf85-2", brand: "Canon", model: "RF 85mm f/2 Macro IS STM", minFocal: 85, maxFocal: 85, maxAperture: 2.0, type: "prime", category: "short-tele" },

  // Telephoto
  { id: "sony-fe-70-200-28gm2", brand: "Sony", model: "FE 70-200mm f/2.8 GM OSS II", minFocal: 70, maxFocal: 200, maxAperture: 2.8, type: "zoom", category: "tele" },

  // Super-telephoto
  { id: "sigma-100-400", brand: "Sigma", model: "100-400mm f/5-6.3 DG DN OS", minFocal: 100, maxFocal: 400, maxAperture: 5.0, type: "zoom", category: "super-tele" },
  { id: "canon-rf-100-500", brand: "Canon", model: "RF 100-500mm f/4.5-7.1 L IS USM", minFocal: 100, maxFocal: 500, maxAperture: 4.5, type: "zoom", category: "super-tele" },
  { id: "sony-fe-200-600", brand: "Sony", model: "FE 200-600mm f/5.6-6.3 G OSS", minFocal: 200, maxFocal: 600, maxAperture: 5.6, type: "zoom", category: "super-tele" },

  // Macro
  { id: "sony-fe90-macro", brand: "Sony", model: "FE 90mm f/2.8 Macro G OSS", minFocal: 90, maxFocal: 90, maxAperture: 2.8, type: "prime", category: "macro" },
  { id: "canon-rf100-macro", brand: "Canon", model: "RF 100mm f/2.8L Macro IS USM", minFocal: 100, maxFocal: 100, maxAperture: 2.8, type: "prime", category: "macro" },
  { id: "nikon-z105-macro", brand: "Nikon", model: "NIKKOR Z MC 105mm f/2.8 VR S", minFocal: 105, maxFocal: 105, maxAperture: 2.8, type: "prime", category: "macro" },
];

// ---------------------------------------------------------------------------
// Lookups (parity with lib/spots.ts getSpot)
// ---------------------------------------------------------------------------
export const getCamera = (id: string): Camera => CAMERAS.find((c) => c.id === id) ?? CAMERAS[0];
export const getLens = (id: string): Lens => LENSES.find((l) => l.id === id) ?? LENSES[0];

// ---------------------------------------------------------------------------
// Focal-length helpers
// ---------------------------------------------------------------------------

// Round a physical focal length to its full-frame equivalent on a given crop.
const equivAt = (focal: number, cropFactor: number): number => Math.round(focal * cropFactor);

// Classify a physical focal length into a lens category (macro is handled separately).
export const categoryForFocal = (focal: number): LensCategory => {
  if (focal <= 20) return "ultra-wide";
  if (focal <= 35) return "wide";
  if (focal <= 58) return "normal";
  if (focal <= 105) return "short-tele";
  if (focal <= 300) return "tele";
  return "super-tele";
};

// Full-frame-equivalent focal length of a lens on a given body (crop factor applied).
// For a zoom this returns the wide (min) end; genre matching below also weighs the long end.
export const equivalentFocal = (lens: Lens, camera: Camera): number =>
  equivAt(lens.minFocal, camera.cropFactor);

// Genre-matching rules, keyed on the ff-EQUIVALENT focal length (and aperture where it
// decides subject separation). Apertures at/under FAST are treated as fast enough to
// isolate a subject / shoot low-light.
//
//   equiv ≤ 20mm            → Landscape, Architecture, Nature   (ultra-wide vistas)
//   20–28mm                 → Street, Architecture, Landscape   (wide reportage)
//   28–40mm  (e.g. 35mm)    → Street, Architecture              (classic street)
//   40–60mm  (e.g. 50mm)    → Street, + Portraits if fast
//   60–105mm (e.g. 85mm)    → Portraits if fast                 (head-and-shoulders)
//   105–135mm               → Sports, + Portraits if fast       (short reach)
//   135–300mm               → Sports, Wildlife, Nature          (action / distance)
//   > 300mm                 → Wildlife, Nature                  (super-tele reach)
//   category === 'macro'    → Details (always), plus the focal rules above
const FAST = 2.8;

const classifyFocal = (equiv: number, aperture: number, out: Set<Genre>): void => {
  if (equiv <= 20) {
    out.add("Landscape");
    out.add("Architecture");
    out.add("Nature");
  } else if (equiv <= 28) {
    out.add("Street");
    out.add("Architecture");
    out.add("Landscape");
  } else if (equiv <= 40) {
    out.add("Street");
    out.add("Architecture");
  } else if (equiv <= 60) {
    out.add("Street");
    if (aperture <= FAST) out.add("Portraits");
  } else if (equiv <= 105) {
    if (aperture <= FAST) out.add("Portraits");
  } else if (equiv <= 135) {
    out.add("Sports");
    if (aperture <= FAST) out.add("Portraits");
  } else if (equiv <= 300) {
    out.add("Sports");
    out.add("Wildlife");
    out.add("Nature");
  } else {
    out.add("Wildlife");
    out.add("Nature");
  }
};

// Best-fit genres for a lens, optionally on a specific body (crop factor applied).
// Without a camera the lens is evaluated as if on full-frame (crop 1.0).
export const genresForLens = (lens: Lens, camera?: Camera): Genre[] => {
  const crop = camera ? camera.cropFactor : 1;
  const out = new Set<Genre>();
  if (lens.category === "macro") out.add("Details");
  // Weigh both ends of a zoom (identical values for a prime).
  classifyFocal(equivAt(lens.minFocal, crop), lens.maxAperture, out);
  classifyFocal(equivAt(lens.maxFocal, crop), lens.maxAperture, out);
  return [...out];
};

// Genres contributed by a fixed-lens camera's built-in lens (empty for ILC bodies).
export const genresForCamera = (camera: Camera): Genre[] => {
  if (!camera.fixedLens) return [];
  const { minFocal, maxFocal, maxAperture } = camera.fixedLens;
  const pseudo: Lens = {
    id: `${camera.id}-fixed`,
    brand: camera.brand,
    model: `${camera.model} (fixed)`,
    minFocal,
    maxFocal,
    maxAperture,
    type: minFocal === maxFocal ? "prime" : "zoom",
    category: categoryForFocal(minFocal),
  };
  return genresForLens(pseudo, camera);
};

// Deduped union of every genre a kit can cover. Each lens is considered on every body
// in the kit (crop scenarios differ), and fixed-lens cameras contribute their own lens.
export const genresForKit = (cameras: Camera[], lenses: Lens[]): Genre[] => {
  const out = new Set<Genre>();
  const bodies: (Camera | undefined)[] = cameras.length ? cameras : [undefined];
  for (const lens of lenses) {
    for (const body of bodies) {
      for (const g of genresForLens(lens, body)) out.add(g);
    }
  }
  for (const camera of cameras) {
    for (const g of genresForCamera(camera)) out.add(g);
  }
  return [...out];
};
