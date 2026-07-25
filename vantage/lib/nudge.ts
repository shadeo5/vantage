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
//
// ⚠ MIRRORED IN THE NIGHTLY PUSH. The scoring weights/thresholds/curves below are also
// hand-written in supabase/functions/nudge/index.ts (Deno) so the push matches the app.
// If you change a weight, the go bar, REF_FIT, LIGHT_SENSITIVITY, cloudFactor, or the
// lightTiming buckets, change BOTH files — __tests__/parity.test.ts fails if they drift.
import { Spot } from "./spots";
import { getLightWindows, fmtTime, lightPhaseAt, LightWindows } from "./light";
import { fastestAperture } from "./shootBrief";
import { bestLensForGenre, fitLabel, LENS_CHIPS } from "./gearProfile";
import { cloudFactor, skyLabel, type Forecast } from "./weather";
import type { Genre } from "./gear";
import type { JournalEntry } from "./journal";
import { type Opportunity, isLive, eventWindow, eventToSpot } from "./events";

export type Confidence = "high" | "medium" | "low";
export type NudgeSignal = { key: "light" | "activity" | "gear"; label: string; score: number; detail: string };
export type NudgeVerdict = {
  go: boolean;              // does tonight clear the bar to nudge?
  score: number;            // 0..1 — the winning spot's combined score
  confidence: Confidence;
  spot: Spot;               // the pick (best spot even on a quiet night). For an event
                            // takeover this is the event adapted to a Spot (rides the hero).
  event?: Opportunity;      // set when a LIVE event took the headline (the eclipse rule)
  signals: NudgeSignal[];   // the winning spot's breakdown — feeds "Why this pick?"
  window: { label: string; start: Date; type: Spot["windowType"] }; // tonight's window, for copy
};

// Weights: light leads, gear personalizes, activity is not yet factored.
const LIGHT_W = 0.6;
const GEAR_W = 0.4;
const GO_THRESHOLD = 0.55;

// --- Genre-dependent light quality (ADR: LIGHT_QUALITY_GENRE.html · CB7) -----------
// Light is a set of creative MODES, not a good/bad ladder — and how much the window type
// gates a shoot depends on the GENRE. REF_FIT is the reference "phase fit" for a fully
// light-sensitive genre (landscape): golden > blue > flat. LIGHT_SENSITIVITY then blends
// each genre toward neutral — landscape lives and dies by golden/blue light; street is
// light-flexible (harsh/flat is a mode, per Fan Ho / Metzker / DPS "any light"), so flat
// barely dents it. Low, NOT zero — color/light-forward street still times light (Webb).
// Grounded in docs/engineering/LIGHT_GENRE_RESEARCH.md; the numbers are calibration.
const REF_FIT: Record<Spot["windowType"], number> = { golden: 1.0, blue: 0.85, flat: 0.55 };
const LIGHT_SENSITIVITY: Record<Genre, number> = {
  Landscape: 0.9, Wildlife: 0.65, Architecture: 0.7, Nature: 0.6,
  Portraits: 0.5, Details: 0.4, Sports: 0.3, Street: 0.15,
};

// phaseScore ∈ [REF_FIT[windowType], 1]. Insensitive genre (street) → near 1 in any light;
// sensitive genre (landscape) → golden ≫ flat. phaseScore = 1 − sensitivity·(1 − REF_FIT).
export function phaseScore(genre: Genre, windowType: Spot["windowType"]): number {
  const s = LIGHT_SENSITIVITY[genre] ?? 0.5;
  return 1 - s * (1 - REF_FIT[windowType]);
}

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

type ScoredSpot = { spot: Spot; score: number; signals: NudgeSignal[]; win: { start: Date; end: Date } };

