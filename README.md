# Vantage — project map

Start here. Vantage is a mobile app that gives a photographer a personal reason to shoot **today** — the right place, right light, matched to their gear. An inspiration engine, not a utility.

> **Anti-drift rule:** This README is the map. **Only the docs listed under "current" below are the plan.** Anything in `archive/` is history — kept for reference, but do **not** treat it as direction. If a doc isn't on this map, it's not current.

## The folders

```
vantage/           👉 THE APP (Expo / React Native). Run it, build it here.
content-pipeline/  👉 LLM content generator (places -> spot content). Built; running deferred.
docs/              👉 CURRENT thinking — strategy, design, engineering.
archive/           👉 Superseded / done-with stuff. History, not the plan.
```

## `vantage/` — the app
The redesigned, nudge-first app (built from the Claude Design handoff v2): **Lock** (notification) → **Today** (gear banner + inspiration hero + "why this pick?" + ranked areas) → **Spot detail** (light-ramp chart + what-to-look-for + gallery) → **Plan** (this-week slate) + **Bag** (gear onboarding), with a bottom tab bar. Curated Atlanta content, live SunCalc light.
- **Run it:** `cd vantage && npx expo start`, then press `w` for web (phone needs a dev build — store Expo Go is older than SDK 57).
- **Test it:** `cd vantage && npm test` (unit tests on `lib/light.ts` + `lib/spots.ts`).

## `content-pipeline/` — the content generator
Places (name + coords + genre) → Claude (`claude-opus-4-8`, structured output = the `Spot` shape, voice guide baked in) → reviewable `out/atlanta.json`.
- **Status:** built + hand-validated, but **running is deferred** — not worth the API spend pre-validation. The app runs fine on curated spots; bulk generation pays off at launch or for a 2nd city.
- **When we revisit:** `cd content-pipeline` → `export ANTHROPIC_API_KEY=sk-ant-…` → `npm run generate`. (Needs your own Anthropic **API** key — separate from a Claude subscription.)
- Or: I can draft spot content in-session (free) when you don't need the automated version.

## `docs/` — current source of truth

**Which doc for which question:**

**`docs/strategy/`** — *why we're doing this & who we serve*
- `NORTH_STAR.html` — the vision (inspire dormant + active shooters; the nudge)
- `PRODUCT_BRIEF.html` — customer interrogation (assumptions, risks, personas)
- `COMPETITIVE_LANDSCAPE.html` — who else is out there; our open quadrant

