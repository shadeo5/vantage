// The nudge brain (N1) — "is tonight worth going out to shoot, and where?"
//
// A pure decision function: score every spot for tonight from the signals we
// actually have (light timing + gear fit), pick the best, and decide whether it
// clears the bar to nudge at all. The goal is to INSPIRE, not nag — a weak night
// returns a calm "quiet night" verdict instead of a hyped pick.
//
// HONEST about what it knows: with no weather/events wired yet, "light" scores
// WHEN the good light is (and whether it's already gone), not cloud cover; the
// activity signal is a placeholder (weight 0) marking where events plug in later.
import { SPOTS, Spot } from "./spots";
import { getLightWindows, fmtTime, LightWindows } from "./light";
import { bestLensForGenre, fitLabel, LENS_CHIPS } from "./gearProfile";
import type { Genre } from "./gear";

export type Confidence = "high" | "medium" | "low";
export type NudgeSignal = { key: "light" | "activity" | "gear"; label: string; score: number; detail: string };
export type NudgeVerdict = {
  go: boolean;              // does tonight clear the bar to nudge?
  score: number;            // 0..1 — the winning spot's combined score
  confidence: Confidence;
  spot: Spot;               // the pick (best spot even on a quiet night)
  headline: string;         // the nudge line (or the honest "quiet night" line)
  signals: NudgeSignal[];   // the winning spot's breakdown — feeds "Why this pick?"
};

// Weights: light leads, gear personalizes, activity is not yet factored.
const LIGHT_W = 0.6;
const GEAR_W = 0.4;
const GO_THRESHOLD = 0.55;

// Intrinsic photographic value of each window type.
const BASE_QUALITY: Record<Spot["windowType"], number> = { golden: 1.0, blue: 0.85, flat: 0.55 };

// The window a spot cares about tonight.
function windowFor(spot: Spot, w: LightWindows): { start: Date; end: Date } {
  if (spot.windowType === "blue") return w.blueEvening;
  if (spot.windowType === "golden") return w.goldenEvening;
  return { start: w.goldenMorning.start, end: w.goldenEvening.end }; // flat: usable across daylight
}

// 0..1 by how live the window is: happening now > imminent > later today > gone.
export function lightTiming(now: Date, start: Date, end: Date): number {
  const n = now.getTime();
  if (n >= start.getTime() && n <= end.getTime()) return 1.0; // prime — it's happening
  if (n < start.getTime()) {
    const hoursOut = (start.getTime() - n) / 3.6e6;
    if (hoursOut <= 2) return 0.9;  // imminent
    if (hoursOut <= 6) return 0.6;  // later today
    return 0.45;                    // much later
  }
  return 0.2; // window already passed today
}

// 0..1 gear fit: a dedicated lens for the genre beats the body, which beats a stretch.
export function gearFitScore(cameraId: string, lensIds: string[], genre: Genre): number {
  const best = bestLensForGenre(cameraId, lensIds, genre);
  if (best === null) return 0.35;
  return LENS_CHIPS.some((c) => c.short === best) ? 1.0 : 0.7;
}

type ScoredSpot = { spot: Spot; score: number; signals: NudgeSignal[] };

function scoreSpot(spot: Spot, now: Date, cameraId: string, lensIds: string[]): ScoredSpot {
  const w = getLightWindows(now, spot.lat, spot.lon);
  const win = windowFor(spot, w);
  const timing = lightTiming(now, win.start, win.end);
  const light = BASE_QUALITY[spot.windowType] * timing;
  const gear = gearFitScore(cameraId, lensIds, spot.genre);
  const score = LIGHT_W * light + GEAR_W * gear; // activity weight 0 for now

  const windowLabel = `${spot.windowType === "blue" ? "Blue" : spot.windowType === "golden" ? "Golden" : "Day"} light ${fmtTime(win.start)}–${fmtTime(win.end)}`;
  const timingWord = timing === 1.0 ? "happening now" : now < win.start ? "still ahead" : "already gone today";
  const signals: NudgeSignal[] = [
    { key: "light", label: "Light", score: light, detail: `${windowLabel} — ${timingWord}.` },
    { key: "activity", label: "Activity", score: 0.5, detail: "Live event signal — coming soon." },
    { key: "gear", label: "Your kit", score: gear, detail: `${fitLabel(cameraId, lensIds, spot.genre)}.` },
  ];
  return { spot, score, signals };
}

function confidenceFor(score: number): Confidence {
  if (score >= 0.75) return "high";
  if (score >= GO_THRESHOLD) return "medium";
  return "low";
}

// Decide tonight: rank every spot, pick the best, and say whether to nudge.
export function tonightNudge(now: Date, cameraId: string, lensIds: string[]): NudgeVerdict {
  const scored = SPOTS.map((s) => scoreSpot(s, now, cameraId, lensIds)).sort((a, b) => b.score - a.score);
  const top = scored[0];
  const go = top.score >= GO_THRESHOLD;
  const headline = go
    ? `Great evening to shoot — ${top.spot.name} is calling.`
    : `Quiet one tonight — the best light's behind us. Rest the shutter, or scout for tomorrow.`;
  return {
    go,
    score: top.score,
    confidence: confidenceFor(top.score),
    spot: top.spot,
    headline,
    signals: top.signals,
  };
}
