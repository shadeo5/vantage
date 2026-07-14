// ---------------------------------------------------------------------------
// Vantage content pipeline — STAGE 1: CURATE (per city, OSM-only)
//
// ADR: docs/engineering/CONTENT_PIPELINE.html (decision D1).
// "Which places make the list?" — answered from OpenStreetMap (free, no key),
// scored + ranked by a city's genre profile, then handed to a HUMAN to vet
// (stage 2) BEFORE any drafting/imagery spend.
//
//   city brief ──► Overpass query ──► score + dedup ──► candidates.<city>.json
//                                                   └──► review.<city>.html  (the vet surface)
//
// The vetted output ({name, genre, lat, lon}) is exactly what generate.mjs
// (stage 3, draft) consumes. No API key, no cost — Overpass is free.
//
// Run:  npm run curate            (defaults to nashville)
//       node curate.mjs chicago
// ---------------------------------------------------------------------------

import { writeFileSync, mkdirSync } from "fs";

// ---- City briefs — genre_profile tunes curation (ADR §05) -------------------
// Weights are keyed on the app's typed Genre. A low weight down-ranks (never
// bans) that genre, so one pipeline serves a street city, a cityscape city, and
// a nature region without bespoke scripts.
const CITIES = {
  nashville: {
    name: "Nashville", region: "TN", center: { lat: 36.1627, lon: -86.7816 }, radiusM: 6500,
    genreProfile: { Street: 1.0, Architecture: 0.85, Nature: 0.5, Landscape: 0.45, Details: 0.4 },
  },
  atlanta: {
    name: "Atlanta", region: "GA", center: { lat: 33.7490, lon: -84.3880 }, radiusM: 7000,
    genreProfile: { Street: 1.0, Architecture: 0.9, Nature: 0.6, Landscape: 0.5, Details: 0.4 },
    // Expansion: skip the 5 spots the app already ships (don't re-curate what's live).
    exclude: [
      { lat: 33.7550, lon: -84.3720 }, // Sweet Auburn
      { lat: 33.7540, lon: -84.3620 }, // Krog Street Tunnel
      { lat: 33.7545, lon: -84.3710 }, // Jackson Street Bridge
      { lat: 33.7850, lon: -84.3730 }, // Piedmont Park
      { lat: 33.7720, lon: -84.3650 }, // Ponce City Market
    ],
  },
  chicago: {
    name: "Chicago", region: "IL", center: { lat: 41.8827, lon: -87.6233 }, radiusM: 7500,
    genreProfile: { Architecture: 1.0, Street: 0.9, Landscape: 0.55, Nature: 0.4, Details: 0.35 },
  },
  "blue-ridge": {
    name: "Blue Ridge", region: "GA/NC mountains", center: { lat: 34.8698, lon: -84.3241 }, radiusM: 22000,
    genreProfile: { Landscape: 1.0, Nature: 1.0, Architecture: 0.4, Street: 0.35, Details: 0.3 },
  },
};

// ---- what we pull from Overpass ---------------------------------------------
const SELECTORS = [
  '["tourism"="viewpoint"]', '["man_made"="bridge"]', '["amenity"="marketplace"]',
  '["highway"="pedestrian"]', '["place"="square"]', '["tourism"="artwork"]',
  '["amenity"="arts_centre"]', '["historic"="district"]', '["historic"="building"]',
  '["historic"="monument"]', '["historic"="memorial"]', '["tourism"="attraction"]',
  '["leisure"="park"]', '["natural"="peak"]', '["waterway"="waterfall"]', '["natural"="water"]',
];

