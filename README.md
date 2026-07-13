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
- `PUSH_ARCHITECTURE.html` — ADR: how the in-app nudge becomes a real push (Supabase cron → the ported brain → Expo Push) — epics E4 + E3/N2, in progress

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

## Where we are (Jul 12, 2026)
Strategy locked. Redesigned app **built** (all 5 screens + nav) and running on web. Codebase cleaned + unit-tested (53 tests).
- **E1 Content — done.** Illustrated placeholder imagery wired into all 5 spots (`assets/spots/`); voice guide + copy audit (C3); content pipeline built but running deferred.
- **E2 Gear — essentially done.** Camera/lens catalog + matching engine (`vantage/lib/gear.ts`, ADR `docs/engineering/GEAR_MATCHING.html`) fully **wired**: Bag has a catalog camera picker (19 bodies) + lens chips + live "Your kit shoots"; Today/Lock/Plan copy names the lens that fits tonight's spot (annotate-only, honest); the profile **persists on-device** (`lib/gearProfile.ts` + `lib/gearStorage.ts`). Only **G3** (gear-banner re-prompt logic) remains.
- Events architecture designed (ADR) incl. the photo-lens gate — for the deferred E4.

**E3 Nudge — mostly done (only real push delivery, N2, is left):** ✅ **N1 nudge brain** (`lib/nudge.ts`) decides tonight's pick + confidence + "why" (light-timing × gear-fit; activity = placeholder). ✅ **N3 richer copy** (`lib/nudgeCopy.ts`) — fresh, personal, confidence-tiered push lines, deterministically varied per day. ✅ **N4 return-loop** (`lib/journal.ts`) — "I'm going" → on return "did you make it?" → shooting journal + return metric. The in-app hero *is* the nudge; the loop (nudge → shoot → return → check-in) is closed.

**E4 Backend — building (for the push nudge, N2):** design in `docs/engineering/PUSH_ARCHITECTURE.html`. Supabase project live; schema + RLS + anonymous-auth all set up. **App↔cloud sync is LIVE** (`vantage/lib/sync.ts`): the app anonymously signs in on launch and mirrors the gear profile to the `profiles` table (verified — row visible in Table Editor).

**Pick up here next → two pieces left for a real push:**
1. **Push token** — add `expo-notifications`, register for a token, save it on the profile. Needs a **Pixel dev build** (free) to actually get/receive a token.
2. **The Edge Function** — port `nudge.ts`/`nudgeCopy.ts` server-side, run it on `pg_cron` daily, send via Expo Push using each profile's token. (Needs Desha to `supabase login` / deploy, or run via dashboard.)
3. Apple's $99/yr only if/when we want it on an iPhone; the Pixel path is $0.
2. Small solo items anytime: **G3** (smarter gear-banner re-prompting) · **event decisions** (EVENTS_ARCHITECTURE open questions) · content-pipeline run (deferred spend) · commit-attribution housekeeping.

> Note: the `.html` docs are also published as live shareable pages (artifacts). Editing a file here and re-publishing keeps its link.
