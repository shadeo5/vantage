# Vantage — project map

Start here. Vantage is a mobile app that gives a photographer a personal reason to shoot **today** — the right place, right light, matched to their gear. An inspiration engine, not a utility.

## The folders

```
vantage/     👉 THE APP (Expo / React Native). Run it, build it here.
docs/        👉 All our thinking — strategy, design, engineering.
archive/     👉 Done-with stuff, kept for reference. Safe to ignore.
```

## `vantage/` — the app
The real thing. Currently: Today screen (nudge + ranked areas), Spot detail (light curve + what's-here), events (built, hidden behind a flag).
- **Run it:** `cd vantage && npx expo start`, then press `w` for web (phone needs a dev build — SDK version issue).
- **Test it:** `cd vantage && npm test` (unit tests on the core logic).

## `docs/` — our source of truth

**`docs/strategy/`** — *why we're doing this & who we serve*
- `NORTH_STAR.html` — the vision (inspire dormant + active shooters; the nudge)
- `PRODUCT_BRIEF.html` — customer interrogation (assumptions, risks, personas)
- `COMPETITIVE_LANDSCAPE.html` — who else is out there; our open quadrant

**`docs/design/`** — *what it looks like & how it flows*
- `WIRES.html` — v1 low-fi wireframes (Today / Detail / Gear / Plan)
- `DESIGN_BRIEF.md` — paste-ready brief for Claude Design (hi-fi mockups)
- `design_handoff_vantage/` — the ORIGINAL mockup + screens (our visual DNA)

**`docs/engineering/`** — *how it's built*
- `TECH_DECISIONS.html` — living record of technical choices
- `PLAN.md` — the build plan / vertical-slice roadmap
- `POC_ATLANTA.md` — the original proof-of-concept spec

**`docs/BACKLOG.md`** — the **epic-organized backlog** (epics → just-in-time stories). Start here for "what's next."

## `archive/` — done with, kept just in case
- `poc/` — the throwaway script that validated the whole idea. Still runnable (`cd archive/poc && npm run scout`) if we want to answer the "how many things to shoot per day?" question.
- `Photographer Location Scout App.zip` — the original design zip. Already extracted into `design_handoff_vantage/`, so **safe to delete** whenever.

## Where we are (Jul 11, 2026)
Strategy locked, wires done, design brief ready for Claude Design. Next: hi-fi mockups → rebuild the app to match.

> Note: the `.html` docs are also published as live shareable pages (artifacts). Editing a file here and re-publishing keeps its link.