// ---- classify a POI from its tags → { bucket, genre, label, weight } ---------
// `bucket` is the curation category shown in the vet UI (a Landmark statue reads
// differently than a mural or a street). `genre` must be a valid app Genre
// (lib/gear.ts: Street | Portraits | Landscape | Architecture | Nature | Sports |
// Wildlife | Details) — it flows into Spot.genre for gear-fit. Ordered; first hit wins.
const cat = (bucket, label, genre, weight) => ({ bucket, label, genre, weight });
function classify(t) {
  if (t.tourism === "viewpoint")   return cat("Cityscape", "viewpoint / skyline", "Architecture", 0.95);
  if (t.man_made === "bridge")     return cat("Cityscape", "bridge", "Architecture", 0.80);
  if (t.amenity === "marketplace") return cat("Street", "market", "Street", 0.95);
  if (t.highway === "pedestrian")  return cat("Street", "pedestrian street", "Street", 0.85);
  if (t.place === "square")        return cat("Street", "square / plaza", "Street", 0.90);
  if (t.tourism === "artwork") {
    // Split the OSM catch-all: murals are street backdrops; statues are landmarks.
    const a = (t.artwork_type || "").toLowerCase();
    if (/mural|graffiti|painting|street_art/.test(a)) return cat("Street art", "mural", "Street", 0.90);
    if (/statue|sculpture|bust|installation|relief|stone|land_art/.test(a)) return cat("Landmark", "statue", "Details", 0.50);
    return cat("Landmark", "public art", "Details", 0.55);   // untyped artwork — a landmark lead
  }
  if (t.historic === "monument" || t.historic === "memorial") return cat("Landmark", "monument", "Details", 0.55);
  if (t.amenity === "arts_centre") return cat("Street", "arts centre", "Street", 0.60);
  if (t.historic === "district")   return cat("Street", "historic district", "Street", 0.85);
  if (t.historic === "building")   return cat("Architecture", "historic building", "Architecture", 0.70);
  if (t.tourism === "attraction")  return cat("Architecture", "attraction", "Architecture", 0.70);
  if (t.leisure === "park")        return cat("Nature", "park", "Nature", 0.70);
  if (t.natural === "peak")        return cat("Landscape", "peak / overlook", "Landscape", 1.00);
  if (t.waterway === "waterfall")  return cat("Nature", "waterfall", "Nature", 1.00);
  if (t.natural === "water")       return cat("Landscape", "waterfront", "Landscape", 0.55);
  return null;
}

const TOP_N = 25;              // how many candidates to hand to the human
const DENSITY_RADIUS_M = 400;  // "how many other shootable things cluster nearby"
const DEDUPE_M = 120;          // POIs closer than this with the same name collapse

// ---- geo helpers ------------------------------------------------------------
const toRad = (d) => (d * Math.PI) / 180;
function metersBetween(a, b) {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}
const clamp01 = (x) => Math.max(0, Math.min(1, x));

