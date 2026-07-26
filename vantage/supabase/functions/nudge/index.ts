// The nightly nudge (N2) — Supabase Edge Function (Deno).
//
// Runs on a schedule: read every profile with a push token, decide tonight's
// pick with the SAME brain as the app (light-timing × gear-fit), and if it's a
// "go", send a fresh push via Expo. The brain/copy/gear logic mirror vantage/lib/
// {nudge,nudgeCopy,gear,gearProfile,light,weather}.ts. Spots are now read from the `spots`
// table (Atlanta, published) — no longer a hardcoded copy, retiring the duplication.
// Weather-honest (P3 parity): cloud cover tempers the light so the push agrees with the app.
//
// Invoke with ?force=1 to send regardless of the go/no-go bar (for testing).
//
// ⚠ MIRROR OF THE APP BRAIN. The scoring weights/thresholds/curves below are re-implemented
// from vantage/lib/{nudge,weather}.ts because Deno can't import the RN app modules. If you
// change a weight, the go bar, REF_FIT, LIGHT_SENSITIVITY, cloudFactor, or the lightTiming
// buckets here, change lib/nudge.ts / lib/weather.ts too — vantage/__tests__/parity.test.ts
// reads both sources and fails the build if they drift out of sync.
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as SunCalc from "npm:suncalc@2";
import { CAMERAS, type CameraRow } from "./cameras.gen.ts";

// ── types ──────────────────────────────────────────────────────────────────
type Genre = "Street" | "Portraits" | "Landscape" | "Architecture" | "Nature" | "Sports" | "Wildlife" | "Details";
type WindowType = "golden" | "blue" | "flat";
type Spot = { id: string; name: string; type: string; genre: Genre; windowType: WindowType; reason: string; lat: number; lon: number };
type LensSpec = { minFocal: number; maxFocal: number; maxAperture: number; macro?: boolean };

// ── gear catalog: cameras GENERATED from the app's single source of truth
// (vantage/lib/cameras.catalog.json → cameras.gen.ts, guarded by parity.test.ts).
// Lenses are GENERIC descriptors read straight off the profile — no lens catalog.
const getCamera = (id: string): CameraRow => CAMERAS[id] ?? CAMERAS["fuji-x100vi"];

// ── gear → genre matching (mirror of lib/gear.ts) ────────────────────────────
const FAST = 2.8;
const equivFocal = (focal: number, crop: number) => Math.round(focal * crop);
function classifyFocal(equiv: number, aperture: number, out: Set<Genre>) {
  if (equiv <= 20) { out.add("Landscape"); out.add("Architecture"); out.add("Nature"); }
  else if (equiv <= 28) { out.add("Street"); out.add("Architecture"); out.add("Landscape"); }
  else if (equiv <= 40) { out.add("Street"); out.add("Architecture"); }
  else if (equiv <= 60) { out.add("Street"); if (aperture <= FAST) out.add("Portraits"); }
  else if (equiv <= 105) { if (aperture <= FAST) out.add("Portraits"); }
  else if (equiv <= 135) { out.add("Sports"); if (aperture <= FAST) out.add("Portraits"); }
  else if (equiv <= 300) { out.add("Sports"); out.add("Wildlife"); out.add("Nature"); }
  else { out.add("Wildlife"); out.add("Nature"); }
}
function genresForSpec(spec: LensSpec, cam?: CameraRow): Genre[] {
  const crop = cam ? cam.cropFactor : 1;
  const out = new Set<Genre>();
  if (spec.macro) out.add("Details");
  classifyFocal(equivFocal(spec.minFocal, crop), spec.maxAperture, out);
  classifyFocal(equivFocal(spec.maxFocal, crop), spec.maxAperture, out);
  return [...out];
}
function genresForCamera(cam: CameraRow): Genre[] {
  if (!cam.fixedLens) return [];
  return genresForSpec(cam.fixedLens, cam);
}
function fixedLensLabel(cam: CameraRow): string {
  if (!cam.fixedLens) return "";
  const lo = equivFocal(cam.fixedLens.minFocal, cam.cropFactor);
  const hi = equivFocal(cam.fixedLens.maxFocal, cam.cropFactor);
  return lo === hi ? `${lo}mm` : `${lo}–${hi}mm`;
}
function lensLabel(spec: LensSpec): string {
  const base = spec.minFocal === spec.maxFocal ? `${spec.minFocal}mm` : `${spec.minFocal}–${spec.maxFocal}mm`;
  return spec.macro ? `${base} macro` : base;
}
function bestLensForGenre(cameraId: string, lenses: LensSpec[], genre: Genre): string | null {
  const cam = getCamera(cameraId);
  if (cam.fixedLens) return genresForCamera(cam).includes(genre) ? fixedLensLabel(cam) : null;
  for (const spec of lenses) if (genresForSpec(spec, cam).includes(genre)) return lensLabel(spec);
  return null;
}
const primaryLensLabel = (cameraId: string, lenses: LensSpec[]): string => {
  const cam = getCamera(cameraId);
  if (cam.fixedLens) return fixedLensLabel(cam);
  return lenses.length ? lensLabel(lenses[0]) : "lens";
};

