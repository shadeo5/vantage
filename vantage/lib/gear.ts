// Camera reference catalog + gear→genre matching.
//
// Cameras come from ONE authored source of truth — lib/cameras.catalog.json (curated
// Fujifilm / Sony / Leica bodies, 2010-today). Specs are real: cropFactor is the sensor
// multiplier; a fixed-lens compact's focal is its ACTUAL focal (× cropFactor = ff-equiv).
// The push (supabase/functions/nudge/index.ts) gets a generated copy of this catalog,
// guarded by __tests__/parity.test.ts, so app + push can't drift.
//
// LENSES are GENERIC: a kit lens is a LensSpec {minFocal,maxFocal,maxAperture,macro?} —
// focal + aperture is all the matcher needs, so any lens is expressible without a catalog.
// No runtime/Expo dependencies (importable by tests; mirrors lib/spots.ts style).
import cameraCatalog from "./cameras.catalog.json";

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
  year?: number;
  sensorFormat: SensorFormat;
  cropFactor: number; // full-frame-equivalent multiplier for this sensor
  // Present only on fixed-lens compacts (X100 line, Leica Q, Sony RX1/RX100). The focal
  // is the lens's ACTUAL focal length; multiply by cropFactor for the ff-equivalent.
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

// A GENERIC lens — everything the matcher needs, nothing it doesn't. A prime is
// minFocal === maxFocal. `macro` flags a macro lens (focal alone can't tell a 90mm macro
// from a 90mm portrait). Quick-picks and the "+ Add a lens" custom entry both produce these.
export type LensSpec = {
  minFocal: number;
  maxFocal: number;
  maxAperture: number; // widest (brightest) f-number; for a zoom, the fast end
  macro?: boolean;
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
// The camera catalog — the single source of truth (lib/cameras.catalog.json).
// ---------------------------------------------------------------------------
export const CAMERAS: Camera[] = (cameraCatalog as { cameras: Camera[] }).cameras;

export const getCamera = (id: string): Camera => CAMERAS.find((c) => c.id === id) ?? CAMERAS[0];

// ---------------------------------------------------------------------------
// Focal-length helpers
// ---------------------------------------------------------------------------

// Round a physical focal length to its full-frame equivalent on a given crop.
export const equivFocal = (focal: number, cropFactor: number): number => Math.round(focal * cropFactor);

// Classify a physical focal length into a lens category (macro is handled separately).
export const categoryForFocal = (focal: number): LensCategory => {
  if (focal <= 20) return "ultra-wide";
  if (focal <= 35) return "wide";
  if (focal <= 58) return "normal";
  if (focal <= 105) return "short-tele";
  if (focal <= 300) return "tele";
  return "super-tele";
};

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
//   spec.macro === true     → Details (always), plus the focal rules above
export const FAST = 2.8;

function classifyFocal(equiv: number, aperture: number, out: Set<Genre>): void {
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
}

// Best-fit genres for a lens spec, optionally on a specific body (crop factor applied).
// Without a camera the spec is evaluated as if on full-frame (crop 1.0). Both ends of a
// zoom are weighed (identical for a prime).
export const genresForSpec = (spec: LensSpec, camera?: Camera): Genre[] => {
  const crop = camera ? camera.cropFactor : 1;
  const out = new Set<Genre>();
  if (spec.macro) out.add("Details");
  classifyFocal(equivFocal(spec.minFocal, crop), spec.maxAperture, out);
  classifyFocal(equivFocal(spec.maxFocal, crop), spec.maxAperture, out);
  return [...out];
};

// Genres contributed by a fixed-lens camera's built-in lens (empty for ILC bodies).
// Correct for a fixed ZOOM (e.g. RX100): both ends weighed, macro never assumed.
export const genresForCamera = (camera: Camera): Genre[] => {
  if (!camera.fixedLens) return [];
  return genresForSpec(camera.fixedLens, camera);
};

// Deduped union of every genre a kit can cover: each lens on the body(ies), plus the
// fixed lens of any fixed-lens body.
export const genresForKit = (cameras: Camera[], lenses: LensSpec[]): Genre[] => {
  const out = new Set<Genre>();
  const bodies: (Camera | undefined)[] = cameras.length ? cameras : [undefined];
  for (const spec of lenses) {
    for (const body of bodies) {
      for (const g of genresForSpec(spec, body)) out.add(g);
    }
  }
  for (const camera of cameras) {
    for (const g of genresForCamera(camera)) out.add(g);
  }
  return [...out];
};