// ---- Overpass (free, no key). Public servers overload, so try mirrors. ------
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
async function overpass(query) {
  let lastErr;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Vantage/0.1 (photo-spot curation; contact desha.rogers@gmail.com)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status} from ${url}`); continue; }
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("all Overpass mirrors failed");
}

// ---- fetch + normalize named POIs ------------------------------------------
async function fetchPlaces(city) {
  const { lat, lon } = city.center;
  const parts = SELECTORS.map((q) => `nwr${q}(around:${city.radiusM},${lat},${lon});`).join("");
  const query = `[out:json][timeout:30];(${parts});out center tags 800;`;
  const elements = (await overpass(query))?.elements ?? [];

  const seen = new Set();
  const places = [];
  for (const el of elements) {
    const plat = el.lat ?? el.center?.lat, plon = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    if (plat == null || plon == null || !tags.name) continue;      // need a name + coords
    const c = classify(tags);
    if (!c) continue;
    const key = `${tags.name.toLowerCase()}`;
    if (seen.has(key)) continue; seen.add(key);
    places.push({
      name: tags.name,
      bucket: c.bucket,
      genre: c.genre,
      label: c.label,
      weight: c.weight,
      lat: +plat.toFixed(6),
      lon: +plon.toFixed(6),
      prominent: !!(tags.wikidata || tags.wikipedia),   // a cheap "is this notable?" signal
      osmType: el.type,
      osmId: el.id,
    });
  }
  // density = how many other kept POIs cluster within a short walk
  for (const p of places) {
    p.density = places.filter((q) => q !== p && metersBetween(p, q) <= DENSITY_RADIUS_M).length;
  }
  // Drop any spot the city brief already ships (expansion = new spots only).
  const kept = dedupeNearby(places).filter((p) => !(city.exclude || []).some((e) => metersBetween(e, p) <= 250));
  return kept;
}

// Drop a POI if a higher-weight POI with an overlapping name sits almost on top of
// it — catches "TPAC" vs "TPAC (TPAC)" and "X" vs "X Plaza" at the same coords.
const normName = (s) => s.toLowerCase().replace(/\s*\(.*?\)\s*/g, " ").replace(/[^a-z0-9]+/g, " ").trim();
function dedupeNearby(places) {
  const kept = [];
  for (const p of [...places].sort((a, b) => b.weight - a.weight)) {
    const np = normName(p.name);
    const dup = kept.some((k) => {
      if (metersBetween(k, p) > DEDUPE_M) return false;
      const nk = normName(k.name);
      return nk === np || nk.includes(np) || np.includes(nk);
    });
    if (!dup) kept.push(p);
  }
  return kept;
}

// ---- score + rank -----------------------------------------------------------
function rank(places, city) {
  const maxDensity = Math.max(1, ...places.map((p) => p.density));
  for (const p of places) {
    const profile = city.genreProfile[p.genre] ?? 0.3;   // unlisted genre = lightly kept
    const densityBoost = 1 + 0.5 * clamp01(p.density / maxDensity);
    const prominenceBoost = p.prominent ? 1.25 : 1.0;
    p.raw = p.weight * profile * densityBoost * prominenceBoost;
  }
  const sorted = places.sort((a, b) => b.raw - a.raw);
  // Diversity: cap any single bucket so a mural-heavy city (Atlanta has hundreds of
  // mapped murals) doesn't eat every slot and bury the cityscape/nature variety.
  // Backfill from the remainder only if capping leaves us short of TOP_N.
  const MAX_PER_BUCKET = 6;
  const count = {}, primary = [], overflow = [];
  for (const p of sorted) {
    if ((count[p.bucket] || 0) < MAX_PER_BUCKET) { primary.push(p); count[p.bucket] = (count[p.bucket] || 0) + 1; }
    else overflow.push(p);
  }
  const ranked = primary.concat(overflow).slice(0, TOP_N).sort((a, b) => b.raw - a.raw);
  // Normalize to a 0–100 score RELATIVE to this run's top pick, so the number is
  // legible at a glance (100 = strongest candidate here; it's a rank signal, not
  // an absolute grade). The row number is the true rank.
  const top = ranked[0]?.raw || 1;
  ranked.forEach((p, i) => { p.rank = i + 1; p.score = Math.round((p.raw / top) * 100); delete p.raw; });
  return ranked;
}

// ---- the vet surface — a self-contained review page ------------------------
// Candidate data is baked in (no fetch → works offline and as an artifact).
// Uncheck to reject, edit the name/genre inline, then "Download vetted JSON".
function reviewHtml(city, cityKey, candidates) {
  const GENRES = ["Street", "Portraits", "Landscape", "Architecture", "Nature", "Sports", "Wildlife", "Details"];
  const rows = candidates.map((c, i) => {
    const gmaps = `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`;
    const sv = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${c.lat},${c.lon}`;
    const osm = `https://www.openstreetmap.org/${c.osmType}/${c.osmId}`;
    const opts = GENRES.map((g) => `<option${g === c.genre ? " selected" : ""}>${g}</option>`).join("");
    return `<tr data-i="${i}">
      <td class="c"><input type="checkbox" checked></td>
      <td class="r">${c.rank}</td>
      <td><input class="nm" value="${c.name.replace(/"/g, "&quot;")}"></td>
      <td><select class="ge">${opts}</select></td>
      <td class="lab"><span class="bkt">${c.bucket}</span>${c.label}${c.prominent ? ' <span class="star" title="notable (wiki-linked)">★</span>' : ""}</td>
      <td class="num">${c.density}</td>
      <td class="num">${c.score}</td>
      <td class="lk"><a href="${gmaps}" target="_blank" rel="noopener">map</a> · <a href="${sv}" target="_blank" rel="noopener">street</a> · <a href="${osm}" target="_blank" rel="noopener">osm</a></td>
    </tr>`;
  }).join("\n");

  return `<title>Vet — ${city.name} candidates</title>
<style>
  :root{--ground:#0F0F11;--surface:#161618;--raised:#1d1d21;--ink:#F4F1EA;--muted:#9a98a2;--faint:#6E6C75;--gold:#E9B872;--green:#9DB89A;--hair:rgba(255,255,255,.09);--mono:'SF Mono','JetBrains Mono',ui-monospace,Menlo,monospace;--sans:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;--serif:'Iowan Old Style',Palatino,Georgia,serif;}
  @media (prefers-color-scheme: light){:root{--ground:#F4F1EA;--surface:#FBFAF6;--raised:#fff;--ink:#211d17;--muted:#5f5a51;--faint:#8a857b;--gold:#9a6e1e;--green:#566f4c;--hair:rgba(40,27,10,.14);}}
  :root[data-theme="light"]{--ground:#F4F1EA;--surface:#FBFAF6;--raised:#fff;--ink:#211d17;--muted:#5f5a51;--faint:#8a857b;--gold:#9a6e1e;--green:#566f4c;--hair:rgba(40,27,10,.14);}
  :root[data-theme="dark"]{--ground:#0F0F11;--surface:#161618;--raised:#1d1d21;--ink:#F4F1EA;--muted:#9a98a2;--faint:#6E6C75;--gold:#E9B872;--green:#9DB89A;--hair:rgba(255,255,255,.09);}
  *{box-sizing:border-box;}
  body{background:var(--ground);color:var(--ink);font-family:var(--sans);line-height:1.5;margin:0;padding:40px 20px 120px;-webkit-font-smoothing:antialiased;}
  .wrap{max-width:1000px;margin:0 auto;}
  .eyebrow{font-family:var(--mono);font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;}
  h1{font-family:var(--serif);font-weight:500;font-size:34px;margin:10px 0 6px;}
  p.lede{color:var(--muted);max-width:70ch;margin:0 0 8px;}
  p.lede b{color:var(--ink);}
  .tw{overflow-x:auto;border:1px solid var(--hair);border-radius:14px;background:var(--surface);margin:22px 0;}
  table{border-collapse:collapse;width:100%;min-width:760px;font-size:13.5px;}
  th,td{text-align:left;padding:9px 11px;border-bottom:1px solid var(--hair);vertical-align:middle;}
  thead th{font-family:var(--mono);font-size:10px;letter-spacing:.8px;text-transform:uppercase;color:var(--faint);background:var(--raised);position:sticky;top:0;}
  tbody tr:last-child td{border-bottom:none;}
  tr.off{opacity:.32;}
  td.c,td.r,td.num{text-align:center;} td.r,td.num{font-family:var(--mono);color:var(--faint);}
  td.num{font-variant-numeric:tabular-nums;}
  input[type=checkbox]{width:17px;height:17px;accent-color:var(--gold);cursor:pointer;}
  input.nm,select.ge{background:transparent;color:var(--ink);border:1px solid transparent;border-radius:6px;padding:5px 7px;font:inherit;font-size:13.5px;width:100%;}
  input.nm:hover,select.ge:hover{border-color:var(--hair);} input.nm:focus,select.ge:focus{outline:2px solid var(--gold);outline-offset:1px;}
  select.ge{min-width:120px;} option{background:var(--surface);color:var(--ink);}
  td.lab{color:var(--muted);} .star{color:var(--gold);}
  .bkt{font-family:var(--mono);font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--faint);border:1px solid var(--hair);border-radius:5px;padding:1px 5px;margin-right:7px;white-space:nowrap;}
  td.lk a{color:var(--gold);text-decoration:none;font-size:12.5px;} td.lk a:hover{text-decoration:underline;}
  .bar{position:fixed;left:0;right:0;bottom:0;background:var(--raised);border-top:1px solid var(--hair);padding:14px 20px;display:flex;gap:16px;align-items:center;justify-content:center;flex-wrap:wrap;}
  .count{font-family:var(--mono);font-size:13px;color:var(--muted);} .count b{color:var(--green);font-size:16px;}
  button{font:inherit;font-weight:600;font-size:14px;padding:11px 20px;border-radius:10px;border:none;background:var(--gold);color:#1a1408;cursor:pointer;}
  button:hover{filter:brightness(1.06);} button:focus-visible{outline:2px solid var(--ink);outline-offset:2px;}
  code{font-family:var(--mono);font-size:12px;background:var(--raised);padding:2px 6px;border-radius:5px;}
</style>
<div class="wrap">
  <div class="eyebrow">Vantage · Curate → Vet · Stage 2</div>
  <h1>${city.name} — ${candidates.length} candidates</h1>
  <p class="lede">OSM-only curation (${city.region}), ranked by the <b>${cityKey}</b> genre profile. <b>Reject</b> by unchecking; <b>edit</b> a name or genre inline (open <code>map</code>/<code>street</code> to check it's actually worth shooting). Then <b>download</b> the vetted list — it feeds the draft pipeline.</p>
  <p class="lede">A candidate isn't a promise it's good — it's a lead. <b>Score is 0–100 relative to #1</b> (a rank signal, not a grade). <b>Landmark</b> rows are individual statues/monuments (genre Details) — usually thin as a shoot; cut most. The human gate is the quality bar.</p>
  <div class="tw">
    <table>
      <thead><tr><th>keep</th><th>#</th><th>name</th><th>genre</th><th>category · why (osm)</th><th title="shootable things within a short walk">density</th><th title="0–100, relative to #1">score</th><th>check</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</div>
<div class="bar">
  <span class="count"><b id="n">${candidates.length}</b> of ${candidates.length} kept</span>
  <button id="dl">⬇ Download vetted.${cityKey}.json</button>
</div>
<script id="data" type="application/json">${JSON.stringify(candidates)}</script>
<script>
  const raw = JSON.parse(document.getElementById("data").textContent);
  const rows = [...document.querySelectorAll("tbody tr")];
  const nEl = document.getElementById("n");
  function refresh(){
    let k = 0;
    for (const tr of rows){ const on = tr.querySelector("input[type=checkbox]").checked; tr.classList.toggle("off", !on); if (on) k++; }
    nEl.textContent = k;
  }
  rows.forEach((tr) => tr.querySelector("input[type=checkbox]").addEventListener("change", refresh));
  document.getElementById("dl").addEventListener("click", () => {
    const vetted = [];
    for (const tr of rows){
      if (!tr.querySelector("input[type=checkbox]").checked) continue;
      const src = raw[+tr.dataset.i];
      vetted.push({ name: tr.querySelector(".nm").value.trim(), genre: tr.querySelector(".ge").value, lat: src.lat, lon: src.lon });
    }
    const blob = new Blob([JSON.stringify(vetted, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob); a.download = "vetted.${cityKey}.json"; a.click();
    URL.revokeObjectURL(a.href);
  });
  refresh();
</script>`;
}

