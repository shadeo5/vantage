# Engineering decisions — index

Why the code is the way it is. Each entry is an architecture-decision record (ADR): the
problem, the options, and the call we made. **Read the relevant one before changing that
area** — most of these encode a non-obvious trade-off that's easy to undo by accident.

> Format note: several ADRs are `.html` (they double as shareable pages). The newer ones are
> `.md`. Both are current — status is what matters, not the extension. New ADRs should prefer
> `.md` so they stay greppable.

| Decision | Status | What it covers |
|---|---|---|
| [TECH_DECISIONS.html](TECH_DECISIONS.html) | living | Running record of technical choices (stack, structure, the small calls). |
| [PUSH_ARCHITECTURE.html](PUSH_ARCHITECTURE.html) | ✅ shipped | How the in-app nudge becomes a real push: Supabase `pg_cron` → the ported Deno "brain" → Expo Push. **Explains why the scoring brain lives in two places** — see the parity guard below. |
| [GEAR_MATCHING.html](GEAR_MATCHING.html) | ✅ shipped · overhauled Phase 1 (Jul 25) | How a photographer's kit maps to shootable genres. Phase 1: generic lens descriptors + a curated Fuji/Sony/Leica camera catalog (single source + parity guard) + fixed-lens-aware Bag. Open: filter/re-rank/annotate; Phase 2 = multiple kits. |
| [LIGHT_QUALITY_GENRE.html](LIGHT_QUALITY_GENRE.html) | ✅ shipped (CB7) | Light quality is **genre-dependent** — golden hour is a landscape bias, street is light-flexible. Replaced a global "golden > flat" weight with per-genre light sensitivity. Grounded in [LIGHT_GENRE_RESEARCH.md](LIGHT_GENRE_RESEARCH.md) (22-source pass). |
| [PHASE_HONEST_LIGHT.html](PHASE_HONEST_LIGHT.html) | ✅ shipped (E9) | Every surface reads the light you have **now** — never "golden hour hits 8:05" at 9:30pm. |
| [HERO_ANTI_REPEAT.md](HERO_ANTI_REPEAT.md) | ✅ shipped | Why Today stopped headlining the same spot daily — an anti-repeat rule (not a weight), plus the deeper flat-spot scoring issue it defers. |
| [SHOOT_BRIEF.html](SHOOT_BRIEF.html) | ✅ shipped (E8) | The additive "shoot brief" — turning a quiet/overcast night into a gear-readiness + shot-type plan. |
| [CONTENT_PIPELINE.html](CONTENT_PIPELINE.html) | ✅ built/run | The LLM content pipeline: OSM curate → human vet → Claude draft → image → serve from Postgres. Lives in `content-pipeline/`. |
| [EVENTS_ARCHITECTURE.html](EVENTS_ARCHITECTURE.html) | ▶ partial (B4) | How events and spots reconcile (the `Opportunity` model, the photo-lens gate, the eclipse/takeover rule). App slice + **events-in-Postgres** shipped (`events` table, `lib/eventPack.ts`, dashboard-editable, bundled fallback); **push parity** (the nightly Edge Function reading events) + a live feed pending. |
| [EVENT_DATA_SOURCES.md](EVENT_DATA_SOURCES.md) | reference | The golden-set sourcing strategy for real events (Ticketmaster spine + CVB trust tier + permits), with the per-city acceptance test and the freshness rule. |

## Cross-cutting invariants (not a single ADR, but load-bearing)

- **The scoring brain is mirrored across two runtimes.** `vantage/lib/nudge.ts` (app) and
  `vantage/supabase/functions/nudge/index.ts` (Deno push) hand-duplicate the same weights,
  thresholds, and curves so the notification matches the app. **Change scoring in both.**
  `vantage/__tests__/parity.test.ts` fails the build if they drift. Background:
  [PUSH_ARCHITECTURE.html](PUSH_ARCHITECTURE.html).
- **Honest by principle.** No invented data — no fake hours, no faked GPS distances, no stock
  photos for real places. If the app doesn't know, it doesn't say. This is a product rule that
  shapes engineering choices (e.g. best-effort weather with an astronomical-only fallback,
  never a guessed sky).

> Adding an ADR? Drop the file in `docs/engineering/`, add a row here, and note it in the
> commit (the pre-commit hook reminds you). Keep this index in sync — a decision that isn't
> indexed is a decision no one will find.