// ── light windows (SunCalc.getTimes — date maths, no altitude subtleties) ────
const fmtTime = (d: Date, tz: string) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
function windowFor(spot: Spot, date: Date): { start: Date; end: Date } {
  const t = SunCalc.getTimes(date, spot.lat, spot.lon) as Record<string, Date>;
  if (spot.windowType === "blue") return { start: t.sunset, end: t.dusk };
  if (spot.windowType === "golden") return { start: t.goldenHour, end: t.sunsetStart };
  return { start: t.sunrise, end: t.sunsetStart };
}

// ── the brain (mirror of nudge.ts) ───────────────────────────────────────────
const LIGHT_W = 0.6, GEAR_W = 0.4, GO_THRESHOLD = 0.55;
// Genre-dependent light quality (CB7) — mirror of vantage/lib/nudge.ts. Light is a set of
// creative MODES, not a good/bad ladder; how much the window type gates a shoot depends on
// the genre. REF_FIT is the reference fit for a fully light-sensitive genre (golden > blue
// > flat); LIGHT_SENSITIVITY blends each genre toward neutral — street is light-flexible
// (flat barely dents it), landscape lives by golden/blue. Keeps the push's pick in step
// with the app instead of the old global BASE_QUALITY (which under-ranked flat street).
const REF_FIT: Record<WindowType, number> = { golden: 1.0, blue: 0.85, flat: 0.55 };
const LIGHT_SENSITIVITY: Record<Genre, number> = {
  Landscape: 0.9, Wildlife: 0.65, Architecture: 0.7, Nature: 0.6,
  Portraits: 0.5, Details: 0.4, Sports: 0.3, Street: 0.15,
};
const phaseScore = (genre: Genre, wt: WindowType) => 1 - (LIGHT_SENSITIVITY[genre] ?? 0.5) * (1 - REF_FIT[wt]);