// ---- main -------------------------------------------------------------------
async function main() {
  const cityKey = (process.argv[2] || "nashville").toLowerCase();
  const city = CITIES[cityKey];
  if (!city) { console.error(`Unknown city "${cityKey}". Known: ${Object.keys(CITIES).join(", ")}`); process.exit(1); }

  console.log(`\nCurating ${city.name} (${city.region}) — OSM within ${(city.radiusM / 1000).toFixed(1)} km of center...`);
  const places = await fetchPlaces(city);
  console.log(`  ${places.length} named, de-duped POIs found`);
  const ranked = rank(places, city);
  console.log(`  → top ${ranked.length} candidates by the ${cityKey} genre profile\n`);

  const byBucket = ranked.reduce((m, p) => ((m[p.bucket] = (m[p.bucket] || 0) + 1), m), {});
  ranked.slice(0, 12).forEach((p) =>
    console.log(`  ${String(p.rank).padStart(2)}. ${String(p.score).padStart(3)}  ${p.name}  —  ${p.bucket} · ${p.label} (${p.genre})${p.prominent ? " ★" : ""}`));
  console.log(`\n  score is 0–100 relative to #1 · bucket mix: ${Object.entries(byBucket).map(([b, n]) => `${b} ${n}`).join(" · ")}`);

  const outDir = new URL("./out/", import.meta.url);
  mkdirSync(outDir, { recursive: true });
  const jsonPath = new URL(`./out/candidates.${cityKey}.json`, import.meta.url);
  const htmlPath = new URL(`./out/review.${cityKey}.html`, import.meta.url);
  writeFileSync(jsonPath, JSON.stringify(ranked, null, 2));
  writeFileSync(htmlPath, reviewHtml(city, cityKey, ranked));
  console.log(`\n  wrote content-pipeline/out/candidates.${cityKey}.json`);
  console.log(`  wrote content-pipeline/out/review.${cityKey}.html  ← open this to vet\n`);
}

main().catch((e) => { console.error("\nCurate failed:", e.message); process.exit(1); });
