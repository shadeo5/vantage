# Vantage — repo guide (start here)

Vantage is a mobile app that gives a photographer a personal reason to shoot *today* — the right place and light, matched to the gear in their bag. An inspiration engine, not a maps utility. It reads the sky, the sun, and your kit each evening and — only when they line up — nudges your phone.

**Honest by principle:** the app never invents data (no fake hours, no faked GPS distances, no stock photos for real places). Hold new code to that bar.

## Where the work is

| You want to… | Go to | Notes |
|---|---|---|
| Change the **app** (screens, scoring, gear, light) | **`vantage/`** | Expo / React Native. See `vantage/AGENTS.md` for commands + architecture. **Run/test/build here.** |
| Generate **spot content** (places → written spots + art) | `content-pipeline/` | Node + Claude + image gen. Built; running is deferred (costs API spend). |
| Understand **why** things are built this way | `docs/` | Strategy, design, and engineering ADRs. Only what's in `PROJECT_MAP.md` is current. |
| History / superseded work | `archive/` | Reference only — **never** treat as direction. |

## First moves for an agent

1. **`vantage/AGENTS.md`** — commands (`npm run check`, `npm test`), the architecture map, and the conventions. Almost all code work starts here.
2. **`PROJECT_MAP.md`** — the working map: folder guide, doc index, and dated status log.
3. **`docs/BACKLOG.md`** — what's shipped and what's next.
4. **`docs/ONBOARDING.html`** — the full role-based onboarding and file-by-file codebase map.

## Two things worth knowing before you edit

- **The scoring brain lives twice** — `vantage/lib/nudge.ts` (app) and `vantage/supabase/functions/nudge/index.ts` (the Deno nightly push). They're hand-mirrored; change scoring in **both**. `vantage/__tests__/parity.test.ts` fails if they drift.
- **Docs move with the code.** A pre-commit hook reminds you to update the BACKLOG, README, any affected ADR, and memory on every commit. Keep them current — this repo treats stale docs as a bug.
