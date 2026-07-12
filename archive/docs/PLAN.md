# Vantage — Build Plan

*A photographer's location scout: "what should I shoot right now, and when's the light best?"*
Planning document — v1, 2026-07-10. This is a living doc; edit freely.

---

## 1. Product in one sentence
Vantage helps photographers find something worth shooting near them **right now** — scored on the signals that matter — and chain spots into one light-timed **route**.

**Two use cases, street-first:**
- **Street / street-portraits = the hard, valuable case** (finding human activity & density, especially outside major cities). We build and prove this **first**. See [POC_ATLANTA.md](./POC_ATLANTA.md).
- **Landscape = the easy case** (Google-able for national parks etc.). Lower differentiation → **layered in later**.

First city: **Atlanta** (data-rich; a real place to scout and test).

Source of truth for the UI: `design_handoff_vantage/` (README + 5 screens + `Vantage.dc.html`). We keep the Vantage *look*; the *content brain* is rebuilt for the street case.

---

## 2. The core insight
The UI is fully designed and is the *easy* part. The product's value lives in four data signals:

| Signal | Difficulty | Plan |
|---|---|---|
| Light timing (golden/blue hour, sun azimuth) | 🟢 Easy | Compute client-side with **SunCalc** (free, no API, no cost) |
| Weather + cloud cover | 🟢 Easy | **Open-Meteo** free API (no key required) |
| Events (scheduled activity) | 🟢 Easy-ish | **Ticketmaster Discovery API** (free) — festivals, concerts, sports, arts |
| Where street shots happen | 🟡 Medium | **Flickr** geotagged photo clusters + interestingness (auto-generated, no curation) |
| Activity / density ("is it busy") — the CORE street signal | 🔴 Hard | The real challenge. Proxy for POC with events + Flickr density; live busyness later needs Foursquare/OSM or paid data |

**Strategy: prove the hard STREET case first in Atlanta by *auto-generating* opportunities (events + photo clusters + light) — no manual curation. See [POC_ATLANTA.md](./POC_ATLANTA.md). Then build the app around it; add landscape last.**

> Note: for street, a busy scene is the *goal*, not a downside — the opposite of the scenic-scout framing the original mockup implies.

---

## 3. Tech stack

| Layer | Choice | Why |
|---|---|---|
| App framework | **Expo (React Native)** | One JS/TS codebase → iOS + Android. Best path for a non-native dev + AI help. |
| Language | **TypeScript** | Catches mistakes early; worth it. |
| Navigation | **Expo Router** | File-based, matches the 4-tab + detail structure. |
| Backend | **Supabase** | Postgres DB + auth + photo storage + auto APIs. Free tier. |
| Light/sun math | **SunCalc** | Golden/blue hour, sunrise/set, azimuth/elevation. Free, offline. |
| Weather | **Open-Meteo** | Free, no API key, has cloud cover. |
| Map | **Mapbox** (react-native-mapbox) | The design's stylized dark map needs custom styling; Mapbox does it best. |
| Fonts | `@expo-google-fonts/newsreader` + `.../hanken-grotesk` | Exactly the two families the design specifies. |
| Distribution | **EAS Build** + TestFlight (iOS) / Play Console (Android) | Expo's build service handles the native builds you can't do by hand. |

---

## 4. Phased build plan

Each phase ends with something you can see and tap. We don't touch real data until the screens exist.

### Phase 0 — Foundations & design system (make it *look* right, fake data)
- Set up Expo + TypeScript + Expo Router project.
- Encode the design tokens (colors, type scale, radii, spacing) from the README into a theme file.
- Load the two Google fonts.
- Build the 4-tab bar + pushed detail navigation.
- Build all 5 screens with **hardcoded mock data** (copy the sample spots from `Vantage.dc.html`).
- Goal: all 5 screens pixel-match the screenshots. No real data yet.

### Phase 1 — Real light engine
- Wire in SunCalc. Replace hardcoded light curves, golden/blue-hour countdown, and the sun/shadow compass with values computed from lat/long + date/time.
- The "Today" countdown and the detail light chart now reflect reality.

### Phase 2 — Real weather
- Pull current + hourly weather and cloud cover from Open-Meteo for each spot's coordinates.
- Feed the Sky/Cloud/Temp stat rows.

### Phase 3 — Backend + persistence
- Stand up Supabase. Create the `spots` table; seed ~30 hand-curated Portland spots.
- Move spot data out of the app and into the DB (app fetches it).
- Add anonymous/simple auth so **Saved** and **Routes** persist per user.

### Phase 4 — Map
- Add Mapbox with a custom dark style approximating the design.
- Render scored teardrop pins from real spot coordinates; wire filters and pin→detail.

### Phase 5 — Scoring, crowd decision & polish
- Implement the spot "score" as a real formula (light quality + weather + distance).
- Decide crowd density: omit, heuristic, or paid API (see Open Decisions).
- Animations, empty/loading/error states (the prototype has none), real imagery.

### Phase 6 — Beta & launch
- EAS build → TestFlight beta with a few photographer friends.
- Iterate, then submit to App Store + Play Store.

---

## 5. Open decisions (need your input)

1. **Where do spots come from at launch?**
   - (A) *You* hand-pick ~30 Portland spots (fastest, highest quality, recommended for MVP)
   - (B) Pull candidates from Google Places / geotagged Flickr photos (more spots, messier, more work)
   - (C) Community-submitted from day one (cold-start problem — hard early)

2. **Crowd density** — omit for v1, rough heuristic (e.g. "busier midday"), or pay for an API (BestTime.app) later?

3. **Photos** — the example-shot galleries are central. Options: your own photos, licensed stock, or user-contributed. Licensing is a real decision, not an afterthought.

4. **Which city first?** Portland (matches the design's sample data) or somewhere you can personally scout and photograph?

5. **Account model** — anonymous (just works, saves locally/per-device) vs. real sign-up (needed if spots/routes sync across devices)?

---

## 6. Realistic effort snapshot
- Phases 0–2 (beautiful app, real light + weather, one hardcoded city): the big visible win. Very achievable.
- Phases 3–4 (backend + map): where "toy" becomes "product."
- Phase 5–6: the long tail of polish + launch.

This is a learn-as-you-go project. We go one phase at a time; you'll understand each piece before we move on.

---

## 7. Costs to expect (rough)
- Expo / React Native / SunCalc / Open-Meteo / Supabase free tiers: **$0** to build and run small.
- Apple Developer Program: **$99/yr** (required to ship on iOS).
- Google Play: **$25 one-time**.
- Mapbox: free tier is generous; paid only at scale.
- Crowd API / stock photos: only if you choose them.
