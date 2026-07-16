// Weather (P3) — cloud cover tempers the light, honestly.
//
// The light math (lib/light.ts) is astronomical: it knows WHEN golden hour is, not
// whether the sky is clear. Golden hour under heavy overcast is worthless — so we pull
// hourly cloud cover from Open-Meteo (free, no key) and use it to knock down the light
// quality where cloud actually hurts.
//
// The honest model — clouds are NOT uniformly bad:
//  • golden / blue hour is the warm, low-angle light that cloud on the horizon blocks →
//    heavy overcast tempers it hard (down to ~0.4, never 0 — there's still soft light
//    and a dramatic sky).
//  • flat daylight (harsh midday) is neutral-to-BETTER under cloud — overcast is the
//    classic even, soft light for street/portrait work — so we barely touch it.
// And because the API gives a single cloud-% (can't tell thin-high from thick-low), we
// never REWARD cloud on golden light: monotonic, flat-topped decay. Honest about what
// it actually knows, same as the rest of the nudge brain.
import type { LightType } from "./light";

export type CloudCover = {
  // Cloud fraction 0..1 at a given moment (nearest forecast hour). 0 = clear, 1 = overcast.
  at(date: Date): number;
  fetchedAt: number;
};

// Local-hour key "YYYY-MM-DDTHH" — matches Open-Meteo's iso8601 hourly.time strings when
// queried with timezone=auto (the forecast is in the LOCATION's tz). The app pins to one
// city at a time, so device-tz and location-tz line up in practice; cross-tz is a known
// simplification (the light windows share it — both derive from the device clock).
function hourKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}`;
}

// Pull hourly cloud cover for today + tomorrow (late windows spill past midnight). Returns
// null on ANY failure — the caller degrades to astronomical-only light, never blank
// (same best-effort pattern as cityPack / gearStorage).
export async function fetchCloudCover(lat: number, lon: number): Promise<CloudCover | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&hourly=cloud_cover&timezone=auto&forecast_days=2`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { hourly?: { time?: string[]; cloud_cover?: number[] } };
    const times = json.hourly?.time;
    const cover = json.hourly?.cloud_cover;
    if (!times?.length || !cover?.length) return null;

    // Index by the hour key (slice "2026-07-16T14:00" → "2026-07-16T14").
    const byHour = new Map<string, number>();
    for (let i = 0; i < times.length; i++) {
      const c = cover[i];
      if (typeof c === "number") byHour.set(times[i].slice(0, 13), Math.max(0, Math.min(1, c / 100)));
    }
    if (byHour.size === 0) return null;

    return {
      fetchedAt: Date.now(),
      at(date: Date) {
        const v = byHour.get(hourKey(date));
        return v === undefined ? 0 : v; // missing hour → assume clear (don't invent bad weather)
      },
    };
  } catch {
    return null;
  }
}

// smoothstep — 0 below `a`, 1 above `b`, an S-curve between. Gives the "soft knee" so a
// few clouds barely register but overcast bites.
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

// THE multiplier on light quality for a cloud fraction + light kind. Pure + tested.
//   golden/blue: 1.0 while clear-ish (≤~15% cloud), decaying to ~0.4 at full overcast.
//   flat:        ~1.0, a mild lift under heavy overcast (soft light softens harsh sun).
//   night:       untouched (quality is already ~0; cloud is moot).
export function cloudFactor(cloud: number, type: LightType): number {
  const c = Math.max(0, Math.min(1, cloud));
  if (type === "golden" || type === "blue") return 1 - 0.6 * smoothstep(0.15, 1, c);
  if (type === "flat") return 1 + 0.12 * smoothstep(0.4, 1, c); // overcast diffuses harsh midday
  return 1;
}

// A one-line, honest read of the sky for the "why this pick" copy + the chart caption.
export function skyLabel(cloud: number): string {
  const pct = Math.round(Math.max(0, Math.min(1, cloud)) * 100);
  if (pct <= 15) return "clear skies";
  if (pct <= 45) return "a few clouds";
  if (pct <= 75) return "partly cloudy";
  return "mostly cloudy";
}
