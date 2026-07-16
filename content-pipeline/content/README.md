# Reviewed, drafted content — the source of truth the importer loads into Postgres.

## Spots (evergreen)
# `<city>.json` + `atlanta-core.json` — produced by generate.mjs (stage 3, Draft) from the
# vetted list, then human-reviewed.
# Full Spot data: name, genre, genres[], type, windowType, reason, tagline, why, look[], getting, lat, lon.

## Events (time-bound) — NEW, curated editorial
# `<city>-events.json` — the curated must-do event catalog (the "relevancy" layer). Hand-curated
# from the golden-set research (docs/engineering/EVENT_DATA_SOURCES.md), NOT auto-ingested — these
# are the ~15-30 marquee, annually-recurring, photographable events per city. First: atlanta-events.json (12).
# Extends the Spot shape with the Opportunity model's event fields:
#   kind:'event', eventType, neighborhood, recurrence, window{start,end}, windowConfidence,
#   admission, ticketing, magnitude (high|medium|low), venueSpotId (co-located core spot → eclipse rule),
#   kitAngles{wide,normal,tele,macro} (per-archetype "what YOUR kit shoots here"), source.
# windowConfidence flags date-verification status: 'high' = date confirmed; 'needs-date-verify' = recurrence
# solid, exact next-occurrence date needs a check; 'needs-confirm-event-runs' = event has skipped years.
