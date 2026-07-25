# Vantage — the app (agent guide)

**Read `https://docs.expo.dev/versions/v57.0.0/` before writing Expo code.** Expo changes fast and this project pins **SDK 57** — use the versioned docs, not memory.

Vantage is an Expo / React Native app that gives a photographer a personal reason to shoot *tonight* — the right place and light, matched to the gear in their bag. It nudges only when the light and kit line up. **Honest by principle:** never invent data (no fake hours, GPS distances, or stock photos). If the app doesn't know, it doesn't say.

## Commands (run from `vantage/`)

```bash
npm install            # first time, or after a dependency change
npm test               # Jest unit tests (the main safety net)
npm run typecheck      # tsc --noEmit — strict TypeScript
npm run check          # typecheck + test — run this before you commit
npm run lint           # ESLint (eslint-config-expo)
npm start              # Expo dev server; press w for web
npm run android        # run on a connected Android device / emulator
```

`npm run check` is the one command that proves your change is sound. The phone needs a **dev build** (store Expo Go is older than SDK 57); `w` for web is the quickest way to eyeball a change.

## How it fits together

```
 Expo app (this folder)  ──anon auth + gear sync──▶  Supabase (Postgres + RLS)
      ▲                                                     │
      │                                          pg_cron, nightly ~6pm Atlanta
  Expo Push  ◀──── the "nudge brain" (Deno Edge Function) ◀─┘
```

- **`lib/`** — the logic, as small pure modules with colocated tests in `__tests__/`. The core is the **nudge brain** (`lib/nudge.ts`): score every spot for tonight from light timing × gear fit × weather, pick the best, decide whether it clears the bar to nudge. Supporting: `light.ts` (SunCalc light windows), `weather.ts` (Open-Meteo cloud cover), `gear.ts` / `gearProfile.ts` (kit → shootable genres), `spots.ts` / `cityPack.ts` (spot data from Postgres).
- **`components/`** — the screens: Lock → Today → Spot detail → Plan + Bag.
- **`supabase/functions/nudge/index.ts`** — the nightly push, a **Deno** re-implementation of the brain (Deno can't import the RN app modules).

### ⚠ The one thing that bites: the two-headed brain

The scoring brain lives in **two runtimes** — `lib/nudge.ts` (app) and `supabase/functions/nudge/index.ts` (push). The weights, the go bar, `REF_FIT`, `LIGHT_SENSITIVITY`, `cloudFactor`, and the `lightTiming` buckets are **hand-mirrored** across both. **If you change scoring, change BOTH files.** `__tests__/parity.test.ts` reads both sources and fails if they drift — trust it, and keep it updated when you add a new scoring constant.

## How we work here

- **Tests for regression-prone logic** (scoring, gear, light, weather) — not every line, but the stuff that quietly breaks. Add/adjust tests with the code.
- **Strict TypeScript.** `npm run check` must be green before a commit.
- **Decisions get an ADR** in `../docs/engineering/` and an index entry in `../docs/engineering/ADRS.md`. Record *why*, not just what.
- **Docs move with the code.** A pre-commit hook reminds you to update `../docs/BACKLOG.md`, the README, any affected ADR, and memory. Keep them current.

## Where to look

- **`../docs/ONBOARDING.html`** — the full role-based onboarding + file-by-file map. Start here if you're new.
- **`../PROJECT_MAP.md`** — the working map: folders, doc index, dated status log.
- **`../docs/BACKLOG.md`** — what's shipped and what's next. Start here for "what should I do?"
- **`../docs/engineering/ADRS.md`** — index of architecture decisions (why the code is the way it is).
