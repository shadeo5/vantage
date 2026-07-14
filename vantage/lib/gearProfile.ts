// Gear profile — the user's kit as chosen in the Bag screen, and what it can shoot.
// Slice 1: catalog-backed selection + live genre matching. Slice 3: the Today/Lock
// copy reads the kit (naming the lens that actually fits tonight's spot). Persistence
// (on-device storage) is a later slice; for now the profile lives in App state.
import { getCamera, getLens, genresForKit, genresForLens, genresForCamera, type Genre, type Camera } from "./gear";

const SENSOR_LABEL: Record<string, string> = {
  "full-frame": "Full-frame",
  "aps-c": "APS-C",
  "micro-4-3": "Micro 4/3",
  "1-inch": "Compact",
  "medium-format": "Medium format",
};

// Display helpers for the camera picker.
export function cameraLabel(cam: Camera): string {
  return `${cam.brand} ${cam.model}`;
}
export function cameraMeta(cam: Camera): string {
  if (cam.fixedLens) {
    const equiv = Math.round(cam.fixedLens.minFocal * cam.cropFactor);
    return `Fixed ${equiv}mm-equiv · f/${cam.fixedLens.maxAperture}`;
  }
  return `${SENSOR_LABEL[cam.sensorFormat] ?? cam.sensorFormat} · interchangeable`;
}

// The onboarding default camera (matches the body shown in the Bag screen).
export const DEFAULT_CAMERA_ID = "fuji-x100vi";

// The lens chips offered in the Bag screen — a friendly label → a real catalog id.
// `short` is the bare focal used in prose ("grab your 35mm and go").
export const LENS_CHIPS: { id: string; label: string; short: string }[] = [
  { id: "fuji-xf23-2", label: "23mm f/2", short: "23mm" },
  { id: "sony-fe35-18", label: "35mm f/1.8", short: "35mm" },
  { id: "sony-fe50-18", label: "50mm f/1.8", short: "50mm" },
  { id: "sony-fe85-18", label: "85mm f/1.8", short: "85mm" },
  { id: "sony-fe-70-200-28gm2", label: "70–200mm", short: "70–200mm" },
  { id: "sony-fe90-macro", label: "90mm macro", short: "90mm macro" },
];

// A sensible starting kit.
export const DEFAULT_LENS_IDS = ["sony-fe35-18"];

// Genres a kit (one camera + selected lens ids) can cover — the matching engine
// applied to the user's actual selection.
export function kitGenres(cameraId: string, lensIds: string[]): Genre[] {
  return genresForKit([getCamera(cameraId)], lensIds.map(getLens));
}

// A short label for the first selected lens (fallback when nothing fits the spot).
export function primaryLensLabel(lensIds: string[]): string {
  const chip = LENS_CHIPS.find((c) => lensIds.includes(c.id));
  return chip ? chip.short : "35mm";
}

// A short, honest fit label for a spot's genre, e.g. "fits your 35mm" — or, when the
// kit doesn't cover that genre, "a stretch for your kit" (never a false claim).
export function fitLabel(cameraId: string, lensIds: string[], genre: Genre): string {
  const best = bestLensForGenre(cameraId, lensIds, genre);
  return best ? `fits your ${best}` : "a stretch for your kit";
}

// Only the *actionable* half of fitLabel: null when the kit already covers the genre
// (the common case — no need to repeat "fits your 35mm" on every card), and the honest
// "a stretch" note only when there's a real gap worth flagging (#P3).
export function fitGapLabel(cameraId: string, lensIds: string[], genre: Genre): string | null {
  return bestLensForGenre(cameraId, lensIds, genre) ? null : "a stretch for your kit";
}

// From the kit, the label of a lens (or the fixed-lens camera) that actually suits a
// genre — so the app never claims a telephoto is "perfect for street." Null if nothing
// in the kit fits, which the caller turns into honest "your kit's a stretch" copy.
export function bestLensForGenre(cameraId: string, lensIds: string[], genre: Genre): string | null {
  const cam = getCamera(cameraId);
  for (const chip of LENS_CHIPS) {
    if (!lensIds.includes(chip.id)) continue;
    if (genresForLens(getLens(chip.id), cam).includes(genre)) return chip.short;
  }
  // Fall back to the camera's own (fixed) lens, if it covers the genre.
  if (genresForCamera(cam).includes(genre)) return cam.model;
  return null;
}
