# Vantage — Backlog (epics & stories)

**How we work (calibrated to stage):** epics/themes are mapped out now for tracking; **stories get detailed just-in-time** for the epic we're about to build (not the whole tree upfront), because the product is still pre-validation and requirements will shift. **Acceptance criteria + automated tests** are written for stable, regression-prone logic — not everything. Rigor scales up as the product validates or the team grows.

**Status:** ✅ done · ▶ in progress · 🎯 next · ⬜ planned · ◽ later

---

## E0 · App shell & core UX  ✅ (built)
The nudge-first app, rebuilt from the Claude Design handoff v2.
- ✅ Today — gear banner, "your shoot tonight", inspiration hero + "why this pick?", ranked "best near you"
- ✅ Spot detail — hero, why, live light-ramp chart, "what to look for", gallery, getting there
- ✅ Plan — this-week slate, day groups, Light/Activity/Event tags, "I'm going"
- ✅ Bag — gear onboarding (cameras, lens/style chips)
- ✅ Lock — notification moment → tap to enter
- ✅ Bottom tab nav (Today / Plan / Bag)
- ◽ Saved collection screen (hearts persist somewhere) — deferred

---

## E1 · Content  🎯 NEXT — the biggest open workstream
The app currently runs on 5 hand-curated Atlanta spots + Unsplash placeholders. This epic answers: where does real content come from, and in what voice?
- 🎯 **C1 — Spot sourcing strategy.** Decide how spots are generated/curated at scale (LLM-assisted from OSM + local knowledge? editorial? community?). *AC: a documented, repeatable way to produce a new city's spot list with the fields the UI needs (name, why, look-for, getting-there, coords, window type).*
  - ⏸️ **Content-drafting pipeline BUILT, running DEFERRED** (`content-pipeline/generate.mjs`): places (name+coords+genre) → Claude (`claude-opus-4-8`, structured output = the `Spot` schema, voice guide baked in) → reviewable `out/atlanta.json`. Validated the *quality* by hand (8 ATL spots, user approved). **Not worth the API spend pre-validation** — the app runs fine on the 5 curated placeholder spots, and bulk generation only pays off once we need volume (launch, or a 2nd city). Code is committed; has never been run (no `out/atlanta.json`, no key used). WHEN REVISITED: run it (needs ANTHROPIC_API_KEY), review output, wire JSON into `vantage/lib/spots.ts`. Still separate: the *curation* step (which places make the list — OSM + local knowledge).
