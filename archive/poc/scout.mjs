// ---------------------------------------------------------------------------
// Vantage POC — "What should I shoot near me right now?" (STREET, Atlanta)
//
// A THROWAWAY script answering one question: can we auto-generate a genuinely
// useful list of street-photo opportunities with zero manual curation?
//
// It blends FOUR signals, scores them, and prints a ranked list:
//   1. OpenStreetMap places   -> dense/interesting areas   (free, no key)
//   2. Sports events          -> stadium crowds & big games (free, no key)
//   3. Hand-pinned "tentpole" -> huge known events APIs miss (editorial)
//   4. Ticketmaster events    -> concerts/arts             (optional, free key)
//   + SunCalc light windows   -> when the light is good     (free, offline)
//
// IMPORTANT lessons this POC baked in:
//   • Filter events by GEOGRAPHY (venue lat/lon + radius), never by a name
//     string — "Atlanta" also matches a soccer club in Argentina.
//   • No single API is complete. Knockout World Cup games aren't in the sports
//     feed yet (teams TBD), so we hand-pin tentpole events as a safety net.
//
// Run it:  npm install   then   npm run scout   (works with NO key)
// ---------------------------------------------------------------------------

import SunCalc from "suncalc";

// --- Config you can tweak -------------------------------------------------
const LOCATION = { name: "Downtown Atlanta", lat: 33.749, lon: -84.388 };
const EVENT_RADIUS_MILES = 30;   // how far out to look for events
const EVENT_DAYS_AHEAD = 14;     // date-range window: now -> now + this
const OSM_RADIUS_M = 8000;       // ~5 mi radius for interesting places
const DENSITY_RADIUS_M = 350;    // "how many interesting places cluster nearby"
const TOP_N = 12;

// Scoring weights — the whole point of the POC is to eyeball results and tune these.
const W = { proximity: 40, activity: 30, density: 35, category: 15, light: 20, soon: 15, magnitude: 45 };
const DISTRICT_MERGE_M = 500; // POIs within this of each other collapse into one district

const TM_KEY = process.env.TICKETMASTER_API_KEY; // optional

// Known Atlanta venues + coordinates. We match sports events to these so we can
// GEO-FILTER by real location instead of trusting a "city" text field.
const ATLANTA_VENUES = {
  "Mercedes-Benz Stadium": { lat: 33.7553, lon: -84.4006 },
  "State Farm Arena": { lat: 33.7573, lon: -84.3963 },
  "Truist Park": { lat: 33.8907, lon: -84.4677 },
  "Bobby Dodd Stadium": { lat: 33.7725, lon: -84.3928 },
  "Center Parc Stadium": { lat: 33.7369, lon: -84.3894 },
};

// EDITORIAL LAYER: huge, known-months-ahead events an API might miss. This is
// how we guarantee the biggest shoot in town never silently drops.
const TENTPOLE_EVENTS = [
  {
    name: "FIFA World Cup 26 — Semifinal",
    category: "World Cup",
    venue: "Mercedes-Benz Stadium",
    startISO: "2026-07-15T15:00:00",
    lat: 33.7553, lon: -84.4006,
  },
];

// --- Small helpers --------------------------------------------------------
function haversineMiles(a, b) {
  const R = 3958.8, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLon = toRad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}
const metersBetween = (a, b) => haversineMiles(a, b) * 1609.34;
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const fmtTime = (d) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const fmtDay = (d) => d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const withinWindow = (d, now, days) => d && d >= now && d <= new Date(now.getTime() + days * 864e5);

// --- Light: today's golden/blue-hour windows ------------------------------
function lightWindows(date, loc) {
  const t = SunCalc.getTimes(date, loc.lat, loc.lon);
  return {
    goldenEvening: { start: t.goldenHour, end: t.sunsetStart },
    blueEvening: { start: t.sunset, end: t.dusk },
    goldenMorning: { start: t.sunrise, end: t.goldenHourEnd },
  };
}
function lightScoreAt(date, w) {
  const inW = (x) => date >= x.start && date <= x.end;
  if (inW(w.goldenEvening) || inW(w.goldenMorning)) return 1;
  if (inW(w.blueEvening)) return 0.8;
  return 0.4;
}
function nextLightLabel(now, w) {
  const up = [
    ["Golden hour", w.goldenEvening],
    ["Blue hour", w.blueEvening],
    ["Golden (AM)", w.goldenMorning],
  ].filter(([, x]) => x.end > now).sort((a, b) => a[1].start - b[1].start)[0];
  if (!up) return "no more good light today";
  const [label, x] = up;
  return `${label} ${fmtTime(x.start)}–${fmtTime(x.end)}`;
}
const labelForDate = (date) => nextLightLabel(date, lightWindows(date, LOCATION));

