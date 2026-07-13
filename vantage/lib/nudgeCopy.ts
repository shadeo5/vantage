// Nudge copy generation (N3) — turns a verdict into a fresh, personal push line.
//
// The brain (lib/nudge.ts) decides WHAT tonight is; this decides how to SAY it so
// it never reads like the same canned alert two nights running. Voice per
// docs/design/VOICE.md: warm, concrete, present tense, inspire — don't nag.
//
// Variety is DETERMINISTIC: a per-day seed picks the phrasing, so copy is fresh
// day-to-day but stable within a day (no jitter on re-render, and testable).
import { NudgeVerdict } from "./nudge";

export type NudgeCopy = { title: string; body: string };

const WINDOW_WORD: Record<NudgeVerdict["window"]["type"], string> = {
  golden: "Golden hour",
  blue: "Blue hour",
  flat: "The light",
};

// Day-of-year (1..366) — the seed that rotates phrasing each evening.
function daySeed(d: Date): number {
  const startOfYear = new Date(d.getFullYear(), 0, 0);
  return Math.floor((d.getTime() - startOfYear.getTime()) / 86_400_000);
}

const pick = <T,>(arr: T[], seed: number): T => arr[((seed % arr.length) + arr.length) % arr.length];

export function nudgeCopy(verdict: NudgeVerdict, gearLens: string, now: Date): NudgeCopy {
  const { spot, confidence, go, window } = verdict;
  const seed = daySeed(now);
  const win = WINDOW_WORD[window.type];
  const at = window.label.split("–")[0]; // just the start time, e.g. "8:13 PM"

  if (!go) {
    const titles = [
      "Quiet one tonight.",
      "Not the night to chase light.",
      "Rest the shutter tonight.",
    ];
    const bodies = [
      `The good light's already behind us — scout ${spot.name} for tomorrow.`,
      `Nothing's quite lining up this evening. ${spot.name} will keep.`,
      `Save it — ${spot.name} wants better light than tonight's got left.`,
    ];
    return { title: pick(titles, seed), body: pick(bodies, seed + 2) };
  }

  const highTitles = [
    `Tonight's the night — ${spot.name} is about to glow.`,
    `Drop what you're doing — ${spot.name} is going to be special.`,
    `${spot.name} is calling, and the light's on your side.`,
  ];
  const medTitles = [
    `Worth heading out — ${spot.name} should be good tonight.`,
    `${spot.name} is a solid bet this evening.`,
    `Keep the ${gearLens} close — ${spot.name} is worth a look tonight.`,
  ];
  const bodies = [
    `${win} hits ${at} and ${spot.name} comes alive. Grab your ${gearLens} — ${spot.distance} away.`,
    `${gearLens} weather at ${spot.name}. ${win} at ${at}, ${spot.distance} out.`,
    `${win} at ${at} — ${spot.name}'s ${spot.distance} away and made for your ${gearLens}.`,
  ];

  const titles = confidence === "high" ? highTitles : medTitles;
  return { title: pick(titles, seed), body: pick(bodies, seed + 1) };
}