**`docs/design/`** — *what it looks like, how it flows, how it sounds*
- `handoff_v2/` — **the current design** (nudge-first, the app was built from this)
- `VOICE.md` — **voice & tone guide** — how everything Vantage says should sound (kept in sync with the pipeline's baked-in voice)
- `ILLUSTRATION_STYLE.md` — **interim spot imagery** — the illustrated-placeholder look + copy-paste prompt recipe (placeholder, not final)

**`docs/engineering/`** — *how it's built*
- `TECH_DECISIONS.html` — living record of technical choices
- `EVENTS_ARCHITECTURE.html` — ADR: how events + spots reconcile (Opportunity model, photo-lens gate, eclipse rule) — for the deferred events epic (E4)
- `GEAR_MATCHING.html` — ADR: how a photographer's kit maps to shootable genres (the matching engine, + the open "filter vs. re-rank vs. annotate" decision) — epic E2/G2
- `PUSH_ARCHITECTURE.html` — ADR: how the in-app nudge becomes a real push (Supabase cron → the ported brain → Expo Push) — **shipped** (E4 + E3/N2)

**`docs/BACKEND_FIELD_GUIDE.html`** — plain-English visual walkthrough of the whole push backend (Supabase · Expo · Firebase, what each does + why). Great starting point if the backend feels like a lot.

**`docs/UX_REVIEW.html`** — full prioritized UX audit (Jul 13): 2 P0 · 7 P1 · 6 P2, screen-by-screen + on-device checklist. Top fixes: Bag-tab onboarding chrome, Plan's wrong/hardcoded dates.

**`docs/BACKLOG.md`** — the **epic-organized backlog** (epics → just-in-time stories). **Start here for "what's next."**

## `archive/` — history, NOT the plan
Superseded by the strategy pivot (route-planning → nudge-first) or finished work. Readable if you need the backstory; never a source of direction.
- `docs/PLAN.md` — v1 build plan (route-planning era); superseded by `BACKLOG.md` + the pivot
- `docs/POC_ATLANTA.md` — the original proof-of-concept spec; the POC is **done ✅**
- `docs/DESIGN_BRIEF.md` — the paste-ready brief that *produced* handoff_v2; job done
- `docs/WIRES.html` — v1 low-fi wireframes; superseded by the built app
- `docs/design_handoff_vantage/` — the ORIGINAL v1 mockup; superseded by `handoff_v2/`
- `poc/` — the throwaway script that validated the whole idea (still runnable: `cd archive/poc && npm run scout`)
- `Photographer Location Scout App.zip` — original design zip (extracted into `docs/design_handoff_vantage/`); safe to delete anytime

## Where we are (Jul 16, 2026)
Strategy locked. Redesigned app **built** (5 screens + nav), unit-tested (90 tests), and now backed by a **live backend that pushes on its own.**
- **E1 Content — pipeline LIVE (scaling now).** Illustrated imagery on the 5 spots; voice guide + copy audit. Content-at-scale pipeline (`docs/engineering/CONTENT_PIPELINE.html`) **built and run**: `content-pipeline/curate.mjs` (OSM → genre-scored, diversity-capped candidates + a self-contained vet page) → human vet → `generate.mjs` (Claude draft, multi-genre). **Nashville: 13 spots curated → vetted → drafted for $0.17 → committed `content-pipeline/content/nashville.json`.** Atlanta expansion drafted too (11 new spots → `content/atlanta.json`, excludes the 5 live spots). Draft key loads from gitignored `content-pipeline/.env`. **So both cities have real content committed.** **Serve slices 1 + 2 + 3 DONE — E1 is now end-to-end:** 29 spots in Postgres; nudge fn reads the DB; all 24 new spots have GPT Image 1.5 illustrations in the public `spots` Storage bucket with `image_url` wired (5 core keep bundled art); and **the app now reads its city pack from the DB** (`vantage/lib/cityPack.ts`) — `lib/spots.ts` is just types + the bundled 5-core fallback, so the duplication is fully retired. The app shows **16 Atlanta spots** (was 5), Storage-served illustrations for the new ones and bundled art for the core. A **city switcher** (Today-header `⌖ City ▾` pill → modal list from the `cities` table, `components/CitySwitcher.tsx`) lets you switch to **Nashville** (13 spots) and back; the choice persists on-device. Location-based default (device GPS → nearest city) is the remaining P2 half. **Today is now curated, not a dump:** the hero + a **quality-gated, capped-at-4** "best near you" (hides on a quiet night), with **variety** so it doesn't headline the same spot every night (a per-day rotation + a recency penalty that reads the shooting journal; both bounded so real quality still wins). All verified in-browser.
- **E2 Gear — done.** Catalog + matching engine wired everywhere (Bag camera picker + lens chips + "Your kit shoots"; Today/Lock/Plan name the fitting lens, honest); profile persists on-device. Only **G3** (banner re-prompt) remains.
- **E3 Nudge — DONE, end-to-end.** N1 brain (`lib/nudge.ts`) · N3 fresh copy (`lib/nudgeCopy.ts`) · N4 return-loop journal (`lib/journal.ts`) · **N2 real push** (`supabase/functions/nudge/`) — a Deno port of the brain, deployed, sending via Expo Push, **scheduled nightly by pg_cron** (`vantage-nightly-nudge`, ~6 pm Atlanta). Verified buzzing a real Pixel.
- **E4 Backend — foundation live.** Supabase (schema + RLS + anon auth), app↔cloud sync (`lib/sync.ts`), deployed edge function + cron. Plain-English map: `docs/BACKEND_FIELD_GUIDE.html`. (Precompute/cache B2–B3 still planned.) **Real events (B4) — groundwork started (Jul 16):** the golden-set sourcing strategy is written (`docs/engineering/EVENT_DATA_SOURCES.md` — multi-source thesis, per-city must-have acceptance test, Ticketmaster spine + CVB trust tier + ArcGIS permits) and the **first curated Atlanta event catalog** is built + date-verified (`content-pipeline/content/atlanta-events.json`, 12 marquee events, Opportunity-shaped). Ingestion into the app (normalize → photo-gate → rank) is not wired yet.
- **E5 Platform — Android shipped.** Dev build (preview APK) installed on the Pixel; Firebase FCM configured.
- **E7 Experience & polish — all findings addressed (code); device verify pending.** From the Jul-13 UX review (`docs/UX_REVIEW.html`). Every P0/P1/P2 finding worked top-to-bottom on branch `e7-ux-review` (see the ordered checklist in `docs/BACKLOG.md` E7): Bag-as-gear-manager (#B1/#B2), real Plan dates (#P1), gear-banner gating (#T1), no "coming soon" (#T3), confidence flourish not "MEDIUM" (#T2), persisted saves (#D1), demoted Plan CTAs (#P2), real avatar (#T4), explained light chart (#D2), fit-label only on a gap (#P3), surfaced "your kit shoots" (#B3), cross-fade detail (#T5), web max-width, and haptics. **Still needs the Pixel:** notification look, thumb reach, safe areas, contrast, permission timing (flagged in E7 row 15).

**🎯 The north star is done: the app buzzes your phone each evening, on its own, only when the light + your gear line up.** Everything below is "next," not "blocking."

**Pick up here next (nothing urgent):**
1. **Verify E7 on the Pixel** — the E7 UX-review work is all merged in code; run an `eas build` and eyeball the on-device-only items (row 15): haptics feel, notification look, safe areas (sticky CTA vs gesture bar), thumb reach, contrast, permission timing.
2. **iOS** — an iPhone build + push needs an **Apple Developer account ($99/yr)**; Android was $0.
3. **Content at scale (E1 — the biggest workstream)** — **DONE, end-to-end** (`docs/engineering/CONTENT_PIPELINE.html`). Curate → vet → draft → image → serve all built and run; Nashville (13) + expanded Atlanta (11 new + 5 core) are drafted, imaged, in Postgres/Storage, and **both the app and the nudge fn read the `spots` table** (the `lib/spots.ts` ↔ nudge-fn duplication is retired). Open follow-ons: a city switch / device GPS (P2) to surface Nashville, and the Plan week is still placeholder-driven (real-dated #P1, brain-driven week is longer-term).
4. **P2 — device GPS** instead of hardcoded downtown Atlanta. The **city switcher is done** (manual pick, persisted) — the remaining half is defaulting to the nearest published city from device location (`expo-location` → haversine to `cities.center_lat/lon`, Atlanta fallback).
5. **Events / relevancy (B4)** — groundwork is in (sourcing strategy + a 12-event curated Atlanta catalog, date-verified). Next: wire the `Opportunity` ingestion (normalize → photo-gate → rank) and prove one live source; the open question is whether Discover Atlanta / Creative Loafing expose a usable feed (see `EVENT_DATA_SOURCES.md`).
6. Small solo items: **G3** (gear-banner re-prompt) · a quiet-hours / frequency cap on the nudge · content-pipeline run.

> ENV NOTE: `vantage/.env` is gitignored (recreate from `.env.example` + Supabase keys on a fresh clone). The **cloud build** gets Supabase creds from **EAS env vars**, not `.env`.

> Note: the `.html` docs are also published as live shareable pages (artifacts). Editing a file here and re-publishing keeps its link.