function scoreSpot(spot: Spot, now: Date, cameraId: string, lensIds: string[], cloud?: Forecast | null): ScoredSpot {
  const w = getLightWindows(now, spot.lat, spot.lon);
  const win = windowFor(spot, w);
  const timing = lightTiming(now, win.start, win.end);
  // Weather tempers the light HONESTLY: overcast knocks golden/blue down, leaves flat
  // (soft-daylight) shooting alone. No forecast → astronomical-only (factor 1).
  const sky = cloud ? cloud.cloudAt(win.start) : null;
  const weather = sky === null ? 1 : cloudFactor(sky, spot.windowType);
  // Light quality is genre-dependent (CB7): a flat-light street spot isn't down-ranked
  // the way a flat-light landscape spot is. weather (current sky) and phaseScore (the
  // genre's inherent light-dependence) are orthogonal — no double-count.
  const light = phaseScore(spot.genre, spot.windowType) * timing * weather;
  const gear = gearFitScore(cameraId, lensIds, spot.genre);
  const score = LIGHT_W * light + GEAR_W * gear; // activity weight 0 for now

  const windowLabel = `${spot.windowType === "blue" ? "Blue" : spot.windowType === "golden" ? "Golden" : "Day"} light ${fmtTime(win.start)}–${fmtTime(win.end)}`;
  const timingWord = timing === 1.0 ? "happening now" : now < win.start ? "still ahead" : "already gone today";
  const skyWord = sky === null ? "" : ` · ${skyLabel(sky)}`;
  const signals: NudgeSignal[] = [
    { key: "light", label: "Light", score: light, detail: `${windowLabel} — ${timingWord}${skyWord}.` },
    // Activity (live events) is not built yet — omit the row rather than show a
    // "coming soon" IOU on the app's most persuasive moment (#T3). Re-add an
    // { key: "activity", … } entry here once events land (weight is still 0 above).
    { key: "gear", label: "Your kit", score: gear, detail: `${fitLabel(cameraId, lensIds, spot.genre)}.` },
  ];
  return { spot, score, signals, win };
}

// --- Variety (so Today doesn't headline the same spot every night) --------------
// Two honest nudges reshape the ORDER without overriding real quality:
//  • a per-day rotation that reshuffles spots of comparable score. Many spots tie —
//    every golden spot scores the same at the same hour — so this alone rotates the
//    pick day-to-day instead of always taking the first in array order; and
//  • a recency penalty for a spot you just SHOT (from the journal): you were there, so
//    it steps aside for something fresh, decaying back over a few days.
// Both are bounded and never gate a spot out on quality — they only reorder within a
// band, and the "is tonight worth it?" verdict still reads off the real (base) score.
const VARIETY_W = 0.10;   // max day-rotation bump — only swaps near-ties, never beats a clearly better night
const RECENCY_W = 0.18;   // penalty for a just-shot spot (> VARIETY_W, so it always yields to an equal fresh one)
const RECENCY_DAYS = 4;   // ...decaying to zero over this many days

// A day's headline pick, logged on-device (persisted by lib/shownStorage) so the picker
// can avoid repeating the same hero — see the anti-repeat rule below.
export type ShownEntry = { spotId: string; at: string }; // at = ISO time it was headlined
export type NudgeOpts = { journal?: JournalEntry[]; cloud?: Forecast | null; shownLog?: ShownEntry[]; events?: Opportunity[] };

// --- Event takeover (B4 · the eclipse rule) --------------------------------------
// A LIVE event ("here now, gone next week") can outrank an evergreen spot for the
// headline. Its score = the same light×gear fit (via the Spot adapter) PLUS a
// timeliness/scarcity boost by magnitude — that transience is exactly what makes a
// great nudge. This isn't a hardcoded "events beat spots": a low-draw event with poor
// fit can still lose to a strong spot. Only fires while now is inside the event window.
const EVENT_MAGNITUDE_W: Record<Opportunity["magnitude"], number> = { high: 0.45, medium: 0.28, low: 0.15 };

function scoreEvent(ev: Opportunity, pack: Spot[], now: Date, cameraId: string, lensIds: string[], cloud?: Forecast | null) {
  const adapted = eventToSpot(ev, pack);
  const ss = scoreSpot(adapted, now, cameraId, lensIds, cloud);
  const score = Math.min(1, ss.score + EVENT_MAGNITUDE_W[ev.magnitude]); // scarcity boost, capped
  return { adapted, ev, ss, score };
}

// --- Anti-repeat (ADR HERO_ANTI_REPEAT) -----------------------------------------
// The variety knobs above (day-shuffle + shot-recency) can't dislodge a PERMANENT
// frontrunner: an always-on flat-light street spot scores ~0.96 all day and only loses
// during golden/blue hour, so any daytime check headlines the same spot — its lead
// exceeds the ±0.10 shuffle, and you never SHOT it so the recency penalty never fires.
// The fix is a RULE, not a nudge: don't headline a spot we already headlined in the last
// couple days *as long as another spot still clears the go bar* (else it's an honest
// quiet-night repeat). Only PRIOR calendar days count — today's own record (written when
// we show it) never disqualifies it, so the pick is stable within a day and there's no
// feedback loop with recording.
const HERO_COOLDOWN_DAYS = 2;

