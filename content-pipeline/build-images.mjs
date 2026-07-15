// ---------------------------------------------------------------------------
// Vantage content pipeline — STAGE 4: IMAGES (per city).
//
// ADR decision D3: one stylized illustration per spot via OpenAI GPT Image 1.5,
// driven by the ILLUSTRATION_STYLE.md master block + a per-light-window palette,
// then WebP-compressed under 300 KB. Honest: evocative art, never a fake photo
// of the real place. Saves to out/images/<city>/<id>.webp for HUMAN REVIEW;
// uploading to Supabase Storage + filling spots.image_url is the next step.
//
// Run:  npm run images -- nashville            (all spots for the city)
//       npm run images -- nashville --limit=1  (cheap taste test)
//       npm run images -- nashville --dry      (print prompts, no spend)
// Needs OPENAI_API_KEY (loaded from .env by the npm script).
// ---------------------------------------------------------------------------

import OpenAI from "openai";
import sharp from "sharp";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const MODEL = "gpt-image-1.5";
const SIZE = "1024x1024";
const QUALITY = "medium";   // ~$0.07/image; bump to "high" only if medium reads flat
const MAX_KB = 300;

const args = process.argv.slice(2);
const cityKey = (args.find((a) => !a.startsWith("--")) || "nashville").toLowerCase();
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.slice(8), 10) : null;
const dry = args.includes("--dry");

// Palette per light window — straight from docs/design/ILLUSTRATION_STYLE.md.
const PALETTE = {
  golden: "warm amber, burnt orange, deep-brown shadows, cream highlights",
  blue: "cobalt and deep navy with electric teal and magenta neon accents",
  flat: "soft sage green and muted grey-green, diffuse overcast light",
};
const MASTER =
  "Editorial travel illustration, textured screen-print / risograph aesthetic, " +
  "painterly with visible grain, atmospheric and moody, cinematic lighting, " +
  "evocative not photorealistic, people only as loose silhouettes, " +
  "no text, no logos, no watermarks, clean composition.";

// Evocative, NOT literal — lean on the drafted vibe (reason/type), not the exact
// real place, so it reads as mood art rather than a fake documentary photo.
const buildPrompt = (s) => {
  const pal = PALETTE[s.windowType] || PALETTE.golden;
  const light = s.windowType === "blue" ? "blue hour" : s.windowType === "flat" ? "soft overcast light" : "golden hour";
  return `${s.reason}. An atmospheric ${(s.type || "street").toLowerCase()} scene at ${light}. Palette: ${pal}. ${MASTER}`;
};

let spots = JSON.parse(readFileSync(new URL(`./content/${cityKey}.json`, import.meta.url), "utf8"));
if (limit && limit > 0) spots = spots.slice(0, limit);

if (dry) {
  for (const s of spots) console.log(`\n── ${s.id} (${s.windowType}) ──\n${buildPrompt(s)}`);
  console.log(`\n(${spots.length} prompts · dry run, no spend)`);
  process.exit(0);
}

// Compress a PNG buffer to a WebP under MAX_KB (step quality down until it fits).
async function toWebp(png) {
  for (const q of [82, 72, 62, 52, 44]) {
    const buf = await sharp(png).resize(1024, 1024, { fit: "cover" }).webp({ quality: q }).toBuffer();
    if (buf.length <= MAX_KB * 1024) return { buf, q };
  }
  return { buf: await sharp(png).resize(1024, 1024, { fit: "cover" }).webp({ quality: 40 }).toBuffer(), q: 40 };
}

const client = new OpenAI();
const dir = new URL(`./out/images/${cityKey}/`, import.meta.url);
mkdirSync(dir, { recursive: true });

console.log(`Generating ${spots.length} ${cityKey} illustrations with ${MODEL} (${QUALITY})...\n`);
for (const s of spots) {
  process.stdout.write(`  ${s.id.padEnd(30)} `);
  const r = await client.images.generate({ model: MODEL, prompt: buildPrompt(s), size: SIZE, quality: QUALITY });
  const png = Buffer.from(r.data[0].b64_json, "base64");
  const { buf, q } = await toWebp(png);
  writeFileSync(new URL(`${s.id}.webp`, dir), buf);
  console.log(`✓ ${(buf.length / 1024).toFixed(0)}KB (webp q${q})`);
}
console.log(`\nwrote ${spots.length} images → content-pipeline/out/images/${cityKey}/  (review them, then we upload)`);
