# POC — Atlanta Street-Photography Opportunity Finder

*Proof of concept. Question we're answering: **Can we auto-generate a genuinely useful "go shoot here near you now" list for STREET photography in Atlanta with zero manual curation?***

Related: [PLAN.md](./PLAN.md) (overall build), `design_handoff_vantage/` (the UI we reuse).

---

## Product scope: two use cases, street first
The app serves **both** street and landscape photographers.

- **Landscape = the easy case.** You can Google "best photo spots in [national park]" and get everything you need. Solved by existing info. Low differentiation → **we layer it in later** (curated lists + park data + Flickr scenic clusters).
- **Street / street-portraits = the hard, valuable case.** Finding *human activity and density* — events, gatherings, busy pockets — is genuinely hard, especially when you're **not** in a major city. **This is what the POC proves first.** Don't spend the POC re-solving what Google already does.

We keep the Vantage **look**; we build a new content **brain** for the street case first.

| Signal | Landscape (easy, later) | Street (hard, POC now) |
|---|---|---|
| Core thing | Scenic overlooks | Activity/density + events |
| Crowd | Want it *empty* | Want it *busy* — that's the point |
| Light | Golden hour on vistas | Golden hour, harsh midday contrast, blue-hour neon |
| Data | Google-able / curated | Auto-generated from events + photo clusters |

---

## POC scope
- **One city:** Atlanta (data-rich = optimistic first test).
- **One use case:** street / street-portraits (the hard one).
- **No app yet.** A throwaway Node script that prints a ranked list. Prove the *data* before building any UI.
- **Success =** the top ~10 results are places/times a street photographer would actually be glad to know about, for a given location + time.

### Out of scope for the POC
Landscape (easy, comes later), real-time "is this street busy right now", user accounts, route optimization, small-city sparse-data handling, the actual mobile UI.

---

## Data sources (all free to start)

| Source | Gives us | Cost | Notes |
|---|---|---|---|
| **Ticketmaster Discovery API** | Scheduled events (festivals, concerts, sports, arts) w/ venue geo + datetime + category | Free key | Best free structured-events feed for ATL |
| **Flickr API** (`flickr.photos.search`) | Geotagged photo clusters + interestingness + date taken + tags | Free key | Where street photos actually happen + a quality signal |
| **SunCalc** (npm) | Golden/blue hour, sun azimuth, harsh-midday windows | Free, offline | No API, pure math from lat/lon + date |

**Later, if needed:** Foursquare Places or OpenStreetMap/Overpass for venue/POI *density* (catches busy districts that aren't a ticketed event); PredictHQ for ranked event "attendance/impact" (paid). These are the answer to the "not a major city" and "live busyness" gaps.

---

## Pipeline
1. **Input:** a lat/lon in Atlanta + a datetime (start with hardcoded values).
2. **Events:** query Ticketmaster Discovery for events near the point over the next N days → `{name, lat, lon, startTime, category, expected size}`.
3. **Photo hotspots:** query Flickr `photos.search` with a bbox around the point, `has_geo=1`, `sort=interestingness-desc`, `extras=geo,date_taken,tags` → cluster returned photos by location → each dense cluster = a candidate spot with a density + quality score.
4. **Light:** for each candidate location, compute today's golden/blue-hour windows and current light quality via SunCalc.
5. **Score & rank:** blend `activity + photo-density/interestingness + proximity + light-quality-now/soon + timing`. (Weights are a tuning knob — part of what the POC explores.)
6. **Output:** ranked list printed to console: name, why, distance, next good light window, source.

## What the POC proves / disproves
- ✅ Top results are good → the auto-generation thesis holds for the hard case; proceed to build the app (Phase 0 in PLAN.md) feeding the screens with generated data, then add landscape.
- ❌ Results thin/junky → we learned the core risk cheaply. Options: add density sources (Foursquare/OSM), narrow to event-driven only, or reconsider auto-generation vs. light curation.

---

## Keys we'll need (both free, ~5 min signup each)
1. **Flickr API key** — https://www.flickr.com/services/apps/create/apply/
2. **Ticketmaster Discovery API key** — https://developer.ticketmaster.com/

*(No Apple/Google/Supabase accounts needed for the POC — that's only when we build the actual app.)*

---

## Smallest next step
Write `poc/scout.mjs` (Node): hardcode an Atlanta lat/lon + now, hit Flickr + Ticketmaster, run SunCalc, print a ranked top-10. One file. If the list is exciting, we build. If not, we adjust the recipe — cheaply.
