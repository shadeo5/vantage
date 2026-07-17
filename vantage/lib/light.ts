// Light-timing helpers — real golden/blue-hour math via SunCalc (free, offline).
import * as SunCalc from "suncalc";
import { cloudFactor, type Forecast } from "./weather";

export type LightWindows = {
  goldenEvening: { start: Date; end: Date };
  blueEvening: { start: Date; end: Date };
  goldenMorning: { start: Date; end: Date };
  sunset: Date;
};

export function getLightWindows(date: Date, lat: number, lon: number): LightWindows {
  // At non-polar latitudes (e.g. Atlanta) these are always defined.
  const t = SunCalc.getTimes(date, lat, lon) as Record<string, Date>;
  return {
    goldenEvening: { start: t.goldenHour, end: t.sunsetStart },
    blueEvening: { start: t.sunset, end: t.dusk },
    goldenMorning: { start: t.sunrise, end: t.goldenHourEnd },
    sunset: t.sunset,
  };
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

// Countdown string to the next golden hour (evening today, else morning).
export function goldenCountdown(now: Date, w: LightWindows): { label: string; at: Date } {
  let at = w.goldenEvening.start;
  if (at.getTime() <= now.getTime()) at = w.goldenMorning.start;
  const ms = Math.max(0, at.getTime() - now.getTime());
  const h = Math.floor(ms / 3.6e6);
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return { label: `${h}h ${m}m`, at };
}

// The classic "best light" window shown on each area card.
export function goldenWindowLabel(w: LightWindows): string {
  return `${fmtTime(w.goldenEvening.start)}–${fmtTime(w.goldenEvening.end)}`;
}

// --- Hourly light-quality curve for the detail chart ----------------------
// Driven by the sun's ALTITUDE (degrees above the horizon) each hour, so the
// chart RAMPS up to a golden-hour peak and back down — a real curve, not flat
// category blocks. Color = light type; bar height = photographic quality.
export type LightType = "golden" | "blue" | "flat" | "night";
export type LightBar = { hour: number; type: LightType; quality: number; isNow: boolean };

function typeFromAltitude(altDeg: number): LightType {
  if (altDeg > 6) return "flat";     // sun high — harsh, flat overhead light
  if (altDeg >= 0) return "golden";  // 0–6° — warm, low-angle golden hour
  if (altDeg >= -6) return "blue";   // civil twilight — blue hour
  return "night";
}

// The light phase at a specific moment — the conditions/shoot-brief layer keys off
// this ("is it dark enough to need fast glass?", "golden or flat right now?").
export function lightPhaseAt(date: Date, lat: number, lon: number): LightType {
  return typeFromAltitude(SunCalc.getPosition(date, lat, lon).altitude);
}

// 0..1 quality: peaks near the horizon, decays as the sun climbs (harsh midday)
// or sinks below into night. This is what gives the ramp-up / ramp-down shape.
function qualityFromAltitude(altDeg: number): number {
  const q = altDeg >= 0
    ? Math.exp(-altDeg / 14)          // day: peak at horizon, falls off as it rises
    : 0.8 * Math.exp(altDeg / 5);     // twilight: ramps down into night
  return Math.max(0.05, Math.min(1, q));
}

// Bars every 30 min across the day (5am–9pm) — fine enough to capture BOTH
// golden peaks and render a smooth ramp. When a cloud forecast is supplied, each bar's
// quality is tempered by the sky (overcast knocks golden/blue down; flat is left alone) —
// so the chart shows the light you'll ACTUALLY get, not just the astronomical ideal.
export function hourlyLight(date: Date, lat: number, lon: number, cloud?: Forecast | null, startHour = 5, endHour = 21): LightBar[] {
  const nowMs = date.getTime();
  const bars: LightBar[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += 30) {
    const t = new Date(date);
    t.setHours(Math.floor(m / 60), m % 60, 0, 0);
    // NOTE: this suncalc build returns altitude in DEGREES already (not radians).
    const altDeg = SunCalc.getPosition(t, lat, lon).altitude;
    const type = typeFromAltitude(altDeg);
    const base = qualityFromAltitude(altDeg);
    const q = cloud ? Math.max(0.05, Math.min(1, base * cloudFactor(cloud.cloudAt(t), type))) : base;
    bars.push({
      hour: t.getHours(),
      type,
      quality: q,
      isNow: Math.abs(t.getTime() - nowMs) < 15 * 60 * 1000, // within 15 min of now
    });
  }
  return bars;
}

// --- Phase-honest light read (E9 · PH2) -----------------------------------------
// The one place that turns "what's the light doing right now" into COPY — consumed by
// the Today hero, the detail light strip, and (later) the push. The rule (VOICE.md,
// "Light is an asset, never a miss"): name the light you HAVE as something to shoot
// with; if a better window is still catchable today, surface it with a countdown
// ALONGSIDE — never mourn a window that's passed. Flat light is first-class: hard light
// for graphic frames (clear) / soft even light (overcast), not a lesser light to wait out.
const OVERCAST = 0.6; // cloud fraction above which flat light reads as soft/diffuse (matches shootBrief)

export type LightRead = {
  phase: LightType;      // golden | blue | flat | night — the light right now
  icon: string;          // chip glyph
  chipLabel: string;     // hero chip: "Golden till 8:40 PM" | "Blue till 9:14 PM" | "Hard light" | "Soft light" | "Night"
  heroPhrase: string;    // positive present clause for the hero lede
  stripMain: string;     // light-strip headline: "Golden hour" | "Blue hour" | "Hard light" | "Soft even light" | "Night — yours"
  stripSub: string | null; // strip sub-line: "till 8:40 PM" | "golden in 31m" | "next golden 6:31a"
};

// Compact clock like "6:31a" / "8:05p" — used for the night morning-peek sub.
function fmtCompact(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h < 12 ? "a" : "p";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")}${ap}`;
}

// "31m" / "1h 12m" — how far out a still-catchable window is.
function relLabel(now: Date, at: Date): string {
  const m = Math.max(0, Math.round((at.getTime() - now.getTime()) / 60000));
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export function lightRead(now: Date, lat: number, lon: number, forecast?: Forecast | null): LightRead {
  const w = getLightWindows(now, lat, lon);
  const phase = lightPhaseAt(now, lat, lon);
  const cloud = forecast ? forecast.cloudAt(now) : 0;

  if (phase === "golden") {
    // End of the golden window we're actually in (morning vs evening).
    const inMorning = now >= w.goldenMorning.start && now <= w.goldenMorning.end;
    const end = inMorning ? w.goldenMorning.end : w.goldenEvening.end;
    return {
      phase, icon: "☀",
      chipLabel: `Golden till ${fmtTime(end)}`,
      heroPhrase: `Golden hour's on till ${fmtTime(end)}`,
      stripMain: "Golden hour", stripSub: `till ${fmtTime(end)}`,
    };
  }

  if (phase === "blue") {
    const end = w.blueEvening.end;
    return {
      phase, icon: "☽",
      chipLabel: `Blue till ${fmtTime(end)}`,
      heroPhrase: `Blue hour's holding till ${fmtTime(end)}`,
      stripMain: "Blue hour", stripSub: `till ${fmtTime(end)}`,
    };
  }

  if (phase === "flat") {
    // Golden is still ahead today whenever it's flat daylight — always advertise it,
    // riding alongside the current light, never as "wait for golden".
    const goldenAhead = w.goldenEvening.start.getTime() > now.getTime() ? w.goldenEvening.start : null;
    const soft = cloud >= OVERCAST;
    return {
      phase, icon: "☁",
      chipLabel: soft ? "Soft light" : "Hard light",
      heroPhrase: soft ? "Soft, even light out right now" : "Hard light out for graphic frames",
      stripMain: soft ? "Soft even light" : "Hard light",
      stripSub: goldenAhead ? `golden in ${relLabel(now, goldenAhead)}` : (soft ? "color pops" : "shoot the shadows"),
    };
  }

  // night — affirm it; peek at the next golden (today's dawn if pre-sunrise, else tomorrow's).
  const tmr = new Date(now); tmr.setDate(now.getDate() + 1);
  const nextGolden = w.goldenMorning.start.getTime() > now.getTime()
    ? w.goldenMorning.start
    : getLightWindows(tmr, lat, lon).goldenMorning.start;
  return {
    phase, icon: "☾",
    chipLabel: "Night",
    heroPhrase: "The city's lit and yours",
    stripMain: "Night — yours", stripSub: `next golden ${fmtCompact(nextGolden)}`,
  };
}

// The light-strip data (PH4): a slim forward sparkline anchored at now. Daytime/blue/
// golden look 6h ahead (the ramp you can still catch); full night shows a small peek of
// tomorrow's dawn ramp instead of a flat-dark chart (which would just read "nothing").
export function forwardLight(now: Date, lat: number, lon: number, cloud?: Forecast | null, hours = 6): LightBar[] {
  const start = new Date(now);
  start.setMinutes(now.getMinutes() < 30 ? 0 : 30, 0, 0); // anchor "now" on the current half-hour
  const steps = Math.round((hours * 60) / 30);
  const bars: LightBar[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = new Date(start.getTime() + i * 30 * 60000);
    const altDeg = SunCalc.getPosition(t, lat, lon).altitude;
    const type = typeFromAltitude(altDeg);
    const base = qualityFromAltitude(altDeg);
    const q = cloud ? Math.max(0.05, Math.min(1, base * cloudFactor(cloud.cloudAt(t), type))) : base;
    bars.push({ hour: t.getHours(), type, quality: q, isNow: i === 0 });
  }
  return bars;
}

// Tomorrow's dawn ramp (night → golden), for the full-night morning peek.
export function morningPeek(now: Date, lat: number, lon: number, cloud?: Forecast | null): LightBar[] {
  const tmr = new Date(now); tmr.setDate(now.getDate() + 1);
  const w = getLightWindows(tmr, lat, lon);
  const startT = new Date(w.goldenMorning.start.getTime() - 40 * 60000); // goldenMorning.start = sunrise
  const bars: LightBar[] = [];
  for (let i = 0; i < 8; i++) {
    const t = new Date(startT.getTime() + i * 18 * 60000);
    const altDeg = SunCalc.getPosition(t, lat, lon).altitude;
    const type = typeFromAltitude(altDeg);
    const base = qualityFromAltitude(altDeg);
    const q = cloud ? Math.max(0.05, Math.min(1, base * cloudFactor(cloud.cloudAt(t), type))) : base;
    bars.push({ hour: t.getHours(), type, quality: q, isNow: false });
  }
  return bars;
}

export type LightStripModel = { read: LightRead; bars: LightBar[]; night: boolean };

// Everything the detail light strip needs: the phase-honest copy + the right sparkline.
export function lightStripModel(now: Date, lat: number, lon: number, forecast?: Forecast | null): LightStripModel {
  const read = lightRead(now, lat, lon, forecast);
  const night = read.phase === "night";
  const bars = night ? morningPeek(now, lat, lon, forecast) : forwardLight(now, lat, lon, forecast, 6);
  return { read, bars, night };
}