// ── weather (P3 parity) — cloud tempers the light, honestly. Mirror of vantage/lib/weather.ts.
// The push scored astronomical-only, so a heavy-overcast evening still headlined a golden-hour
// spot the (weather-aware) app knew was washed out — the two disagreed. We fetch once for the
// city (spots[0] proxy, same simplification the app's Today uses) and sample each spot's window
// at its start, exactly like the app's scoreSpot.
//
// TZ GOTCHA: the app keys cloud by LOCAL hour because the phone's clock IS the city's tz. This
// function runs in UTC, so we query Open-Meteo with timezone=UTC and key on getUTC* — the spot
// windows (SunCalc, absolute instants) then line up with the UTC-stamped forecast hours.
type Forecast = { cloudAt(date: Date): number };
function utcHourKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}`;
}
// Returns null on ANY failure — the caller degrades to astronomical-only light (same best-effort
// pattern as the app). We only need cloud for the scorer; rain/wet drive the app's shoot brief,
// not the push pick.
async function fetchForecast(lat: number, lon: number): Promise<Forecast | null> {
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}` +
      `&hourly=cloud_cover&timezone=UTC&forecast_days=2`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = (await res.json()) as { hourly?: { time?: string[]; cloud_cover?: number[] } };
    const times = json.hourly?.time;
    const cover = json.hourly?.cloud_cover;
    if (!times?.length || !cover?.length) return null;
    const cloudBy = new Map<string, number>();
    for (let i = 0; i < times.length; i++) {
      // "2026-07-22T14:00" (UTC) → "2026-07-22T14"
      if (typeof cover[i] === "number") cloudBy.set(times[i].slice(0, 13), clamp01(cover[i] / 100));
    }
    if (cloudBy.size === 0) return null;
    return { cloudAt: (date) => cloudBy.get(utcHourKey(date)) ?? 0 }; // missing hour → clear (don't invent bad weather)
  } catch {
    return null;
  }
}
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}
// THE multiplier on light quality for a cloud fraction + window type (mirror of weather.ts):
// golden/blue decay to ~0.4 under overcast (the warm low light cloud blocks); flat lifts mildly
// (overcast = soft even street/portrait light); never rewards cloud on golden. Monotonic.
function cloudFactor(cloud: number, wt: WindowType): number {
  const c = clamp01(cloud);
  if (wt === "golden" || wt === "blue") return 1 - 0.6 * smoothstep(0.15, 1, c);
  if (wt === "flat") return 1 + 0.12 * smoothstep(0.4, 1, c);
  return 1;
}
function lightTiming(now: Date, start: Date, end: Date): number {
  const n = now.getTime();
  if (n >= start.getTime() && n <= end.getTime()) return 1.0;
  if (n < start.getTime()) {
    const h = (start.getTime() - n) / 3.6e6;
    if (h <= 2) return 0.9; if (h <= 6) return 0.6; return 0.45;
  }
  return 0.2;
}
function gearFitScore(cameraId: string, lenses: LensSpec[], genre: Genre): number {
  return bestLensForGenre(cameraId, lenses, genre) === null ? 0.35 : 1.0;
}
type Verdict = { go: boolean; score: number; confidence: "high" | "medium" | "low"; spot: Spot; window: { start: Date; end: Date } };
function tonightNudge(spots: Spot[], now: Date, cameraId: string, lenses: LensSpec[], cloud?: Forecast | null): Verdict {
  const scored = spots.map((spot) => {
    const win = windowFor(spot, now);
    // Sample the sky at the window start (mirror of app scoreSpot). Null forecast → factor 1.
    const sky = cloud ? cloud.cloudAt(win.start) : null;
    const weather = sky === null ? 1 : cloudFactor(sky, spot.windowType);
    const light = phaseScore(spot.genre, spot.windowType) * lightTiming(now, win.start, win.end) * weather;
    const gear = gearFitScore(cameraId, lenses, spot.genre);
    return { spot, win, score: LIGHT_W * light + GEAR_W * gear };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0];
  const confidence = top.score >= 0.75 ? "high" : top.score >= GO_THRESHOLD ? "medium" : "low";
  return { go: top.score >= GO_THRESHOLD, score: top.score, confidence, spot: top.spot, window: top.win };
}

// ── copy (mirror of nudgeCopy.ts) ────────────────────────────────────────────
const WINDOW_WORD: Record<WindowType, string> = { golden: "Golden hour", blue: "Blue hour", flat: "The light" };
function daySeed(d: Date): number { return Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000); }
const pick = <T>(arr: T[], seed: number): T => arr[((seed % arr.length) + arr.length) % arr.length];
function nudgeCopy(v: Verdict, lens: string, now: Date, tz: string): { title: string; body: string } {
  const seed = daySeed(now);
  const s = v.spot;
  if (!v.go) {
    // Quiet night — honest, but never mournful about "lost" light (VOICE: light is an
    // asset, never a miss). No "the good light's already behind us."
    return {
      title: pick(["A quiet one tonight.", "Nothing loud out there.", "Rest the shutter — or wander."], seed),
      body: pick([
        `No big light tonight, but ${s.name} keeps — a slow walk if you want it.`,
        `Nothing's lining up loud. ${s.name}'s there whenever you are.`,
        `Save the battery, or take ${s.name} at your own pace.`,
      ], seed + 2),
    };
  }
  const titles = v.confidence === "high"
    ? [`Tonight's the night — ${s.name} is about to glow.`, `Drop what you're doing — ${s.name} is going to be special.`, `${s.name} is calling, and the light's on your side.`]
    : [`Worth heading out — ${s.name} should be good tonight.`, `${s.name} is a solid bet this evening.`, `Keep the ${lens} close — ${s.name} is worth a look tonight.`];
  // Phase-honest body (PH7). FLAT light is light-flexible — celebrate it without inventing a
  // clock time (its window.start is sunrise, a MORNING time that would be wrong on an evening
  // push). GOLDEN/BLUE name the evening window: "hits {time}" only while it's still ahead,
  // else "on now" — never cite a window that's already passed (same rule as the app hero).
  let bodies: string[];
  if (s.windowType === "flat") {
    bodies = [
      `${s.name}'s good all evening — grab your ${lens} and go.`,
      `${lens} weather at ${s.name} — the light's yours to work all evening.`,
      `${s.name} was made for your ${lens}. Head out when you're ready.`,
    ];
  } else {
    const win = WINDOW_WORD[s.windowType];
    const ahead = v.window.start.getTime() > now.getTime();
    const at = fmtTime(v.window.start, tz);
    bodies = ahead
      ? [
          `${win} hits ${at} and ${s.name} comes alive — grab your ${lens}.`,
          `${lens} weather at ${s.name}. ${win} at ${at}.`,
          `${win} at ${at} — ${s.name} was made for your ${lens}.`,
        ]
      : [
          `${win}'s on now at ${s.name} — grab your ${lens} and go.`,
          `${lens} weather at ${s.name} — ${win.toLowerCase()}'s up right now.`,
          `${s.name}'s in ${win.toLowerCase()} — made for your ${lens}.`,
        ];
  }
  return { title: pick(titles, seed), body: pick(bodies, seed + 1) };
}

