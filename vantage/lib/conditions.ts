// Conditions (E8 · CB1) — the normalized read the shoot brief consumes.
//
// Folds the three live signals into one shape for a specific moment (a spot's window
// tonight): the light phase (from sun altitude), the sky (cloud), and rain. Everything
// downstream — gear-readiness, shot-type guidance — keys off this, so the inference
// lives in ONE place and stays honest (see SHOOT_BRIEF.html §02).
import { lightPhaseAt, type LightType } from "./light";
import type { Forecast } from "./weather";

export type Phase = LightType; // "golden" | "blue" | "flat" | "night"

export type Conditions = {
  phase: Phase;   // what the light is doing at this moment
  cloud: number;  // 0..1 sky cover (0 clear, 1 overcast)
  rain: number;   // 0..1 precipitation PROBABILITY (drives the seal warning)
  wet: boolean;   // actively precipitating (drives wet-weather shot types)
  dark: boolean;  // blue hour or night — "do we need to worry about light?"
};

// Read the conditions for a moment + place. No forecast → light-phase only, sky assumed
// clear/dry (we never invent bad weather), same fallback discipline as the light chart.
export function conditionsFor(date: Date, lat: number, lon: number, forecast?: Forecast | null): Conditions {
  const phase = lightPhaseAt(date, lat, lon);
  return {
    phase,
    cloud: forecast ? forecast.cloudAt(date) : 0,
    rain: forecast ? forecast.rainAt(date) : 0,
    wet: forecast ? forecast.wetAt(date) : false,
    dark: phase === "blue" || phase === "night",
  };
}
