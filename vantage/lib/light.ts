// Light-timing helpers — real golden/blue-hour math via SunCalc (free, offline).
import * as SunCalc from "suncalc";

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

// 0..1 quality: peaks near the horizon, decays as the sun climbs (harsh midday)
// or sinks below into night. This is what gives the ramp-up / ramp-down shape.
function qualityFromAltitude(altDeg: number): number {
  const q = altDeg >= 0
    ? Math.exp(-altDeg / 14)          // day: peak at horizon, falls off as it rises
    : 0.8 * Math.exp(altDeg / 5);     // twilight: ramps down into night
  return Math.max(0.05, Math.min(1, q));
}

// Bars every 30 min across the day (5am–9pm) — fine enough to capture BOTH
// golden peaks and render a smooth ramp.
export function hourlyLight(date: Date, lat: number, lon: number, startHour = 5, endHour = 21): LightBar[] {
  const nowMs = date.getTime();
  const bars: LightBar[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += 30) {
    const t = new Date(date);
    t.setHours(Math.floor(m / 60), m % 60, 0, 0);
    // NOTE: this suncalc build returns altitude in DEGREES already (not radians).
    const altDeg = SunCalc.getPosition(t, lat, lon).altitude;
    bars.push({
      hour: t.getHours(),
      type: typeFromAltitude(altDeg),
      quality: qualityFromAltitude(altDeg),
      isNow: Math.abs(t.getTime() - nowMs) < 15 * 60 * 1000, // within 15 min of now
    });
  }
  return bars;
}
