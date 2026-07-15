// The nightly nudge (N2) — Supabase Edge Function (Deno).
//
// Runs on a schedule: read every profile with a push token, decide tonight's
// pick with the SAME brain as the app (light-timing × gear-fit), and if it's a
// "go", send a fresh push via Expo. The brain/copy/gear logic mirror vantage/lib/
// {nudge,nudgeCopy,gear,gearProfile,light}.ts. Spots are now read from the `spots`
// table (Atlanta, published) — no longer a hardcoded copy, retiring the duplication.
//
// Invoke with ?force=1 to send regardless of the go/no-go bar (for testing).
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as SunCalc from "npm:suncalc@2";

// ── types ──────────────────────────────────────────────────────────────────
type Genre = "Street" | "Portraits" | "Landscape" | "Architecture" | "Nature" | "Sports" | "Wildlife" | "Details";
type WindowType = "golden" | "blue" | "flat";
type Spot = { id: string; name: string; type: string; genre: Genre; windowType: WindowType; reason: string; lat: number; lon: number };
type Camera = { id: string; model: string; cropFactor: number; fixedLens?: { minFocal: number; maxAperture: number } };
type Lens = { id: string; short: string; minFocal: number; maxFocal: number; maxAperture: number; category: string };

// ── gear catalog (crop factors + the six selectable lenses) ──────────────────
const CAMERAS: Record<string, Camera> = {
  "fuji-x100vi": { id: "fuji-x100vi", model: "X100VI", cropFactor: 1.5, fixedLens: { minFocal: 23, maxAperture: 2.0 } },
  "ricoh-gr-iiix": { id: "ricoh-gr-iiix", model: "GR IIIx", cropFactor: 1.5, fixedLens: { minFocal: 26.1, maxAperture: 2.8 } },
  "ricoh-gr-iii": { id: "ricoh-gr-iii", model: "GR III", cropFactor: 1.5, fixedLens: { minFocal: 18.3, maxAperture: 2.8 } },
  "leica-q3": { id: "leica-q3", model: "Q3", cropFactor: 1.0, fixedLens: { minFocal: 28, maxAperture: 1.7 } },
  "fuji-xt5": { id: "fuji-xt5", model: "X-T5", cropFactor: 1.5 },
  "fuji-xs20": { id: "fuji-xs20", model: "X-S20", cropFactor: 1.5 },
  "sony-a7-iv": { id: "sony-a7-iv", model: "a7 IV", cropFactor: 1.0 },
  "sony-a7c-ii": { id: "sony-a7c-ii", model: "a7C II", cropFactor: 1.0 },
  "sony-a6700": { id: "sony-a6700", model: "a6700", cropFactor: 1.5 },
  "canon-r6-ii": { id: "canon-r6-ii", model: "EOS R6 Mark II", cropFactor: 1.0 },
  "canon-r8": { id: "canon-r8", model: "EOS R8", cropFactor: 1.0 },
  "canon-r50": { id: "canon-r50", model: "EOS R50", cropFactor: 1.6 },
  "nikon-zf": { id: "nikon-zf", model: "Z f", cropFactor: 1.0 },
  "nikon-z6-iii": { id: "nikon-z6-iii", model: "Z6 III", cropFactor: 1.0 },
  "nikon-zfc": { id: "nikon-zfc", model: "Z fc", cropFactor: 1.5 },
  "om-om5": { id: "om-om5", model: "OM-5", cropFactor: 2.0 },
  "panasonic-s5-ii": { id: "panasonic-s5-ii", model: "Lumix S5 II", cropFactor: 1.0 },
  "apple-iphone-16-pro": { id: "apple-iphone-16-pro", model: "iPhone 16 Pro", cropFactor: 3.5, fixedLens: { minFocal: 6.9, maxAperture: 1.78 } },
  "samsung-s24-ultra": { id: "samsung-s24-ultra", model: "Galaxy S24 Ultra", cropFactor: 3.8, fixedLens: { minFocal: 6.3, maxAperture: 1.7 } },
};
const LENS_CHIPS: Lens[] = [
  { id: "fuji-xf23-2", short: "23mm", minFocal: 23, maxFocal: 23, maxAperture: 2.0, category: "wide" },
  { id: "sony-fe35-18", short: "35mm", minFocal: 35, maxFocal: 35, maxAperture: 1.8, category: "wide" },
  { id: "sony-fe50-18", short: "50mm", minFocal: 50, maxFocal: 50, maxAperture: 1.8, category: "normal" },
  { id: "sony-fe85-18", short: "85mm", minFocal: 85, maxFocal: 85, maxAperture: 1.8, category: "short-tele" },
  { id: "sony-fe-70-200-28gm2", short: "70–200mm", minFocal: 70, maxFocal: 200, maxAperture: 2.8, category: "tele" },
  { id: "sony-fe90-macro", short: "90mm macro", minFocal: 90, maxFocal: 90, maxAperture: 2.8, category: "macro" },
];
const getCamera = (id: string): Camera => CAMERAS[id] ?? CAMERAS["fuji-x100vi"];
const getLens = (id: string): Lens | undefined => LENS_CHIPS.find((l) => l.id === id);

