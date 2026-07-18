# ADR — Hero anti-repeat (stop headlining the same spot every day)

**Status:** Accepted · shipped 2026-07-18
**Scope:** `vantage/lib/nudge.ts` (`tonightNudge`), `vantage/lib/shownStorage.ts`, `App.tsx` wiring.
**Related:** CB7 genre-dependent light (`LIGHT_QUALITY_GENRE.html`) — the change that *created* this symptom; CB6 conditions re-rank (deferred) — the deeper fix this defers to.

## Problem
A real user report: Today kept headlining the **same** spot — the "Look At Them Look At Us" mural (`look-at-them-look-at-us`, `windowType: flat`, genre `Street`) — day after day.

Root cause is structural, not a code defect:
- After **CB7**, Street is treated as light-flexible (`LIGHT_SENSITIVITY.Street = 0.15`), so `phaseScore(Street, flat) ≈ 0.93`.
- A **flat** window is "usable all daylight" (`windowFor`), so its light-timing is `1.0` all day — the score never dips.
- Net: a flat-light street spot sits at a **permanent ~0.96**, and only loses during the brief golden/blue windows. Any daytime check headlines it.

The existing variety layer couldn't dislodge it:
- The **day-shuffle** is bounded at `±VARIETY_W (0.10)` by design (it only reshuffles near-ties). The mural's lead over the next spot exceeds that, so the shuffle can't move it.
- The **shot-recency** penalty (`RECENCY_W 0.18`) only fires once you've **shot** a spot (journal `went: true`). Being *shown* a spot repeatedly never triggers it.

So the app had no mechanism for "you keep showing me this, show me something else."

## Decision
Add a **rule**, not another weight nudge (a nudge can't beat an arbitrarily large score lead):

> **Don't headline a spot we already headlined in the last `HERO_COOLDOWN_DAYS` (2) days — as long as another spot still clears the go bar.** If every worth-it spot is on cooldown (or it's a quiet night with none), fall back to the plain top score: an honest repeat, not an invented worse pick.

Mechanics:
- A new on-device **shown-log** (`lib/shownStorage.ts`, `ShownEntry = {spotId, at}`, key `vantage.hero.shown.v1`) records the day's hero — same best-effort AsyncStorage pattern as the journal. `recordShown` is idempotent per calendar day and pruned to 30 days.
- `tonightNudge` takes `opts.shownLog` and picks the highest-ranked spot that (a) clears `GO_THRESHOLD` and (b) wasn't headlined on a **prior** calendar day within the cooldown. `headlinedRecently` counts only prior days, so **today's own record never disqualifies the pick** — the hero is stable within a day and there's no feedback loop with recording.
- Yesterday's hero isn't hidden — it still flows into "best near you," so the headline **cycles** (mural today → a golden/blue spot tomorrow → mural comes back after the cooldown).

## Why these values
- `HERO_COOLDOWN_DAYS = 2` — guarantees the headline changes day-to-day when ≥1 alternative clears the bar, and with ~16 Atlanta spots that's the common case. Tunable in one place. Not researched weights — this is a scheduling rule, and the fallback keeps it honest.

## What this does NOT fix (deliberately deferred)
The deeper issue — that an always-on flat spot is *allowed* to permanently outrank time-specific windows whenever you check outside dusk — is a **scoring recalibration**, overlapping the deferred **CB6 conditions re-rank**. That deserves the research/ADR treatment (should flat-window timing decay away from its usable-window edges? should the go bar be phase-aware?). The anti-repeat rule is the right-sized fix for the *annoyance*; it doesn't pretend to fix the *scoring*.

## Alternatives rejected
- **Bigger day-shuffle / a shown-recency *penalty*** — a fixed penalty can't reliably beat a permanent frontrunner whose lead exceeds it; you'd have to make it so large it also buries genuinely-better nights.
- **Rotate the hero among all worth-it spots by day-seed** — works without new storage, but shows the #2 even when nothing warranted moving off #1; the rule only intervenes when there's an actual repeat.

## Tests
`__tests__/nudge.test.ts` (anti-repeat block) + `__tests__/shownStorage.test.ts`: yesterday's winner steps aside; honest fallback when it's the only worth-it spot; today's record doesn't disqualify (intra-day stability); cooldown expiry re-admits after 3+ days; `recordShown` idempotency + pruning + round-trip. 148 tests total (+12).