// ── handler ──────────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const force = new URL(req.url).searchParams.has("force");
  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const now = new Date();

  // Spots from the DB (Atlanta, published) — the single source; no hardcoded copy.
  const { data: spotRows, error: spotsError } = await supabase
    .from("spots").select("id, name, type, genres, window_type, reason, lat, lon")
    .eq("city_id", "atlanta").eq("published", true);
  if (spotsError) return new Response(JSON.stringify({ error: spotsError.message }), { status: 500 });
  const SPOTS: Spot[] = (spotRows ?? []).map((r) => ({
    id: r.id, name: r.name, type: r.type ?? "",
    genre: ((r.genres ?? [])[0] ?? "Street") as Genre,
    windowType: (r.window_type ?? "golden") as WindowType,
    reason: r.reason ?? "", lat: r.lat, lon: r.lon,
  }));
  if (!SPOTS.length) return new Response(JSON.stringify({ error: "no published Atlanta spots in DB" }), { status: 500 });

  // Weather once for the city (spots[0] proxy) — best-effort; null → astronomical-only, same as
  // the app. Fetched before the profile loop so every user scores against the same sky.
  const cloud = await fetchForecast(SPOTS[0].lat, SPOTS[0].lon);

  const { data: profiles, error } = await supabase
    .from("profiles").select("id, push_token, camera_id, lenses, timezone").not("push_token", "is", null);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const messages: Record<string, unknown>[] = [];
  const logs: Record<string, unknown>[] = [];
  let considered = 0, sent = 0, skipped = 0;

  for (const p of profiles ?? []) {
    considered++;
    const cameraId = p.camera_id ?? "fuji-x100vi";
    const lenses: LensSpec[] = p.lenses ?? [];
    const tz = p.timezone ?? "America/New_York";
    const verdict = tonightNudge(SPOTS, now, cameraId, lenses, cloud);
    if (!verdict.go && !force) { skipped++; continue; }
    const lens = bestLensForGenre(cameraId, lenses, verdict.spot.genre) ?? primaryLensLabel(cameraId, lenses);
    const copy = nudgeCopy(verdict, lens, now, tz);
    messages.push({ to: p.push_token, title: copy.title, body: copy.body, sound: "default", channelId: "default" });
    logs.push({ user_id: p.id, spot_id: verdict.spot.id });
    sent++;
  }

  if (messages.length) {
    await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(messages),
    });
    if (logs.length) await supabase.from("nudge_log").insert(logs);
  }

  return new Response(JSON.stringify({ considered, sent, skipped, weather: cloud ? "live" : "unavailable", at: now.toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
