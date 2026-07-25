// Parity guard — the app brain vs. the nightly-push brain must agree.
//
// WHY THIS EXISTS: the scoring "brain" lives in TWO runtimes that can't share code
// directly — the app (lib/nudge.ts + lib/weather.ts, React-Native/Jest) and the nightly
// push (supabase/functions/nudge/index.ts, Deno). The push file re-implements the same
// weights, thresholds, and curves by hand. Nothing at runtime checks they still match, so
// a change to a weight in ONE place silently makes the push disagree with the app: the
// notification headlines a spot the app wouldn't. That was the top drift risk in the repo.
//
// This test reads the raw source of both files and asserts the scoring constants are
// identical. It is deliberately a SOURCE check (not an import) because Jest can't load the
// Deno module (jsr:/npm: specifiers, Deno.serve). If it fails, you changed the brain in one
// place and not the other — update BOTH files so app and push stay in step.
//
// Covers: light/gear weights, the go bar, per-genre light sensitivity, the golden/blue/flat
// reference fit, the cloud-cover curve, and the light-timing buckets. If you add a new
// scoring constant to the brain, add it here too.
import * as fs from "fs";
import * as path from "path";

const APP_NUDGE = read("lib/nudge.ts");
const APP_WEATHER = read("lib/weather.ts");
const PUSH = read("supabase/functions/nudge/index.ts");

function read(rel: string): string {
  return fs.readFileSync(path.join(__dirname, "..", rel), "utf8");
}

// Grab the first capture group of `re` in `src`, or fail loudly (a renamed/removed constant
// should break the test, not slip through as a silent match).
function grab(src: string, label: string, re: RegExp): string {
  const m = src.match(re);
  if (!m) throw new Error(`parity: could not find ${label} — did a constant get renamed?`);
  return m[1].trim();
}

// A scalar constant like `LIGHT_W = 0.6` (matches both `const X = 0.6;` and `X = 0.6,`).
const scalar = (src: string, name: string) => grab(src, name, new RegExp(`${name}\\s*=\\s*([0-9.]+)`));

// Every `key: number` pair inside the `{...}` that follows `name`, as a normalized string.
function numberMap(src: string, name: string): string {
  const start = src.indexOf(name);
  if (start === -1) throw new Error(`parity: could not find ${name}`);
  const open = src.indexOf("{", start);
  const close = src.indexOf("}", open);
  const body = src.slice(open + 1, close);
  const pairs = [...body.matchAll(/(\w+)\s*:\s*([0-9.]+)/g)].map((m) => `${m[1]}=${Number(m[2])}`);
  pairs.sort();
  return pairs.join(",");
}

// The ordered list of numeric literals inside a `function name(...) {...}` body — captures
// the light-timing buckets (1.0 / 0.9 / 0.6 / 0.45 / 0.2 and the 2h/6h edges) regardless of
// one-line vs multi-line formatting.
function fnNumbers(src: string, name: string): string {
  const sig = src.indexOf(`function ${name}`);
  if (sig === -1) throw new Error(`parity: could not find function ${name}`);
  const open = src.indexOf("{", sig);
  let depth = 0, end = open;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) { end = i; break; }
  }
  const body = src.slice(open + 1, end);
  return [...body.matchAll(/(?<![\w.])(\d+\.\d+|\d+)(?![\w.])/g)].map((m) => Number(m[1])).join(",");
}

describe("app brain ⟷ push brain parity (lib/nudge.ts + lib/weather.ts ⟷ supabase/functions/nudge)", () => {
  test("light/gear weights and the go bar match", () => {
    for (const name of ["LIGHT_W", "GEAR_W", "GO_THRESHOLD"]) {
      expect(`${name}=${scalar(PUSH, name)}`).toBe(`${name}=${scalar(APP_NUDGE, name)}`);
    }
  });

  test("REF_FIT (golden/blue/flat reference light quality) matches", () => {
    expect(numberMap(PUSH, "REF_FIT")).toBe(numberMap(APP_NUDGE, "REF_FIT"));
  });

  test("LIGHT_SENSITIVITY (per-genre light dependence) matches", () => {
    expect(numberMap(PUSH, "LIGHT_SENSITIVITY")).toBe(numberMap(APP_NUDGE, "LIGHT_SENSITIVITY"));
  });

  test("cloudFactor curve (coefficients + smoothstep knees) matches", () => {
    // The shape of the curve, not incidental clamp literals: each `coeff * smoothstep(a, b, c)`
    // term — golden/blue `0.6 * smoothstep(0.15, 1, …)`, flat `0.12 * smoothstep(0.4, 1, …)`.
    // (weather.ts inlines the clamp; the push uses a clamp01() helper — that difference is fine.)
    const curve = (src: string) =>
      [...src.matchAll(/([0-9.]+)\s*\*\s*smoothstep\(\s*([0-9.]+)\s*,\s*([0-9.]+)/g)]
        .map((m) => `${Number(m[1])}*ss(${Number(m[2])},${Number(m[3])})`)
        .join(" | ");
    const push = curve(PUSH), app = curve(APP_WEATHER);
    expect(push).not.toBe(""); // guard: extractor must actually match something
    expect(push).toBe(app);
  });

  test("lightTiming buckets (happening / imminent / later / gone) match", () => {
    expect(fnNumbers(PUSH, "lightTiming")).toBe(fnNumbers(APP_NUDGE, "lightTiming"));
  });
});
