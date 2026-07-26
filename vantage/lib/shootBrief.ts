// The shoot brief (E8 · CB2–CB4) — turn conditions + kit into a constructive plan.
//
// Given tonight's conditions and the photographer's kit: is the gear up for it, and
// what should they shoot? This is the honest answer to a "quiet night" — a gray or dark
// evening stops being a dead end and becomes "shoot this, this way." Pure + testable;
// every line stays IDEAL-FOR, never "your kit can't" (see SHOOT_BRIEF.html §03–04).
import { getCamera, type LensSpec } from "./gear";
import type { Conditions } from "./conditions";
import type { Forecast } from "./weather";
import { conditionsFor } from "./conditions";
import type { Spot } from "./spots";

// --- CB2 · Gear-readiness ---------------------------------------------------------
export type ReadyLevel = "set" | "workable" | "borderline" | "slow" | "fine";
export type Readiness = { level: ReadyLevel; line: string | null; fastest: number };

// The kit's fastest (brightest) f-number — the widest aperture across the body's fixed
// lens (if any) + every selected lens. Lower = better in the dark.
export function fastestAperture(cameraId: string, lenses: LensSpec[]): number {
  const cam = getCamera(cameraId);
  // Fixed-lens body: the built-in IS the kit — ignore any lingering separate lenses.
  if (cam.fixedLens) return cam.fixedLens.maxAperture;
  const fs = lenses.map((spec) => spec.maxAperture);
  return fs.length ? Math.min(...fs) : 4.0; // no data → assume a middling zoom
}

const fmtF = (n: number) => `f/${Number.isInteger(n) ? n : n.toFixed(1)}`;

// Read the kit against the darkness. Only night truly gates on aperture; blue hour gets a
// tripod nudge; daylight has no darkness concern (line null → the UI hides it).
export function kitReadiness(cameraId: string, lenses: LensSpec[], c: Conditions): Readiness {
  const fastest = fastestAperture(cameraId, lenses);
  if (c.phase === "night") {
    if (fastest <= 2.0) return { level: "set", fastest, line: `Your ${fmtF(fastest)} eats the dark — shoot handheld.` };
    if (fastest <= 2.8) return { level: "workable", fastest, line: `${fmtF(fastest)} works — push ISO and lean on lit pockets.` };
    if (fastest <= 4.0) return { level: "borderline", fastest, line: `${fmtF(fastest)} is tight for full dark — steady up, or make the dark the subject.` };
    return { level: "slow", fastest, line: `${fmtF(fastest)} is slow for full dark — catch the last light, bring a tripod, or shoot silhouettes.` };
  }
  if (c.phase === "blue") return { level: "fine", fastest, line: "Plenty of light for now — a tripod opens up the long-exposure cityscape." };
  return { level: "fine", fastest, line: null }; // golden / flat daylight — no darkness worry
}

// --- CB3 · Shot-type guidance -----------------------------------------------------
const OVERCAST = 0.6; // cloud fraction above which "flat" light reads as soft/diffuse

// Condition → a few shot archetypes. Wet weather wins (it's the strongest cue), then the
// light phase, with cloud splitting flat daylight into soft-overcast vs. harsh-clear.
export function shotsFor(c: Conditions): string[] {
  if (c.wet) return [
    "Wet-street reflections — shoot the lights and signs mirrored in the pavement",
    "Umbrellas and color against the gray",
    "Frame from cover — a doorway, an awning — and let the rain be the mood",
  ];
  switch (c.phase) {
    case "night": return [
      "Neon and shop-light reflections — shoot the light sources, not the dark",
      "Fast-glass candids in the lit pockets",
      "Light trails — brace on a rail or a tripod",
    ];
    case "blue": return [
      "Long-exposure cityscape — the sky and the signs balance right now",
      "Silhouettes and window light in doorways",
      "Reflections in glass and standing water",
    ];
    case "golden":
      return c.cloud >= OVERCAST
        ? ["Muted golden — soft warm tones; work color and mood over hard drama", "Even-light portraits while the warmth holds", "Reflections and wet color if the ground is damp"]
        : ["Warm side-lit portraits — the low sun is doing the work", "Long shadows and backlit rim — shoot into the light", "The skyline catching the last warm light"];
    default: // flat / daylight
      return c.cloud >= OVERCAST
        ? ["Even-light street portraits — no harsh shadows, faces read clean", "Saturated color and texture — overcast makes color pop", "Storefronts and details in the soft, shadowless light"]
        : ["Hard-shadow graphic frames — use the contrast, shoot for black and white", "Geometry and shade between the buildings", "Bold high-contrast street — strong light, strong shapes"];
  }
}

// --- CB4 · The composed brief -----------------------------------------------------
export type ShootBrief = {
  conditions: Conditions;
  readiness: Readiness;
  shots: string[];
  rainWarning: string | null; // sealing nudge when rain is likely / falling (D3 warn-first)
};

const RAIN_LIKELY = 0.5; // precipitation probability above which we warn about sealing

// Build the brief for the shoot MOMENT (the spot's window tonight, not "now") — that's
// the light the photographer will actually meet. forecast may be null → light-phase only.
export function shootBrief(windowStart: Date, spot: Spot, cameraId: string, lenses: LensSpec[], forecast?: Forecast | null): ShootBrief {
  const conditions = conditionsFor(windowStart, spot.lat, spot.lon, forecast);
  const rainWarning =
    conditions.wet ? "Rain around go-time — make sure your body and lens are sealed, or pack a cover."
    : conditions.rain >= RAIN_LIKELY ? "Rain likely at go-time — check your kit's weather-sealed, or bring a cover."
    : null;
  return { conditions, readiness: kitReadiness(cameraId, lenses, conditions), shots: shotsFor(conditions), rainWarning };
}