// ── gear → genre matching (mirror of gear.ts / gearProfile.ts) ───────────────
const FAST = 2.8;
const equivAt = (focal: number, crop: number) => Math.round(focal * crop);
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
function genresForLens(lens: Lens, cam?: Camera): Genre[] {
  const crop = cam ? cam.cropFactor : 1;
  const out = new Set<Genre>();
  if (lens.category === "macro") out.add("Details");
  classifyFocal(equivAt(lens.minFocal, crop), lens.maxAperture, out);
  classifyFocal(equivAt(lens.maxFocal, crop), lens.maxAperture, out);
  return [...out];
}
function genresForCamera(cam: Camera): Genre[] {
  if (!cam.fixedLens) return [];
  const pseudo: Lens = { id: `${cam.id}-fixed`, short: cam.model, minFocal: cam.fixedLens.minFocal, maxFocal: cam.fixedLens.minFocal, maxAperture: cam.fixedLens.maxAperture, category: "wide" };
  return genresForLens(pseudo, cam);
}
function bestLensForGenre(cameraId: string, lensIds: string[], genre: Genre): string | null {
  const cam = getCamera(cameraId);
  for (const chip of LENS_CHIPS) {
    if (!lensIds.includes(chip.id)) continue;
    if (genresForLens(chip, cam).includes(genre)) return chip.short;
  }
  if (genresForCamera(cam).includes(genre)) return cam.model;
  return null;
}
const primaryLensLabel = (lensIds: string[]): string => LENS_CHIPS.find((c) => lensIds.includes(c.id))?.short ?? "35mm";

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
const BASE_QUALITY: Record<WindowType, number> = { golden: 1.0, blue: 0.85, flat: 0.55 };
function lightTiming(now: Date, start: Date, end: Date): number {
  const n = now.getTime();
  if (n >= start.getTime() && n <= end.getTime()) return 1.0;
  if (n < start.getTime()) {
    const h = (start.getTime() - n) / 3.6e6;
    if (h <= 2) return 0.9; if (h <= 6) return 0.6; return 0.45;
  }
  return 0.2;
}
function gearFitScore(cameraId: string, lensIds: string[], genre: Genre): number {
  const best = bestLensForGenre(cameraId, lensIds, genre);
  if (best === null) return 0.35;
  return LENS_CHIPS.some((c) => c.short === best) ? 1.0 : 0.7;
}
type Verdict = { go: boolean; score: number; confidence: "high" | "medium" | "low"; spot: Spot; window: { start: Date; end: Date } };
function tonightNudge(spots: Spot[], now: Date, cameraId: string, lensIds: string[]): Verdict {
  const scored = spots.map((spot) => {
    const win = windowFor(spot, now);
    const light = BASE_QUALITY[spot.windowType] * lightTiming(now, win.start, win.end);
    const gear = gearFitScore(cameraId, lensIds, spot.genre);
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
  const win = WINDOW_WORD[v.spot.windowType];
  const at = fmtTime(v.window.start, tz);
  const s = v.spot;
  if (!v.go) {
    return {
      title: pick(["Quiet one tonight.", "Not the night to chase light.", "Rest the shutter tonight."], seed),
      body: pick([`The good light's already behind us — scout ${s.name} for tomorrow.`, `Nothing's quite lining up this evening. ${s.name} will keep.`, `Save it — ${s.name} wants better light than tonight's got left.`], seed + 2),
    };
  }
  const titles = v.confidence === "high"
    ? [`Tonight's the night — ${s.name} is about to glow.`, `Drop what you're doing — ${s.name} is going to be special.`, `${s.name} is calling, and the light's on your side.`]
    : [`Worth heading out — ${s.name} should be good tonight.`, `${s.name} is a solid bet this evening.`, `Keep the ${lens} close — ${s.name} is worth a look tonight.`];
  const bodies = [
    `${win} hits ${at} and ${s.name} comes alive — grab your ${lens}.`,
    `${lens} weather at ${s.name}. ${win} at ${at}.`,
    `${win} at ${at} — ${s.name} was made for your ${lens}.`,
  ];
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

  const { data: profiles, error } = await supabase
    .from("profiles").select("id, push_token, camera_id, lens_ids, timezone").not("push_token", "is", null);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  const messages: Record<string, unknown>[] = [];
  const logs: Record<string, unknown>[] = [];
  let considered = 0, sent = 0, skipped = 0;

  for (const p of profiles ?? []) {
    considered++;
    const cameraId = p.camera_id ?? "fuji-x100vi";
    const lensIds: string[] = p.lens_ids ?? [];
    const tz = p.timezone ?? "America/New_York";
    const verdict = tonightNudge(SPOTS, now, cameraId, lensIds);
    if (!verdict.go && !force) { skipped++; continue; }
    const lens = bestLensForGenre(cameraId, lensIds, verdict.spot.genre) ?? primaryLensLabel(lensIds);
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

  return new Response(JSON.stringify({ considered, sent, skipped, at: now.toISOString() }), {
    headers: { "Content-Type": "application/json" },
  });
});
