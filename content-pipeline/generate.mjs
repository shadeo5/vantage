// ---------------------------------------------------------------------------
// Vantage content pipeline (per city)
//
// The 4-step assembly line, formalized from the hand-drafted proof:
//   1. INPUT     — a list of real places (name, genre, coordinates)
//   2. RECIPE    — a fixed prompt + a fixed output schema (the reusable asset)
//   3. TRANSFORM — Claude drafts each place's content, constrained to the schema
//   4. OUTPUT    — write reviewable JSON the app can consume
//
// The "curation" question (which places make the list) is separate — handled
// upstream (OSM + local knowledge). This script is the CONTENT-DRAFTING step:
// given a place, write it up in the app's voice. Human review is step 5 (you).
//
// Run:  npm install   then   npm run generate
// Needs Anthropic credentials (ANTHROPIC_API_KEY or `ant auth login`).
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const MODEL = "claude-opus-4-8";
const CONCURRENCY = 3; // gentle on rate limits

// ---- 1. INPUT: the human-vetted places from stage 2 (Curate → Vet) ----
// content-pipeline/vetted/<city>.json — each { name, genre, genres[], lat, lon }.
//   npm run generate -- nashville     (defaults to nashville)
const cityKey = (process.argv[2] || "nashville").toLowerCase();
const CITY = cityKey.split("-").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
let PLACES;
try {
  PLACES = JSON.parse(readFileSync(new URL(`./vetted/${cityKey}.json`, import.meta.url), "utf8"));
} catch {
  console.error(`Could not read content-pipeline/vetted/${cityKey}.json — run \`npm run curate -- ${cityKey}\` and vet it first.`);
  process.exit(1);
}
if (!Array.isArray(PLACES) || !PLACES.length) { console.error(`vetted/${cityKey}.json is empty.`); process.exit(1); }

// ---- 2a. VOICE: the app's writing guide (part of the reusable recipe) ----
const VOICE = `Vantage's voice: inspiring, personal, and concrete — like a local photographer friend
telling you where to go. Warm but not flowery. Specific over generic ("backlit murals on Auburn Ave
at dusk", not "great photo opportunities"). Second person, present tense, active voice. Never salesy,
never gatekeeping. Assume the reader is an enthusiast who wants a reason to grab their camera tonight.`;

// ---- 2b. SCHEMA: the exact Spot content shape (structured output enforces it) ----
const SPOT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    type: { type: "string", description: "Short genre label, e.g. Street, Cityscape, Nature, Street art, Architecture, Historic, Market" },
    windowType: { type: "string", enum: ["golden", "blue", "flat"], description: "Best light: golden hour, blue hour, or flat/overcast day" },
    reason: { type: "string", description: "One short line for a list row (max ~7 words), e.g. 'Neon and spray paint after dark'" },
    tagline: { type: "string", description: "One short line under the title on the detail screen" },
    why: { type: "string", description: "2-3 sentences on why this place is worth shooting and what makes it special" },
    look: { type: "array", items: { type: "string" }, description: "Exactly 3 concrete 'what to look for here' tips — specific frames, corners, moments" },
    getting: { type: "string", description: "One practical line: how to get there, parking, transit" },
  },
  required: ["type", "windowType", "reason", "tagline", "why", "look", "getting"],
};

// ---- 2c. PROMPT: turns one place into a drafting instruction ----
function buildPrompt(place) {
  const genres = (place.genres && place.genres.length ? place.genres : [place.genre]).join(", ");
  return `${VOICE}

Write the Vantage spot content for this real place in ${CITY}:
- Name: ${place.name}
- Genres it suits (primary first): ${genres}

Rules:
- Ground everything in what a photographer would actually find there; use real, specific detail.
- Lead with the primary genre, but the "look" tips can nod to the others when they're genuinely there.
- "look" must contain EXACTLY 3 tips, each a concrete frame or moment.
- Pick "windowType" from the light that genuinely suits this place (street/night scenes often blue; open vistas golden; murals/markets can be flat).
- Do not invent precise facts you can't be reasonably sure of (exact hours, prices, "last entry"). Keep logistics general.
- Keep the voice consistent with the guide above.`;
}

// ---- 3. TRANSFORM: draft one place, constrained to the schema ----
const client = new Anthropic();

async function draftOne(place) {
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1200,
    thinking: { type: "disabled" }, // simple in-voice generation; keep it fast/cheap
    output_config: { format: { type: "json_schema", schema: SPOT_SCHEMA } },
    messages: [{ role: "user", content: buildPrompt(place) }],
  });
  // With output_config.format, the first text block is valid JSON matching the schema.
  const textBlock = res.content.find((b) => b.type === "text");
  const content = JSON.parse(textBlock.text);
  return {
    id: place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
    name: place.name,
    genre: place.genre,                                   // primary (typed Genre) — vetted
    genres: place.genres ?? [place.genre],                // multi-genre array, primary first
    lat: place.lat,
    lon: place.lon,
    ...content,                                           // type, windowType, reason, tagline, why, look, getting
    _tokens: res.usage,
  };
}

// small concurrency limiter
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

// ---- 4. OUTPUT ----
async function main() {
  console.log(`Drafting ${PLACES.length} ${CITY} spots with ${MODEL}...\n`);
  let inTok = 0, outTok = 0;
  const spots = await mapLimit(PLACES, CONCURRENCY, async (p) => {
    const s = await draftOne(p);
    inTok += s._tokens.input_tokens; outTok += s._tokens.output_tokens;
    console.log(`  ✓ ${s.name.padEnd(28)} ${s.type} · ${s.windowType}`);
    delete s._tokens;
    return s;
  });

  mkdirSync(new URL("./out", import.meta.url), { recursive: true });
  const outPath = new URL(`./out/${cityKey}.json`, import.meta.url);
  writeFileSync(outPath, JSON.stringify(spots, null, 2));

  // rough cost: Opus 4.8 is $5 / $25 per 1M tokens (in / out)
  const cost = (inTok / 1e6) * 5 + (outTok / 1e6) * 25;
  console.log(`\nWrote ${spots.length} spots → content-pipeline/out/${cityKey}.json`);
  console.log(`Tokens: ${inTok} in / ${outTok} out  ·  ~$${cost.toFixed(3)}`);
}

main().catch((e) => { console.error("\nPipeline failed:", e.message); process.exit(1); });
