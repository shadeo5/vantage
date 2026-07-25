# Event Data Sources — Southeast Research

**Status:** Research findings for review · **Date:** 2026-07-15 · **Feeds:** the events layer (E4/B4) + the [Events & Opportunities ADR](./EVENTS_ARCHITECTURE.html)

**Method:** deep-research pass across **8 Southeast cities** (Atlanta, Nashville, Charlotte, Raleigh–Durham, Charleston, Savannah, New Orleans, Miami). 6 search angles → 26 sources fetched → 95 claims → 25 adversarially fact-checked (2-of-3 refute kills a claim). **Every claim below is tagged with its confidence** — this is deliberately honest about what was *verified* vs. *assumed*, because coverage across the 8 cities was uneven.

> **Read this first:** the research **corrected two of my earlier assumptions in the planning chat.** I'd said Nashville has clean Socrata open data and Atlanta was the messy one. Both wrong. Nashville runs on ArcGIS Hub (not Socrata), and its event-permit signal is *unconfirmed*. Atlanta's special-event permits aren't in open data at all. Meanwhile **Charlotte and New Orleans _do_ expose real permit/parade datasets** — the opposite of what I'd guessed. Don't carry my earlier framing forward; carry this.

---

## TL;DR

1. **No single feed has the local long tail. Confirmed.** Your instinct was right — this is a multi-source problem, and the good hyperlocal texture has no clean API.
2. **The turnkey backbone is Ticketmaster Discovery API v2** — free, documented, works identically across all 8 cities, and returns exactly the fields we need (start datetime + timezone + venue lat/lon). Its weakness is the expected one: it skews to ticketed concerts/sports, thin on small neighborhood events.
3. **The "magnitude" score is a paid product: PredictHQ.** It's the only verified source of a predicted-attendance/rank number (our `magnitude`). Exact pricing couldn't be verified.
4. **Municipal permit data is real but city-by-city — no uniform layer.** Every portal is Esri **ArcGIS Hub** (not Socrata), all with real APIs. But whether they publish the *event/closure/parade permit* signal varies wildly:
   - ✅ **Charlotte** — publishes a **Street & Sidewalk Closure Permit** dataset.
   - ✅ **New Orleans** — publishes **parade routes / Mardi Gras** geodata.
   - ❌ **Atlanta, Miami-Dade** — confirmed *absent*; permits live in separate application systems.
   - ❓ **Nashville, Charleston, Savannah, Raleigh–Durham** — not confirmed either way.