- ✅ **C2 — Imagery (interim).** AI-generated **stylized illustrations** as honest placeholders (art, not fake photos of real places). Direction + copy-paste prompts at `docs/design/ILLUSTRATION_STYLE.md`. DONE: user generated all 5, wired into `vantage/assets/spots/*.png` + `lib/spots.ts` (local `require()` map replacing the Unsplash URLs, `img()` now returns a bundled module); the "what people shoot here" gallery was REMOVED (can't honestly show illustrations as real user photos). Typecheck + 32 tests pass. FOLLOW-UPS (deferred): images are ~3 MB each / ~15 MB total — resize/compress before ship; real place photography (user's own / Wikimedia) is still the eventual replacement. *AC met: hero images load per spot; no fake stock misrepresenting a place.*
- ✅ **C3 — Voice & tone guide.** 1-page guide at `docs/design/VOICE.md` (extracted from the pipeline's baked-in voice + the gold-standard spot copy). Existing app copy audited against it: mostly on-voice; fixed 2 real drifts — invented hours ("last entry 9 PM" / "parking after 7 PM" → generalized, per the honesty rule) + Plan-screen jargon tags (Light/Activity/Event-driven → "The light" / "The crowd" / "Happening"). Open polish (logged, not done): Plan fit-label register, generic "Add your gear", hardcoded "M" avatar. Imagery-misrepresentation flag handed to C2.
- ⬜ **C4 — Content generation pipeline.** Tooling to draft per-spot copy at scale, human-reviewed.
- Note: mixed-genre content (street + cityscape + nature) is confirmed good — validated as "top areas to shoot today."

---

## E2 · Personalization & Gear  ⬜
Make "your kit" real and load-bearing (it's currently a static "35mm").
- ✅ **G1 — Persist the gear profile.** Selected lenses persist on-device via AsyncStorage (`lib/gearStorage.ts`) — hydrated on launch, saved on change, survives reload. Verified: 46 tests (incl. save/load round-trip + corrupt-data guards) + clean headless web bundle. (Camera still fixed X100VI, so only lenses persist for now; backend sync is later.)
- ✅ **G2 — Gear → subject matching.** Telephoto→distance/sports; fast prime→low-light street; wide→architecture; macro→details. Drives the "why … your kit" line and per-spot "fits/grab a tele". CATALOG + MATCHING ENGINE BUILT: `vantage/lib/gear.ts` (19 cameras, 24 lenses w/ real specs; `equivalentFocal`/`genresForLens`/`genresForKit`, crop-factor aware) + `__tests__/gear.test.ts`. WIRED INTO THE APP (2026-07-12): Bag screen is catalog-backed with a live "Your kit shoots" row (`lib/gearProfile.ts`); Today hero + Lock copy name the lens that actually fits tonight's spot — annotate-only + honest (a tele won't be called a street lens; falls back to the street-capable body). Spots gained a `genre` field for the fit check. DONE: camera picker — pick from all 19 catalog bodies on the Bag screen → the kit recomputes per body (e.g. a 35mm reads differently full-frame vs APS-C) → persists across reload. Verified end-to-end in-browser. ✅ G1 persistence (camera + lenses) · ✅ Plan "fits" labels gear-aware (`fitLabel`, honest — never claims a lens that doesn't cover the spot) · ✅ Today/Lock copy gear-aware. Known simplifications: phones filed as "1-inch" (crop math still lands ~24mm); `genresForKit` assumes any lens fits any body (over-generous — future: match lenses to compatible mounts). **ADR: `docs/engineering/GEAR_MATCHING.html`** (rules + the open filter/re-rank/annotate decision).
- ⬜ **G3 — Gear banner re-prompt logic.** Dismiss = 30-day floor; re-ask event-based (after "I'm going" / on 2nd–3rd return), not a blind timer.

---

## E3 · The nudge & notifications  ⬜
Turn the in-app hero into an actual proactive nudge — the north star.
- ▶ **N1 — "Is today great?" threshold.** A quality bar that decides whether to nudge at all (inspire, don't nag). BRAIN BUILT: `lib/nudge.ts` — `tonightNudge(now, camera, lenses)` scores every spot (light-timing × gear-fit; activity = weight-0 placeholder for events), picks the best, returns go/no-go + confidence + Why-signals. Pure/testable (13 tests). NOT yet wired into the app UI (next slice: drive the Today hero pick + Lock nudge + "Why this pick?" from the verdict). Honest: with no weather/events yet, "light" scores WHEN the good light is, not cloud cover.
- ⬜ **N2 — Push delivery** (`expo-notifications` + backend trigger). Requires E4 + a dev/prod build.
- ⬜ **N3 — Nudge copy generation** — personal, non-spammy, gear-aware.
- ⬜ **N4 — Shooting check-in / journal.** "Did you get out?" → doubles as the engagement/return metric *and* a shooting log (opt-in photo match later).

---

## E4 · Backend & data  ⬜
- ⬜ **B1 — Supabase** — DB + auth + storage foundation.
- ⬜ **B2 — Precompute + serve** — scheduled job generates districts per city into Postgres; app reads a ready list (near-instant loads; no phone hits Overpass). *(Layer 1 of the "loads instant" plan.)*
- ⬜ **B3 — On-device cache** — stale-while-revalidate; instant relaunch even before a backend. *(Layer 2 — cheap early win.)*
- ⬜ **B4 — Real events integration** — ESPN (sports, proven) + tentpole editorial (+ Ticketmaster later), geo-filtered. (Prototyped in `archive/poc`.)
- ◽ **B5 — Supply analysis** — run the engine across many days/times to measure how many worth-it options a day has (decides single-hero vs. list). Partial until N1 exists.

---

## E5 · Platform & ship  ⬜
- ⬜ **P1 — Dev build** (EAS) so it runs on real phones (unblocks device testing; current SDK 57 > store Expo Go).
- ⬜ **P2 — Real location** (device GPS) instead of hardcoded downtown Atlanta.
- ⬜ **P3 — Weather (Open-Meteo)** → weather-aware light chart (cloud cover tempers golden hour).
- ◽ **P4 — Accounts / auth** (anonymous → real, once cross-device sync matters).
- ◽ **P5 — App Store + Play submission.**

---

## E6 · Quality & maintainability  ▶
- ✅ **Q1 — Dead code removed** (old OSM areas/events + old components).
- ✅ **Q2 — Unit tests on core logic** (`lib/light.ts`, `lib/spots.ts`) incl. a regression guard for the suncalc degrees/radians gotcha. `npm test`.
- ⬜ **Q3 — Metrics instrumentation** — engagement (nudge response + return), "I'm going" taps. Truth-checked against real shooting.
- ⬜ **Q4 — Error / loading / empty states** across screens (network images, data fetches).
- ◽ **Q5 — Component / e2e tests** once flows stabilize.
- ◽ **Q6 — Accessibility pass** (labels, contrast, touch targets).