function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Was this spot headlined on a prior calendar day within the cooldown window?
function headlinedRecently(spotId: string, now: Date, shownLog?: ShownEntry[], cooldownDays = HERO_COOLDOWN_DAYS): boolean {
  if (!shownLog?.length) return false;
  const today = localMidnight(now);
  for (const e of shownLog) {
    if (e.spotId !== spotId) continue;
    const dayDiff = Math.round((today - localMidnight(new Date(e.at))) / 86_400_000);
    if (dayDiff >= 1 && dayDiff <= cooldownDays) return true; // a previous day, still cooling down
  }
  return false;
}

// Day-of-year seed — rotates the order each evening, stable within a day (matches nudgeCopy).
function daySeed(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - startOfYear.getTime()) / 86_400_000);
}

// Stable string hash → [0,1). Deterministic per (spot, day), so re-renders don't jitter.
function hash01(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

// Penalty (0..RECENCY_W) for a spot shot recently, decaying to zero over RECENCY_DAYS.
function recencyPenalty(spotId: string, now: Date, journal?: JournalEntry[]): number {
  if (!journal?.length) return 0;
  let mostRecent = -Infinity;
  for (const j of journal) if (j.went && j.spotId === spotId) mostRecent = Math.max(mostRecent, new Date(j.at).getTime());
  if (mostRecent === -Infinity) return 0;
  const days = (now.getTime() - mostRecent) / 86_400_000;
  if (days < 0 || days >= RECENCY_DAYS) return 0;
  return RECENCY_W * (1 - days / RECENCY_DAYS);
}

// The RANKING score: real quality, reshuffled by day-rotation minus recency. Quality
// gates still read the base score — this only decides ORDER among worth-showing spots.
function varietyRank(base: number, spot: Spot, now: Date, opts?: NudgeOpts): number {
  return base - recencyPenalty(spot.id, now, opts?.journal) + VARIETY_W * hash01(`${spot.id}:${daySeed(now)}`);
}

function confidenceFor(score: number): Confidence {
  if (score >= 0.75) return "high";
  if (score >= GO_THRESHOLD) return "medium";
  return "low";
}

// Today shows one hero + a short "best near you" list. We CAP that list rather than
// dumping the whole ranked pack: too many options dilute the pick, imply a precision
// the light×gear signal doesn't have past the top few, and turn an inspiration
// surface back into a directory. The cap is a single knob so it's easy to tune and
// so any future surface inherits the same rule.
export const MAX_NEAR_YOU = 4;

// The "best near you" alternates: ranked spots that each clear the go bar on their
// own (a QUALITY GATE — so every spot shown is genuinely worth it, and a quiet night
// honestly shows fewer or none rather than padding to a fixed count), excluding the
// hero, capped at MAX_NEAR_YOU.
export function bestNearYou(spots: Spot[], now: Date, cameraId: string, lensIds: string[], exclude: string | string[], opts?: NudgeOpts): Spot[] {
  const excluded = new Set(Array.isArray(exclude) ? exclude : [exclude]); // hero + any eclipsed venue
  return spots
    .map((s) => { const ss = scoreSpot(s, now, cameraId, lensIds, opts?.cloud); return { spot: s, base: ss.score, rank: varietyRank(ss.score, s, now, opts) }; })
    .filter((s) => !excluded.has(s.spot.id) && s.base >= GO_THRESHOLD) // gate on real quality
    .sort((a, b) => b.rank - a.rank)                                  // order by the variety-aware rank
    .slice(0, MAX_NEAR_YOU)
    .map((s) => s.spot);
}

// --- "Good in the dark" (E9 · PH5) ----------------------------------------------
// The quiet-night answer: when "best near you" comes back empty (the go bar isn't met),
// don't leave the screen blank — surface evergreen spots that genuinely SHINE after
// sunset (bridges for light-trails, neon tunnels, lit skylines), ordered by what the kit
// can handle in the dark. This is a SEPARATE, explicitly-labeled shelf — it never pads
// the quality-gated "best near you" list; it only appears once it's actually dark out.

// How well a spot reads after dark, independent of light-timing: a blue-hour/night spot
// is made for it; cityscape/street thrive on lit signs, trails, neon; open nature/
// landscape mostly doesn't (nothing to light). 0..1.
function nightScore(spot: Spot): number {
  if (spot.windowType === "blue") return 1.0;      // explicitly a blue-hour / after-dark spot
  if (spot.genre === "Architecture") return 0.85;  // skylines, bridges — trails + lit towers
  if (spot.genre === "Street") return 0.7;         // neon, lit pockets, wet-street color
  return 0.35;                                     // meadows/landscape have little to work with
}

const NIGHT_BAR = 0.7; // a spot must clear this night-fit to make the shelf

// Evergreen after-dark spots, gated by kit + ordered by night-fit. Empty unless it's
// actually dark at the pack's location (so it never shows in daylight).
export function goodInTheDark(spots: Spot[], now: Date, cameraId: string, lensIds: string[], excludeId: string, opts?: NudgeOpts): Spot[] {
  const anchor = spots[0];
  if (!anchor) return [];
  const phase = lightPhaseAt(now, anchor.lat, anchor.lon);
  if (phase !== "night" && phase !== "blue") return []; // only "in the dark"
  // Faster glass → the kit handles the dark better, so it surfaces the best-matched first.
  const fastest = fastestAperture(cameraId, lensIds);
  const kitFactor = fastest <= 2.8 ? 1 : fastest <= 4 ? 0.92 : 0.85;
  return spots
    .filter((s) => s.id !== excludeId)
    .map((s) => ({ s, night: nightScore(s) }))
    .filter((x) => x.night >= NIGHT_BAR)
    .map((x) => ({
      s: x.s,
      rank: x.night * kitFactor + VARIETY_W * hash01(`${x.s.id}:${daySeed(now)}:dark`) - recencyPenalty(x.s.id, now, opts?.journal),
    }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, MAX_NEAR_YOU)
    .map((x) => x.s);
}

// Decide tonight: rank every spot, pick the best, and say whether to nudge.
export function tonightNudge(spots: Spot[], now: Date, cameraId: string, lensIds: string[], opts?: NudgeOpts): NudgeVerdict {
  const scored = spots
    .map((s) => { const ss = scoreSpot(s, now, cameraId, lensIds, opts?.cloud); return { ss, rank: varietyRank(ss.score, s, now, opts) }; })
    .sort((a, b) => b.rank - a.rank);
  // Anti-repeat: take the top spot we did NOT headline in the last couple days — but only
  // among spots that genuinely clear the go bar. If every worth-it spot is on cooldown (or
  // it's a quiet night with none), fall back to the plain top — an honest repeat, not invented.
  const fresh = scored.find((s) => s.ss.score >= GO_THRESHOLD && !headlinedRecently(s.ss.spot.id, now, opts?.shownLog));
  const top = (fresh ?? scored[0]).ss;

  // Event takeover (eclipse rule): if a LIVE event outscores the best spot, it headlines.
  // Its adapted Spot rides the existing hero/brief/detail; verdict.event flags it as an event.
  const live = (opts?.events ?? []).filter((e) => isLive(e, now));
  let best: ReturnType<typeof scoreEvent> | null = null;
  for (const ev of live) {
    const c = scoreEvent(ev, spots, now, cameraId, lensIds, opts?.cloud);
    if (!best || c.score > best.score) best = c;
  }
  if (best && best.score > top.score) {
    const ev = best.ev;
    const w = eventWindow(ev);
    const signals: NudgeSignal[] = [
      { key: "activity", label: "Happening", score: 1, detail: `${ev.eventType} — on now.` },
      ...best.ss.signals.filter((s) => s.key !== "activity"), // keep the light + gear rows
    ];
    return {
      go: true,
      score: best.score,
      confidence: confidenceFor(best.score),
      spot: best.adapted,
      event: ev,
      signals,
      window: { label: `${fmtTime(w.start)}–${fmtTime(w.end)}`, start: w.start, type: ev.windowType },
    };
  }

  const go = top.score >= GO_THRESHOLD; // "worth going out?" reads off REAL quality, not variety
  return {
    go,
    score: top.score,
    confidence: confidenceFor(top.score),
    spot: top.spot,
    signals: top.signals,
    window: {
      label: `${fmtTime(top.win.start)}–${fmtTime(top.win.end)}`,
      start: top.win.start,
      type: top.spot.windowType,
    },
  };
}
