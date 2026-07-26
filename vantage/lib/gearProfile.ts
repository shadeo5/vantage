// Gear profile — the user's kit (one camera + generic lenses) and what it can shoot.
//
// Lenses are GENERIC descriptors (LensSpec: focal + aperture), not catalog ids — a
// quick-pick preset and the "+ Add a lens" custom entry both just produce a LensSpec, so
// any lens is expressible. A FIXED-LENS body (X100, Q, RX1) has no separate lenses: its
// built-in lens is the kit, and the UI hides the lens picker for it.
import {
  getCamera,
  genresForKit,
  genresForSpec,
  genresForCamera,
  equivFocal,
  type Genre,
  type Camera,
  type LensSpec,
} from "./gear";

const SENSOR_LABEL: Record<string, string> = {
  "full-frame": "Full-frame",
  "aps-c": "APS-C",
  "micro-4-3": "Micro 4/3",
  "1-inch": "Compact",
  "medium-format": "Medium format",
};

// The onboarding default camera (a fixed-lens X100VI → its built-in lens IS the kit, so
// no separate default lenses).
export const DEFAULT_CAMERA_ID = "fuji-x100vi";
export const DEFAULT_LENSES: LensSpec[] = [];

// Generic lens quick-picks — a bare focal + a sensible representative aperture. No brands;
// the "+ Add a lens" custom entry covers anything these miss.
export const LENS_PRESETS: { label: string; spec: LensSpec }[] = [
  { label: "24mm", spec: { minFocal: 24, maxFocal: 24, maxAperture: 2.8 } },
  { label: "35mm", spec: { minFocal: 35, maxFocal: 35, maxAperture: 1.8 } },
  { label: "50mm", spec: { minFocal: 50, maxFocal: 50, maxAperture: 1.8 } },
  { label: "85mm", spec: { minFocal: 85, maxFocal: 85, maxAperture: 1.8 } },
  { label: "135mm", spec: { minFocal: 135, maxFocal: 135, maxAperture: 2.0 } },
  { label: "24–70mm", spec: { minFocal: 24, maxFocal: 70, maxAperture: 2.8 } },
  { label: "70–200mm", spec: { minFocal: 70, maxFocal: 200, maxAperture: 2.8 } },
  { label: "100mm macro", spec: { minFocal: 100, maxFocal: 100, maxAperture: 2.8, macro: true } },
];

// A stable identity for a spec — for de-dupe + toggling selection in the UI/storage.
export const specKey = (s: LensSpec): string => `${s.minFocal}-${s.maxFocal}-${s.maxAperture}-${s.macro ? 1 : 0}`;

// A short prose label for a lens spec ("35mm", "70–200mm", "100mm macro").
export function lensLabel(spec: LensSpec): string {
  const base = spec.minFocal === spec.maxFocal ? `${spec.minFocal}mm` : `${spec.minFocal}–${spec.maxFocal}mm`;
  return spec.macro ? `${base} macro` : base;
}

// The built-in lens of a fixed-lens body, as a ff-equivalent focal label ("28mm",
// "24–69mm") — the honest focal, never the model name.
export function fixedLensLabel(cam: Camera): string {
  if (!cam.fixedLens) return "";
  const lo = equivFocal(cam.fixedLens.minFocal, cam.cropFactor);
  const hi = equivFocal(cam.fixedLens.maxFocal, cam.cropFactor);
  return lo === hi ? `${lo}mm` : `${lo}–${hi}mm`;
}

// Display helpers for the camera picker.
export function cameraLabel(cam: Camera): string {
  return `${cam.brand} ${cam.model}`;
}
export function cameraMeta(cam: Camera): string {
  if (cam.fixedLens) return `Fixed ${fixedLensLabel(cam)} · f/${cam.fixedLens.maxAperture}`;
  return `${SENSOR_LABEL[cam.sensorFormat] ?? cam.sensorFormat} · interchangeable`;
}

// Genres a kit (one camera + its generic lenses) can cover — the matcher on the real kit.
// A fixed-lens body's kit IS its built-in lens: separate lenses (perhaps lingering from a
// previous ILC selection) don't physically apply, so they must not pollute the coverage.
export function kitGenres(cameraId: string, lenses: LensSpec[]): Genre[] {
  const cam = getCamera(cameraId);
  return genresForKit([cam], cam.fixedLens ? [] : lenses);
}

// A short label for the kit's primary lens — the fixed built-in for a compact, else the
// first selected lens; honest "your lens" when an ILC has none (never a fake "35mm").
export function primaryLensLabel(cameraId: string, lenses: LensSpec[]): string {
  const cam = getCamera(cameraId);
  if (cam.fixedLens) return fixedLensLabel(cam);
  if (lenses.length) return lensLabel(lenses[0]);
  return "lens"; // ILC with no lens yet — reads right in "bring your {lens}" copy (never "your your lens")
}

// The label of a lens in the kit that actually suits a genre — so the app never claims a
// telephoto is "perfect for street." A fixed-lens body offers only its built-in lens.
// Null when nothing in the kit fits (the caller turns that into honest copy).
export function bestLensForGenre(cameraId: string, lenses: LensSpec[], genre: Genre): string | null {
  const cam = getCamera(cameraId);
  if (cam.fixedLens) {
    return genresForCamera(cam).includes(genre) ? fixedLensLabel(cam) : null;
  }
  for (const spec of lenses) {
    if (genresForSpec(spec, cam).includes(genre)) return lensLabel(spec);
  }
  return null;
}

// A short, honest fit label for a spot's genre ("fits your 35mm") — or a positive
// optional-upgrade note (never "you can't shoot this").
export function fitLabel(cameraId: string, lenses: LensSpec[], genre: Genre): string {
  const best = bestLensForGenre(cameraId, lenses, genre);
  return best ? `fits your ${best}` : "a longer lens would shine here";
}

// Only the *actionable* half of fitLabel: null when the kit already suits the genre,
// so the note only appears on a real gap (#P3).
export function fitGapLabel(cameraId: string, lenses: LensSpec[], genre: Genre): string | null {
  return bestLensForGenre(cameraId, lenses, genre) ? null : "a longer lens would shine here";
}
