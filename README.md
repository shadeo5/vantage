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

## Where we are (Jul 14, 2026)
Strategy locked. Redesigned app **built** (5 screens + nav), unit-tested (73 tests), and now backed by a **live backend that pushes on its own.**
- **E1 Content — done.** Illustrated placeholder imagery on all 5 spots; voice guide + copy audit; pipeline built (running deferred).
- **E2 Gear — done.** Catalog + matching engine wired everywhere (Bag camera picker + lens chips + "Your kit shoots"; Today/Lock/Plan name the fitting lens, honest); profile persists on-device. Only **G3** (banner re-prompt) remains.
- **E3 Nudge — DONE, end-to-end.** N1 brain (`lib/nudge.ts`) · N3 fresh copy (`lib/nudgeCopy.ts`) · N4 return-loop journal (`lib/journal.ts`) · **N2 real push** (`supabase/functions/nudge/`) — a Deno port of the brain, deployed, sending via Expo Push, **scheduled nightly by pg_cron** (`vantage-nightly-nudge`, ~6 pm Atlanta). Verified buzzing a real Pixel.
- **E4 Backend — foundation live.** Supabase (schema + RLS + anon auth), app↔cloud sync (`lib/sync.ts`), deployed edge function + cron. Plain-English map: `docs/BACKEND_FIELD_GUIDE.html`. (Precompute/cache/real-events B2–B5 still planned.)
- **E5 Platform — Android shipped.** Dev build (preview APK) installed on the Pixel; Firebase FCM configured.
- **E7 Experience & polish — in progress.** From the Jul-13 UX review (`docs/UX_REVIEW.html`). Native-feel done: swipe nav (#N1), bottom-tab icons (#N2), press feedback (#N3), overscroll bounce (#N4). The rest is an **ordered checklist** in `docs/BACKLOG.md` E7 (2 P0 · remaining P1/P2) being worked top-to-bottom on branch `e7-ux-review`.

**🎯 The north star is done: the app buzzes your phone each evening, on its own, only when the light + your gear line up.** Everything below is "next," not "blocking."

**Pick up here next (nothing urgent):**
1. **iOS** — an iPhone build + push needs an **Apple Developer account ($99/yr)**; Android was $0.
2. **Real data over placeholders** — the Plan week is still hardcoded; spots + events want real sourcing (E4 B2/B4, E1 content).
3. **P2 — device GPS** instead of hardcoded downtown Atlanta.
4. Small solo items: **G3** (gear-banner re-prompt) · a quiet-hours / frequency cap on the nudge · content-pipeline run.

> ENV NOTE: `vantage/.env` is gitignored (recreate from `.env.example` + Supabase keys on a fresh clone). The **cloud build** gets Supabase creds from **EAS env vars**, not `.env`.

> Note: the `.html` docs are also published as live shareable pages (artifacts). Editing a file here and re-publishing keeps its link.