// ===========================================================================
// EVENT SOURCES — each returns a normalized event:
//   { name, category, venue, start: Date|null, lat, lon, source, activity }
// activity (0..1) = how rich this is for STREET photography (crowds/energy).
// ===========================================================================

// (a) Hand-pinned tentpole events, filtered to the window + radius.
function tentpoleEvents(now) {
  return TENTPOLE_EVENTS
    .map((e) => ({ ...e, start: new Date(e.startISO), source: "Tentpole", activity: 1, magnitude: 1 }))
    .filter((e) => withinWindow(e.start, now, EVENT_DAYS_AHEAD))
    .filter((e) => haversineMiles(LOCATION, e) <= EVENT_RADIUS_MILES);
}

// (b) Sports events from TheSportsDB (free, no key). Instead of brute-forcing
// every day (which gets us rate-limited: HTTP 429), we ask the smart way — look
// up each Atlanta team's NEXT games in one call, then keep home games in-window.
const ATLANTA_TEAMS = [
  { name: "Atlanta Braves", venue: "Truist Park" },      // MLB
  { name: "Atlanta United", venue: "Mercedes-Benz Stadium" }, // MLS
  { name: "Atlanta Hawks", venue: "State Farm Arena" },  // NBA
  { name: "Atlanta Falcons", venue: "Mercedes-Benz Stadium" }, // NFL
];
const tsdb = (path) => fetch(`https://www.thesportsdb.com/api/v1/json/3/${path}`);

async function sportsEvents(now) {
  const out = [];
  for (const team of ATLANTA_TEAMS) {
    try {
      const s = await (await tsdb(`searchteams.php?t=${encodeURIComponent(team.name)}`)).json();
      const id = s?.teams?.[0]?.idTeam;
      if (!id) continue;
      const n = await (await tsdb(`eventsnext.php?id=${id}`)).json();
      for (const ev of n?.events ?? []) {
        const home = (ev.strHomeTeam || "").includes("Atlanta");
        const venueStr = ev.strVenue || "";
        const venueMatch = Object.keys(ATLANTA_VENUES).find((v) => venueStr.includes(v));
        if (!home && !venueMatch) continue; // only HOME games = crowds in ATL
        const venueKey = venueMatch || team.venue;
        const { lat, lon } = ATLANTA_VENUES[venueKey];
        const start = ev.strTimestamp ? new Date(ev.strTimestamp)
          : new Date(`${ev.dateEvent}T${ev.strTime || "19:00:00"}`);
        if (!withinWindow(start, now, EVENT_DAYS_AHEAD)) continue;
        out.push({
          name: ev.strEvent, category: ev.strLeague || "Sports", venue: venueKey,
          start, lat, lon, source: "Sports", activity: 0.85, magnitude: 0.7,
        });
      }
    } catch { /* skip this team on any error */ }
  }
  return out;
}