5. **The DoStuff / Do[City] network only covers Nashville** (do615) of the 8 — and has no public API anyway.
6. **A normalization layer is genuinely required (your hypothesis: confirmed YES).** Sources diverge on datetime/timezone, coordinate presence, category taxonomy, and stable IDs. See the [normalization section](#normalization-analysis).

---

## Golden-set coverage test (added 2026-07-15, post-review)

**Desha's challenge, and the most important test in this doc:** cataloguing what *plumbing* exists says nothing about whether the plumbing carries the events that matter. A source is only trustworthy for a city if it returns that city's **must-have events** — the ones whose absence is disqualifying. He named four:

| Event | City | On Ticketmaster? | Where it actually shows up |
|---|---|---|---|
| **Essence Festival** | New Orleans | ✅ Yes — Superdome concerts, live event IDs, on sale | Ticketmaster + neworleans.com (CVB) |
| **Jazz Fest** | New Orleans | ✅ Yes — artist + per-weekend event pages | Ticketmaster + nojazzfest.com + neworleans.com |
| **Atlanta Dogwood Festival** | Atlanta | ❌ **No** | **Discover Atlanta** (CVB) · **Creative Loafing** (alt-weekly) · dogwood.org |
| **Candler Park Fall Fest** | Atlanta | ❌ **No** | **Discover Atlanta** (CVB) · **Creative Loafing** (alt-weekly) · fallfest.candlerpark.org |

**Result: Ticketmaster — the top "start here" recommendation — FAILS the trust test. It misses 2 of 4.** The two it misses are exactly the neighborhood festivals a photographer cares most about.

**Two corrections this forces on the rest of the doc:**

1. **The fault line is "sold through a major ticketing platform," not "free vs. paid."** Dogwood *added* a $5–10 gate fee in 2026 and is *still* absent from Ticketmaster — because it runs its own gate, not a big promoter's. So an aggregator API's coverage tracks *who ticketed it*, not whether money changes hands.
2. **The CVB + alt-weekly tier is load-bearing, not garnish.** Both must-have Atlanta festivals surfaced on the *same two* sources — **Discover Atlanta** and **Creative Loafing**. For a photographer, that tier carries the events aggregator APIs structurally cannot. The signal-per-effort ranking below under-weighted it; treat CVB/alt-weekly as a **required** tier for trust, not an optional one.

**The rule going forward:** maintain a per-city must-have list (Essence + Jazz Fest for NOLA; Dogwood + Candler Park for Atlanta; TBD for the others) and treat it as the **acceptance test** — no source or source-combo is adopted for a city until it returns that city's list.

**The open question this creates (now the most important one):** we know *where* the must-have events live (Discover Atlanta, Creative Loafing) — we do **not** yet know whether those sites expose a usable feed (API / iCal / RSS) or are scrape-only with restrictive ToS. That is the single highest-value thing left to verify.

---

## Atlanta & Nashville golden sets + pull-ability (deep pass, 2026-07-15)

A second, city-scoped research pass built the full must-do lists for the two live cities and probed whether their carrier sources are actually pullable. **25 of 25 claims confirmed, 0 refuted** — the strongest verification of any pass. Two headline outcomes:

1. **The free-festivals-live-on-the-CVB pattern is confirmed, hard.** Every verified free/neighborhood event routes through the CVB (Discover Atlanta / Visit Music City) + its own site, and **none** routes admission through Ticketmaster.
2. **The carrier sources ARE reachable by API — just not by scraping the rendered page.** Both CVBs run on platforms with documented REST APIs. This is more hopeful than the "scrape-only" fear.

### Atlanta golden set

| Event | When | Where | Type | Free/Ticketed | On Ticketmaster? | Confidence |
|---|---|---|---|---|---|---|
| **Dogwood Festival** | April (10–12, 2026) | Piedmont Park | Arts festival | **Self-ticketed via FreshTix** ($5/$10) | ❌ No | High |
| **Sweet Auburn Springfest** | May (9–10, 2026) | Sweet Auburn (JW Dobbs Ave) | Multicultural street fest | **Free** | ❌ No | High |
| **Candler Park Fall Fest** | Oct (3–4, 2026) | Candler Park | Neighborhood festival | **Free** | ❌ No | High |
| **East Atlanta Strut** | late Sep (26, 2026) | East Atlanta Village | Street fest + parade | **Free** | ❌ No | High |
| **Dragon Con Parade** | Sat of Labor Day wknd (Sep 5, 2026, 10am) | Peachtree St downtown | Costume parade / spectacle | **Free to watch** (street closures 9:15–noon) | ❌ No | High |
| Atlanta Jazz Festival | Memorial Day wknd (May 29–31, 2027) | Piedmont Park | Music festival | Free | ❌ No | Anchor* · date pattern re-verified 7/16 |
| Atlanta Pride Festival & Parade | **Oct 10–11, 2026** | Piedmont Park + Peachtree St | Festival + parade | Free | ❌ No | **High — confirmed 7/16** |
| Inman Park Festival | Last full wknd April (Apr 24–25, 2027) | Inman Park | Street fest + parade | Free | ❌ No | Anchor* · date pattern re-verified 7/16 |
| ~~Music Midtown~~ | **Not running** — last held 2023, no 2024–26 edition | Piedmont Park | Music festival | Ticketed | ✅ (when held) | **Dropped 7/16 — removed from catalog** |
| Shaky Knees | **Sept 18–20, 2026** (relocated) | **Piedmont Park** (was Central Park / O4W) | Music festival | **Ticketed** | ✅ likely | **High — confirmed 7/16** |
| AJC Peachtree Road Race | July 4 (fixed annual date) | Peachtree → Piedmont Park | 10K road race | Registered (own system) | ❌ No | High — fixed calendar date |

### Nashville golden set

| Event | When | Where | Type | Free/Ticketed | On Ticketmaster? | Confidence |
|---|---|---|---|---|---|---|
| **Music City Hot Chicken Festival** | July 4 (11am–3pm) | East Park (+ 10:30 fire-truck parade) | Food festival | **Free** | ❌ No | High |
| **African Street Festival** | September (19–21) | Hadley Park | Cultural festival | **Free** (RSVP) | ❌ No | High |
| **Cherry Blossom Festival** | April | Public Square Park | Japanese-culture festival | **Free** | ❌ No | High |
| **Downtown Second Saturday Art Crawl** | 2nd Sat monthly, 6–9pm | Downtown galleries (5th Ave) | Art crawl | **Free** | ❌ No | High |
| **WeHo Art Crawl** | 1st Sat monthly | Wedgewood-Houston | Art crawl | **Free** | ❌ No | High |
| **CMA Fest** | mid-June (2027: 10–13) | Downtown + Nissan Stadium | Music festival | **Hybrid** — stadium paid, downtown stages free | ✅ paid inventory only | High |
| Tomato Art Fest | August | East Nashville (Five Points) | Quirky art/community fest | Free | ❌ No | Directory† |
| Nashville Pride Festival & Parade | June | Public Square | Festival + parade | Free | ❌ No | Directory† |
| Musicians Corner | May–fall series | Centennial Park | Free concert series | Free | ❌ No | Directory† |
| Nashville Oktoberfest | October | Germantown | Cultural festival | Free-ish | ❌ No | Directory† |
| AmericanaFest | September | various venues | Music fest / conference | Badge/ticketed | partial | Directory† |
| Nashville Film Festival | September | various | Film festival | Ticketed | ❌ No | Directory† |

\* **Anchor** = named in the brief, pattern-consistent, but its exact 2026 date/venue wasn't independently re-verified in this pass (the free-vs-Ticketmaster split rests on prior research).
† **Directory** = confirmed listed on the Visit Music City CVB directory, but not independently date/venue-verified.

**Re-verification pass (2026-07-16):** while building the Atlanta event catalog (`content-pipeline/content/atlanta-events.json`) the anchor rows were checked against official sources. Two surprises corrected the table above: **Shaky Knees relocated** from Central Park / Old Fourth Ward (spring) to **Piedmont Park, Sept 18–20 2026**, and **Music Midtown has not run since 2023** (cancelled 2022 over GA gun-law/venue conflict, returned 2023, no edition since) — so it was **dropped from the catalog**. Atlanta Pride (Oct 10–11 2026) and L5P Halloween (Oct 17–18 2026, parade Sun) were confirmed against published dates. Jazz Fest, Inman Park, Sweet Auburn Springfest, Dogwood, and Caribbean Carnival remain projections: their recurrence rules were re-verified as correct, but organizers haven't published 2027 dates yet.

### Carrier-source pull-ability & ToS matrix

The important correction: the CVBs are reachable **by their platform's API**, not by scraping the page a browser renders.

| Source | Platform | Machine-readable access | ToS / legality | Verdict |
|---|---|---|---|---|
| **Discover Atlanta** | **WordPress** (not Simpleview) | Rendered page → **Cloudflare 403** to plain HTTP (verified first-hand). BUT a **WordPress REST API** exists: `wp/v2` + custom **`discover-atlanta/v1`** namespaces | `/terms-of-use/` exists, full language not read | 🟡 **Promising lead** — probe `/wp-json/discover-atlanta/v1/` for an events endpoint before assuming scrape-only |
| **Visit Music City** | **Simpleview CMS** (member login → `nashvilletn.extranet.simpleviewcrm.com`) | Annual-events page = static hyperlink list, **no feed**. BUT **Simpleview CMS documents a REST Events API** (Events model, fields, queries) | not read | 🟡 **Promising lead** — the Simpleview Events API is the real path, not the editorial page |
| **Creative Loafing ATL** | Foundation/Chava CMS | Crowd-sourced events calendar (user-submitted). The `/Rss.xml?oid=` URL tested is a **comment feed, returns a PHP error** — not a valid events feed. A real events RSS may exist but unconfirmed | not read | 🟠 **Inconclusive** — needs a proper feed probe |
| **Nashville Scene** | runs **on Do615** | co-branded Do615 page; no separate calendar | inherits Do615 ToS | 🔴 off-limits (see Do615) |
| **Do615** | DoStuff platform | no public API | **ToS explicitly prohibits scraping/harvesting** | 🔴 **Legally off-limits** — don't scrape (and redundant with the CVB anyway) |

### Permit / closure angle (secondary check)
- **Nashville** publishes a road-closures page (`nashville.gov/departments/transportation/road-closures`); its ArcGIS Hub permit search remains building/trade permits (event permits unconfirmed).
- **Atlanta** has a DOT ArcGIS hub (`atldot-dpwatl.hub.arcgis.com`) worth probing for street-closure data; special-event permits still run through the Mayor's Office of Special Events + FilmApp (not open data).
- Real signal example: the Dragon Con parade's Peachtree St closure (9:15am–noon) is documented via AJC/WSB — i.e. the *closure* is discoverable even when the permit dataset isn't.

### Recommended per-city source combo (passes the acceptance test)

- **Atlanta:** Ticketmaster (ticketed music: Shaky Knees — note Music Midtown is dormant, no edition since 2023) **+** the Discover Atlanta WordPress REST API (the free festivals: Dogwood, Sweet Auburn, Candler Park, Strut, Pride) **+** event-own-site fallback (FreshTix/Dragon Con) for anything the CVB misses.
- **Nashville:** Ticketmaster (CMA Fest paid inventory) **+** the Simpleview Events API behind Visit Music City (the free set + art crawls) **+** own-site fallback. **Skip Do615** (ToS bars scraping, redundant).
- **The one thing standing between this and a build:** confirm those two CVB platform APIs actually return events with dates + venues. That's a small, concrete probe — and it's now the top open question, replacing "is there any feed at all" (answered: yes, at the platform layer).

---

## The three source tiers

| Tier | What it is | Effort | Long-tail coverage |
|---|---|---|---|
| **A · Aggregator APIs** | Ticketmaster (free), PredictHQ (paid), SeatGeek/Meetup (unverified) | Low — documented APIs, uniform across cities | Ticketmaster: weak. PredictHQ: broader (paid) |
| **B · Municipal open data** | Per-city ArcGIS Hub REST feeds — closure/parade permits where they exist | Medium — real APIs, but you locate the dataset per city | High signal *where present* — a closure permit IS a festival/parade |
| **C · Cadence + CVB/alt-weekly** | Farmers markets, art walks (RRULE-able); CVB calendars (mostly Simpleview CMS) | High — scrape-only, needs geocoding | Best for recurring neighborhood texture |

---

## Per-city breakdown

**Platform note:** all municipal portals verified are **Esri ArcGIS Hub**, each exposing real machine-queryable APIs — ArcGIS REST FeatureServer endpoints, a DCAT-US 1.1 JSON catalog feed (`/api/feed/dcat-us/1.1.json`), and the ArcGIS Hub Search API. None are Socrata (Miami-Dade *labels* its catalog "Socrata" but is actually ArcGIS Hub).

| City | Portal | Permit / event-data signal | Confidence |
|---|---|---|---|
| **Charlotte** | `data.charlottenc.gov` | ✅ **"Street & Sidewalk Closure Permit Areas"** dataset present — the single best confirmed permit lead | High (refuted the "absent" claim 0-3) |
| **New Orleans** | `portal-nolagis.opendata.arcgis.com` | ✅ **Parade routes / Mardi Gras** geodata (`/datasets/mardi-gras-routes-1`) — parade/special-event geodataset verifiable via indexed dataset pages | High (JS-rendered landing page blocked *direct* fetch, but dataset pages confirm) |
| **Atlanta** | `dpcd-coaplangis.opendata.arcgis.com` | ❌ **Absent** — catalog is planning/zoning/parks/Beltline only (`numberMatched:0` for event/permit/closure/film/parade). Permits run through the **Mayor's Office of Special Events**, **APD** street/lane closures, and **FilmApp** — none open data | High (3-0) |
| **Miami (Miami-Dade)** | `opendata.miamidade.gov` | ❌ **Absent** — only construction/environmental permits (RER/DERM, building). `parade`/`festival`/`event`/`road closure` all returned 0 datasets | High (3-0) |
| **Nashville** | `datanashvillegov-nashville.hub.arcgis.com` (aka `data.nashville.gov`) | ❓ **Unconfirmed** — `permit`-tag search shows building/trade/beer/short-term-rental permits + 311; whether event/closure permits exist was *contested* (1-2). Treat as unverified, **not** confirmed-absent | Low |
| **Charleston** | *(not verified)* | ❓ Not checked | — |
| **Savannah** | *(not verified)* | ❓ Not checked | — |
| **Raleigh–Durham** | *(not verified)* | ❓ Not checked. Alt-weekly **INDY Week** runs a Triangle events calendar (`calendar.indyweek.com`) scoped to Durham/Orange/Wake counties | Low |

---

## Cross-city sources (same everywhere)

### Ticketmaster Discovery API v2 — **the recommended backbone** ✅ High confidence
- **Access:** free API key; documented. **Rate limits:** 5,000 calls/day, ~5 req/sec, deep-paging capped at the 1000th item (`size*page < 1000`).
- **Schema — exactly what we need:** `dates.start.dateTime` + `dates.start.localDate/localTime` + `dates.timezone` (IANA, e.g. `America/New_York`); `_embedded.venues` with `address.line1`, `postalCode`, and **native `location.latitude/longitude`**.
- **Caveats:** end datetimes often absent; occasional null coordinates; **coverage skews ticketed concerts/sports — weak on small neighborhood events** (this is the gap the other tiers fill).

### PredictHQ — **the paid magnitude source** ✅ attributes confirmed / ❓ pricing unverified
- Provides **`rank` + `location`** (standard) and **Predicted Attendance + Predicted Event Spend** (advanced) — maps directly to our `magnitude`.
- **It is paid.** The specific pricing tiers/model **could not be verified** (a claim about its go-to-market was refuted). A 14-day trial appears to exist. Confirm cost before relying on it.

### SeatGeek / Eventbrite / Meetup — ❓ unverified, confirm before use
- **Eventbrite:** public **Event Search API was deprecated** (removed Dec 12 2019, all requests denied after Feb 20 2020). Its current partner-only state was not re-verified.
- **SeatGeek, Meetup:** not independently verified in this pass. Flagged as open questions.

### DoStuff / Do[City] network — ❌ not useful here ✅ High confidence
- Of the 8 cities, **only Nashville (do615)** is in the network (the roster is ~21 cities: Austin, Boston, Chicago, etc.). No DoNOLA/DoAtlanta/DoMiami/etc.
- **No public API / feed / iCal / RSS / JSON.** It's a B2B venue/promoter product. An unofficial community GitHub wrapper exists but isn't official.

### CVB / tourism calendars — ⚠️ platform-determined, mostly scrape-only
- Most Southeast CVBs (Discover Atlanta, Visit Savannah, Visit Charlotte, Charleston Area CVB…) run on **Simpleview CMS**, so feed availability is a *platform* question, not per-city. Simpleview leans toward ticketed/venue events — **weaker on the long-tail** neighborhood happenings. Feed/iCal/RSS availability and scraping ToS were **not verified**.

### Recurring cadence (markets, art walks) — ✅ RRULE-able, ⚠️ scrape-only
- Clean recurrence rules, but **no APIs** — prose schedules needing manual parsing + geocoding. Verified examples:
  - **Charleston Farmers Market** — Marion Square (329 Meeting St), Saturdays 8am–2pm, Apr 4–Nov 21 2026 → a weekly-Saturday `RRULE` with holiday `EXDATE`s.
  - **New Orleans First Saturday Art Walk** — Julia St / Warehouse District, first Saturday monthly (times vary ~5–8pm).
- **Nice detail:** embedded Google-Maps links often *leak* lat/lon (e.g. `32.7868902,-79.9356877`), so coordinates are sometimes recoverable from the page without a full geocoding call.

---

## <a id="normalization-analysis"></a>Normalization analysis — you were right, YES

A dedicated normalization layer is **genuinely required**. This isn't theoretical — it falls out of the concrete divergences observed across the verified sources. This is exactly the job the ADR's `Opportunity` shape exists to do; the research validates building it.

| Dimension | What diverges | What the layer must do |
|---|---|---|
| **Datetime / timezone** | Ticketmaster: ISO `dateTime` + IANA tz + separate `localDate/localTime`. Cadence sources: prose ("Saturdays 8am–2pm", "Apr 4–Nov 21") | Parse prose → structured windows; normalize every source to one tz-aware format + `RRULE`s for recurring |
| **Coordinates** | Aggregators + ArcGIS layers: native lat/lon. CVB + cadence: address-only (sometimes lat/lon leaked in map embeds) | A **geocoding step** for address-only records |
| **Category taxonomy** | Ticketmaster segment/genre · PredictHQ category · ArcGIS dataset types · art-walk/market labels — all incompatible | A **mapping table** from each source's vocabulary → the app's genres |
| **Stable ID / dedup** | Ticketmaster & PredictHQ carry stable event IDs. Scrape/permit sources don't | Exact-match on IDs where present; **fuzzy dedup** (name + date + geo-proximity) for the same festival appearing in Ticketmaster *and* a CVB calendar *and* a permit |
| **Reliability / freshness** | APIs update continuously; permits and scrapes lag; season dates shift | Per-source freshness/trust weighting |

**Minimum normalization pipeline:**
> parse + timezone-normalize datetimes → geocode address-only records → map source category → app genre → assign/derive stable ID + fuzzy-dedup across overlapping sources → attach `magnitude` (PredictHQ) + the photo-value score (the ADR's photo-lens gate)

The last step is where this rejoins the existing design: normalization produces clean `Opportunity` candidates, and the **photo-lens gate** (already specified in the ADR) drops the ones with no photo in them.

---

## Best-signal ranking (by signal-per-effort)

> Re-weighted after the golden-set test above. Effort still matters, but a low-effort source that fails the trust test isn't actually "high value" — it just looks that way on paper.

1. **Ticketmaster Discovery API** — free, documented, geocoded, tz-aware, uniform across all 8 cities. Best *effort-to-value* — but **necessary, not sufficient**: it fails the trust test alone (misses the free/self-ticketed neighborhood festivals). Use it for the ticketed spine, never as the only source.
2. **CVB (+ alt-weekly)** (Discover Atlanta, Visit Music City) — **the trust tier**: carries the must-have neighborhood festivals aggregator APIs miss. Reachable by **platform API** (Discover Atlanta = WordPress REST; Visit Music City = Simpleview Events API), not by scraping the rendered page — see the [deep-pass matrix](#carrier-source-pull-ability--tos-matrix). *(Do615/Nashville Scene: ToS bars scraping — skip.)*
3. **Per-city ArcGIS permit feeds** — high-signal *where they exist* (Charlotte closures, NOLA parades confirmed). Real REST APIs. Effort = locating the dataset per city; no uniform coverage.
4. **PredictHQ** — the only magnitude source + broader long tail, but **paid** and pricing-unverified.
5. **Cadence sources (RRULE)** — low modeling effort, but scrape + geocode per source. Best recurring texture.
6. **DoStuff** — Nashville-only, no API. Effectively unusable at our scope.

---

## Recommended starting shortlist

Given a solo, pre-validation product — and consistent with how we deferred the content-generation spend until it was proven — I'd stage it:

- **Prove-it layer (no new APIs):** the editorial + cadence seed for **one city** (hand + LLM), served through the `Opportunity` model. Answers "does timeliness change what I'd shoot?" for ~$0.
- **First live source:** **Ticketmaster Discovery API** (free, all-cities, clean schema) — the smallest real ingestion that exercises the full normalize → photo-gate → rank loop. But **do not ship it as the only source** — it fails the trust test (see golden-set).
- **The trust source (co-first, not later):** whatever gets **Discover Atlanta / Creative Loafing** into the pipeline — because without the neighborhood festivals (Dogwood, Candler Park), the app isn't trustworthy in its own home city. First step is verifying whether those sites offer a feed or need scraping.
- **First permit source:** **Charlotte's closure-permit dataset** or **New Orleans parade data** — the two *confirmed* municipal signals — to prove the high-value local-permit path on real ArcGIS data.
- **Add magnitude only if needed:** **PredictHQ**, once the free path proves timeliness matters but shows coverage gaps.

---

## What's verified vs. NOT (honesty ledger)

**Confirmed (high confidence):** ArcGIS-Hub platform for Charlotte/NOLA/Nashville/Atlanta/Miami-Dade · Charlotte closure-permit dataset present · NOLA parade data present · Atlanta & Miami-Dade permit signal absent · Ticketmaster free tier + schema + limits · PredictHQ attribute set · DoStuff = Nashville-only, no API · Eventbrite public search deprecated 2019 · cadence sources RRULE-able but feed-less.

**NOT verified — confirm before relying:**
- Permit availability for **Charleston, Savannah, Raleigh–Durham** (not checked) and **Nashville** (contested).
- **SeatGeek, Meetup** current access/coverage; **Eventbrite** post-deprecation partner state.
- **CVB / alt-weekly** iCal/RSS/JSON feeds + scraping ToS (Discover Atlanta, Visit Music City, Creative Loafing, Nashville Scene, Charleston City Paper, Axios Charlotte, etc.).
- **PredictHQ** actual pricing tiers/minimum cost.

**Open questions (good candidates for a follow-up pass):**
1. Which of the 8 cities publish event/closure/parade/film permits as queryable open data, and at what endpoints — esp. Charleston, Savannah, Raleigh–Durham, Nashville.
2. Current state + coverage of SeatGeek / Eventbrite / Meetup for these metros.
3. Do the CVB / alt-weekly calendars expose any feed, and what do their ToS allow?
4. PredictHQ's real pricing.

---

## Update cadence (freshness) — added 2026-07-25

The curated catalog (`content-pipeline/content/atlanta-events.json`) is hand-verified, so it needs a **refresh rhythm**, not a live feed (that's the eventual Ticketmaster/PredictHQ path). The rule:

- **Re-verify a season's events ~6 weeks before the season starts** — that's when official dates for annually-recurring events are typically published. At that point, flip `needs-date-verify` → `high` (or correct the date) against the official source.
- **`windowConfidence` is the freshness signal.** `needs-date-verify` = the recurrence is trusted but the exact date isn't confirmed for this cycle yet; `high` = confirmed against the official source for the upcoming instance.
- **Drop or re-date passed one-offs.** An event whose window is in the past should be corrected to its next instance (recurring) or removed.
- **A quick check-in on catalog health each quarter** — are the next ~6–8 weeks of events all `high`? Any dormant events to prune (e.g. Music Midtown, dropped 2023)?
- **When a live feed lands** (Ticketmaster spine), this manual cadence applies only to the editorial tentpole layer the APIs miss — the long-tail marquee events (Dragon Con, state fairs) — not the API-fed bulk.

As of 2026-07-25 the catalog is current: the 6 fall-2026 events are `high` (verified); the 6 spring/summer-2027 events are `needs-date-verify` and due for their pass ~Feb–Mar 2027.

---

## Sources (primary)

- Ticketmaster Discovery API v2 — `developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/`
- PredictHQ — `predicthq.com/pricing`, `docs.predicthq.com`
- Charlotte Open Data — `data.charlottenc.gov`
- New Orleans GIS Open Data — `portal-nolagis.opendata.arcgis.com`
- Nashville Open Data — `datanashvillegov-nashville.hub.arcgis.com`
- Atlanta (DPCD) Open Data — `dpcd-coaplangis.opendata.arcgis.com`
- Miami-Dade Open Data — `opendata.miamidade.gov`
- Charleston Farmers Market — `charlestonfarmersmarket.com`
- Arts District New Orleans (First Saturday) — `artsdistrictneworleans.com/events`
- DoStuff Network — `dostuffmedia.com/network`, `do615.com/other_cities`
