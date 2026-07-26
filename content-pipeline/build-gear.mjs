// build-gear.mjs — generate the push's camera catalog from the single source of truth.
//
// The nightly nudge Edge Function (Deno) can't import the app's lib/, so its camera
// catalog is GENERATED from vantage/lib/cameras.catalog.json into a committed file the
// function imports. Run `node build-gear.mjs` after editing the catalog.
// vantage/__tests__/parity.test.ts fails if the generated file drifts from the JSON.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = join(here, "..", "vantage", "lib", "cameras.catalog.json");
const OUT = join(here, "..", "vantage", "supabase", "functions", "nudge", "cameras.gen.ts");

const catalog = JSON.parse(readFileSync(SRC, "utf8"));

const rows = catalog.cameras.map((c) => {
  const fl = c.fixedLens
    ? `, fixedLens: { minFocal: ${c.fixedLens.minFocal}, maxFocal: ${c.fixedLens.maxFocal}, maxAperture: ${c.fixedLens.maxAperture} }`
    : "";
  return `  "${c.id}": { id: "${c.id}", model: ${JSON.stringify(c.model)}, cropFactor: ${c.cropFactor}${fl} },`;
});

const out = `// GENERATED from vantage/lib/cameras.catalog.json by content-pipeline/build-gear.mjs.
// DO NOT EDIT — edit the JSON and re-run \`node build-gear.mjs\`. Guarded by parity.test.ts.
export type CameraRow = { id: string; model: string; cropFactor: number; fixedLens?: { minFocal: number; maxFocal: number; maxAperture: number } };

export const CAMERAS: Record<string, CameraRow> = {
${rows.join("\n")}
};
`;

writeFileSync(OUT, out);
console.log(`[build-gear] wrote ${catalog.cameras.length} cameras → ${OUT}`);