// (c) Ticketmaster concerts/arts (optional — only if a key is present).
async function ticketmasterEvents(now) {
  if (!TM_KEY || TM_KEY.includes("your_")) return [];
  const end = new Date(now.getTime() + EVENT_DAYS_AHEAD * 864e5);
  const iso = (d) => d.toISOString().slice(0, 19) + "Z";
  const url = "https://app.ticketmaster.com/discovery/v2/events.json?" + new URLSearchParams({
    apikey: TM_KEY, latlong: `${LOCATION.lat},${LOCATION.lon}`,
    radius: String(EVENT_RADIUS_MILES), unit: "miles",
    startDateTime: iso(now), endDateTime: iso(end), size: "100", sort: "date,asc",
  });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Ticketmaster HTTP ${res.status}`);
  const events = (await res.json())?._embedded?.events ?? [];
  return events.map((e) => {
    const v = e?._embedded?.venues?.[0], loc = v?.location;
    if (!loc?.latitude) return null;
    const cat = e?.classifications?.[0]?.segment?.name ?? "Event";
    return {
      name: e.name, category: cat, venue: v?.name ?? "",
      start: e?.dates?.start?.dateTime ? new Date(e.dates.start.dateTime) : null,
      lat: parseFloat(loc.latitude), lon: parseFloat(loc.longitude),
      source: "Ticketmaster",
      activity: /festival|arts|family|misc/i.test(cat) ? 1 : /music/i.test(cat) ? 0.85 : 0.7,
      magnitude: /festival|fair/i.test(cat) ? 0.8 : 0.5,
    };
  }).filter(Boolean);
}

// --- Interesting places from OpenStreetMap (Overpass, free/no key) ---------
const OSM_CATEGORIES = [
  { q: '["amenity"="marketplace"]', label: "market", weight: 1.0 },
  { q: '["highway"="pedestrian"]', label: "pedestrian street", weight: 1.0 },
  { q: '["place"="square"]', label: "square", weight: 1.0 },
  { q: '["tourism"="artwork"]', label: "public art", weight: 0.9 },
  { q: '["tourism"="attraction"]', label: "attraction", weight: 0.85 },
  { q: '["tourism"="viewpoint"]', label: "viewpoint", weight: 0.85 },
  { q: '["amenity"="arts_centre"]', label: "arts centre", weight: 0.85 },
  { q: '["amenity"="theatre"]', label: "theatre", weight: 0.8 },
  { q: '["tourism"="gallery"]', label: "gallery", weight: 0.8 },
  { q: '["historic"]', label: "historic", weight: 0.75 },
  { q: '["leisure"="park"]', label: "park", weight: 0.7 },
  { q: '["amenity"="community_centre"]', label: "community", weight: 0.7 },
];

// Public Overpass servers get overloaded (HTTP 504). Try mirrors in turn.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
async function overpassQuery(query) {
  let lastErr;
  for (const url of OVERPASS_MIRRORS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "VantagePOC/0.1 (street-photography scout; contact desha.rogers@gmail.com)",
        },
        body: "data=" + encodeURIComponent(query),
      });
      if (!res.ok) { lastErr = new Error(`HTTP ${res.status} from ${url}`); continue; }
      return await res.json();
    } catch (e) { lastErr = e; }
  }
  throw lastErr ?? new Error("all Overpass mirrors failed");
}

async function fetchPlaces() {
  const parts = OSM_CATEGORIES
    .map((c) => `nwr${c.q}(around:${OSM_RADIUS_M},${LOCATION.lat},${LOCATION.lon});`).join("");
  const query = `[out:json][timeout:25];(${parts});out center 400;`;
  const elements = (await overpassQuery(query))?.elements ?? [];
  const places = elements.map((el) => {
    const lat = el.lat ?? el.center?.lat, lon = el.lon ?? el.center?.lon;
    if (!lat || !lon) return null;
    const tags = el.tags ?? {};
    const cat = OSM_CATEGORIES.find((c) => {
      const key = c.q.match(/"(\w+)"/)?.[1], val = c.q.match(/="([\w]+)"/)?.[1];
      return val ? tags[key] === val : tags[key] != null;
    }) ?? { label: "place", weight: 0.6 };
    return { name: tags.name || null, label: cat.label, weight: cat.weight, lat, lon };
  }).filter(Boolean);
  for (const p of places) {
    p.density = places.filter((q) => q !== p && metersBetween(p, q) <= DENSITY_RADIUS_M).length;
  }
  return clusterDistricts(places.filter((p) => p.name));
}

// Collapse nearby POIs into DISTRICTS so we surface "go to this area" instead of
// a list of 12 individual statues. Greedy: densest POI anchors a district and
// swallows everything within DISTRICT_MERGE_M; the most recognizable member names it.
const NAMEABILITY = { square: 6, market: 6, "pedestrian street": 6, park: 5, attraction: 5, viewpoint: 5, "arts centre": 4, gallery: 4, theatre: 4, historic: 2, "public art": 1, community: 3, place: 1 };
function clusterDistricts(places) {
  const byDensity = [...places].sort((a, b) => b.density - a.density);
  const claimed = new Set();
  const districts = [];
  for (const anchorSeed of byDensity) {
    if (claimed.has(anchorSeed)) continue;
    const members = places.filter((p) => !claimed.has(p) && metersBetween(anchorSeed, p) <= DISTRICT_MERGE_M);
    members.forEach((m) => claimed.add(m));
    // Name the district after its most recognizable member (not a random statue).
    const anchor = members.slice().sort((a, b) =>
      (NAMEABILITY[b.label] || 0) - (NAMEABILITY[a.label] || 0) || b.density - a.density)[0];
    districts.push({
      name: anchor.name, label: anchor.label,
      lat: anchorSeed.lat, lon: anchorSeed.lon,
      density: members.length,                       // district richness = how many spots inside
      weight: Math.max(...members.map((m) => m.weight)),
    });
  }
  return districts;
}

// --- Scoring & ranking ----------------------------------------------------
function scoreCandidates({ events, places, now, windows }) {
  const maxDensity = Math.max(1, ...places.map((p) => p.density));
  const out = [];

  for (const e of events) {
    const dist = haversineMiles(LOCATION, e);
    const hoursAway = e.start ? (e.start - now) / 3.6e6 : 999;
    const light = e.start ? lightScoreAt(e.start, windows) : 0.4;
    const score =
      W.proximity * clamp01(1 - dist / EVENT_RADIUS_MILES) +
      W.activity * e.activity +
      W.magnitude * (e.magnitude ?? 0.5) +
      W.light * light +
      W.soon * clamp01(1 - hoursAway / (EVENT_DAYS_AHEAD * 24));
    out.push({
      score, kind: "event", source: e.source, dist,
      title: e.name,
      sub: `${e.category}${e.venue ? " · " + e.venue : ""}`,
      when: e.start ? `${fmtDay(e.start)} ${fmtTime(e.start)}` : "date TBA",
      light: e.start ? labelForDate(e.start) : "—",
    });
  }

  for (const p of places) {
    const dist = haversineMiles(LOCATION, p);
    const density = p.density / maxDensity;
    const score =
      W.proximity * clamp01(1 - dist / 6) +
      W.density * density +
      W.category * p.weight +
      W.light * lightScoreAt(now, windows);
    out.push({
      score, kind: "place", source: "OSM", dist,
      title: `${p.name} area`,
      sub: `${p.label} district · ${p.density} things to shoot within a short walk`,
      when: "evergreen (dense/active area)",
      light: nextLightLabel(now, windows),
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, TOP_N);
}

// --- Main -----------------------------------------------------------------
const SOURCE_ICON = { Tentpole: "⭐", Sports: "⚽", Ticketmaster: "🎫", OSM: "📸" };

async function main() {
  const now = new Date();
  const windows = lightWindows(now, LOCATION);

  console.log(`\n📍  ${LOCATION.name} — ${now.toLocaleString("en-US")}`);
  console.log(`🌅  Tonight: golden ${fmtTime(windows.goldenEvening.start)}–${fmtTime(windows.goldenEvening.end)} · blue ${fmtTime(windows.blueEvening.start)}–${fmtTime(windows.blueEvening.end)}`);
  console.log(`🔎  Date range: ${fmtDay(now)} → ${fmtDay(new Date(now.getTime() + EVENT_DAYS_AHEAD * 864e5))}\n`);
  if (!TM_KEY || TM_KEY.includes("your_")) console.log("    (no Ticketmaster key — concerts/arts skipped; everything else is free)\n");

  const [tentpole, sports, tm, places] = await Promise.all([
    Promise.resolve(tentpoleEvents(now)),
    sportsEvents(now).catch((e) => { console.error("Sports failed:", e.message); return []; }),
    ticketmasterEvents(now).catch((e) => { console.error("Ticketmaster failed:", e.message); return []; }),
    fetchPlaces().catch((e) => { console.error("OSM failed:", e.message); return []; }),
  ]);

  const events = [...tentpole, ...sports, ...tm];
  console.log(`   events: ${events.length}  (⭐${tentpole.length} tentpole · ⚽${sports.length} sports · 🎫${tm.length} ticketmaster)`);
  console.log(`   places: ${places.length} named\n`);

  const ranked = scoreCandidates({ events, places, now, windows });
  if (!ranked.length) { console.log("No candidates — check network or widen the radius."); return; }

  console.log("─".repeat(68));
  console.log("  GO SHOOT HERE — top picks near you (events + dense areas, ranked)");
  console.log("─".repeat(68));
  ranked.forEach((r, i) => {
    console.log(`\n${String(i + 1).padStart(2)}. ${SOURCE_ICON[r.source] || "•"} ${r.title}   (score ${r.score.toFixed(0)}, ${r.source})`);
    console.log(`    ${r.sub}`);
    console.log(`    ${r.dist.toFixed(1)} mi · ${r.when}`);
    console.log(`    light: ${r.light}`);
  });
  console.log("\n" + "─".repeat(68));
  console.log("Do these look worth going to? That's the whole test.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
