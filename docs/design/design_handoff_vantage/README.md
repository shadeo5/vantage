# Handoff: Vantage — Photographer Location Scout (Mobile App)

## Overview
Vantage is a mobile app that helps hobbyist photographers find the best things to shoot near them **right now**. It goes beyond an events list: every spot is scored on the signals a photographer actually cares about — quality of light (golden/blue hour timing), weather & cloud cover, crowd density, and sun/shadow direction. The core flow is **route planning**: chaining several spots into one evening, each timed to hit its best light.

Target platform: **iOS-first mobile** (390×844 design frame), single portrait phone layout. Hobbyist / weekend-shooter audience. Editorial, photography-forward visual tone.

## About the Design Files
The file in this bundle (`Vantage.dc.html`) is a **design reference created in HTML** — an interactive prototype showing intended look and behavior. It is **not production code to copy directly**.

> ⚠️ **Format note:** `Vantage.dc.html` is authored in a bespoke "Design Component" (`.dc.html`) format that relies on a private `support.js` runtime (not included) and template tags like `<sc-if>`, `<sc-for>`, and `{{ handlebar }}` holes. **It will not run standalone in a browser.** Treat it as a readable spec of markup, inline styles, and the logic class at the bottom of the file — not as a component to import. All data (spots, tips, light curves) lives in the `class Component` block near the end of the file.

The task is to **recreate these designs in your target codebase's existing environment** (React Native, SwiftUI, Flutter, etc.), using its established patterns, component library, and navigation. If no environment exists yet, pick the most appropriate mobile framework and implement there.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, and interactions are all specified below and present in the HTML. Recreate the UI to match. The one caveat: example photos are pulled from Unsplash placeholders — swap in real licensed/user imagery.

## Screenshots
Reference renders are in the `screens/` folder (top-of-screen views):
- `screens/01-today.png` — Today (golden-hour hero + ranked spots)
- `screens/02-spot-detail.png` — Spot detail (photo hero + intent copy)
- `screens/03-routes.png` — Tonight's route (summary + numbered timeline)
- `screens/04-map.png` — Map (scored teardrop pins + filters)
- `screens/05-saved.png` — Saved collection grid

Note: these show each screen from the top. Below-the-fold sections (the light-quality chart, sun/shadow compass, crowd chart, example-shot gallery, and field notes on the detail screen) are fully specified in the **Screens / Views** section below — treat that text as the source of truth for anything not visible in a screenshot.

---

## Design Tokens

### Colors
| Token | Hex | Use |
|---|---|---|
| Canvas / phone bg | `#0F0F11` | App background |
| Surface | `#161618` | Cards, panels |
| Surface (subtle) | `#141416` | Suggestion rows |
| Ink (primary text) | `#F4F1EA` | Headings, primary text |
| Muted text | `#8C8A93` | Labels, captions |
| Muted text 2 | `#9b98a2` / `#c4c1cb` | Secondary body copy |
| Golden (accent) | `#E9B872` | Golden hour, primary accent, scores |
| Golden bright | `#F2A93B` | Sun dot, live pulse |
| Blue hour | `#7FA0CF` | Blue-hour windows, route theme |
| Day / flat light | `#9DB89A` | Overcast / flat-light bars |
| Crowd low | `#7FB07A` | Low crowd |
| Crowd medium | `#E0B15A` | Moderate crowd |
| Crowd high | `#D17A6B` | Busy crowd |
| Saved / heart | `#E07A8B` | Saved state |
| Hairline border | `rgba(255,255,255,.07)` | Card borders |
| Dark text on accent | `#15110a` / `#1a1408` | Text on golden buttons/badges |

### Typography
Two families (Google Fonts):
- **Newsreader** (serif, opsz 6–72, weights 400/500) — all display headings, spot names, screen titles, numbered route markers. Editorial feel.
- **Hanken Grotesk** (sans, weights 400/500/600/700) — body, labels, UI text, buttons.

Scale (px): screen title 30 · hero countdown 44 · detail hero title 34 · card title 21 · section head 19–22 · body 14–15 · label/caption 11–13 · uppercase eyebrow 11–12 with `letter-spacing:1–1.5px; text-transform:uppercase`.

### Radius & effects
Cards 18–24px · pills/chips 20px · circular avatars/buttons 50% · phone frame 46px. Map pins are a teardrop (`border-radius:50% 50% 50% 4px` rotated 45°). Glass overlays use `backdrop-filter: blur(8–16px)` over `rgba(10–20,10–22,.5–.82)`. Shadows are soft and low (`0 4px 14px rgba(0,0,0,.5)` on pins; large ambient on the phone frame only).

### Spacing
Screen padding: `58px top / 20px sides / ~110px bottom` (bottom clears the tab bar). Card gaps 14–16px. Grid gaps 10–14px.

### Animations
- `vScreenIn` — screen enter, `translateY(12px)→0`, .35–.4s ease.
- `vRise` — card enter, `translateY(16px)→0`, .5s ease.
- `vPulse` — golden "live" dot, opacity .55↔1, 2s infinite.
- Bottom sheets: `translateY(100%)→0`.

---

## Screens / Views

Navigation is a persistent bottom tab bar (4 tabs) plus a pushed detail screen. Tabs: **Today** (◎), **Map** (⊕), **Routes** (⤳), **Saved** (♥). Active tint = golden `#E9B872`; inactive = `#6E6C75`. Detail keeps "Today" highlighted.

### 1. Today
- **Purpose:** Land on the single best answer to "what should I shoot right now?"
- **Layout:** Vertical scroll. Header row (date eyebrow + serif "Today in {city}" + circular avatar). Then the **golden-hour hero card**, then "Best shots near you" section with a vertical list of spot cards.
- **Hero card:** warm gradient (`#5a3d1e→#3a2a18→#211b14`), a radial sun glow top-right, a pulsing golden dot + "GOLDEN HOUR INCOMING" eyebrow, a large serif countdown (e.g. `2h 12m`), subtext "until golden hour · 6:42 PM", and a 3-stat row (Sky / Cloud / Temp) divided by a hairline.
- **Spot card:** image (188px) with top→bottom scrim, a type chip top-left (glass), a score badge top-right (glass, colored score), serif name + tagline bottom-left. Footer strip below image: light window (colored + icon, `white-space:nowrap`), crowd (colored dot + label), distance (pushed right). Whole card is tap → detail.

### 2. Spot Detail
- **Purpose:** Everything needed to decide and prepare for one spot.
- **Layout:** 340px photo hero (bottom scrim into canvas), back + save circular glass buttons top corners, type chip + score badge, serif title + tagline over the image. Scrolling body below. Sticky bottom action bar (gradient fade) with an **Add to route / ✓ In tonight's route** toggle button.
- **Sections, in order:**
  1. **Why** — one paragraph of intent copy.
  2. **When the light works** — card with a 10-bar hourly light-quality chart (bar color = light type: golden/blue/flat, flat bars at .35 opacity; the "now" bar gets a 2px `#F4F1EA` ring). Legend row: Golden / Blue hour / Flat-day. Window time shown top-right in golden.
  3. **Two-up grid:** *Sun & shadow* (a 96px compass dial — N/S/E/W ticks, a rotated golden sun ray + dot at the sun's azimuth, center pivot dot, "WNW · 4°" label, "shadows fall opposite") and *Crowd density* (10-bar hourly chart colored by crowd level, "{level} right now" + "quietest after 8 PM").
  4. **Weather strip** — 3 equal cells (Sky / Cloud / Temp) divided by hairlines.
  5. **What you can expect to shoot** — 2-col gallery (first image tall 200px, rest 96px) of recent example frames.
  6. **Field notes** — numbered list (golden ring bullets) of practical tips.

### 3. Routes (core flow)
- **Purpose:** Plan tonight — an ordered, light-timed itinerary.
- **Layout:** Date eyebrow + serif "Tonight's route". A blue-themed **summary card** (gradient `#23314a→#161a26`): "OPTIMIZED FOR TONIGHT'S LIGHT" eyebrow, Window (start–end) + Sunset stats, and a footer line ("17 mi · 3 stops · timed so you reach each spot at its best light").
- **Timeline:** each stop is a numbered serif circle (ring colored by its light window) + a card (66px thumb, name with ellipsis, arrival time in window color, type · distance, activity label like "Golden hour · 38 min", and an `×` remove control). Between stops: a dashed vertical connector + "↓ 14 min drive".
- **Add to the route:** below the timeline, a list of suggestion rows (48px thumb, name, type · window, a `+` circle). Tap adds the spot to the route.

### 4. Map
- **Purpose:** Spatial discovery of tonight's scored spots.
- **Layout:** Full-bleed stylized dark canvas: radial vignette, faint 52px street grid, a rotated translucent "river" band, two soft green "park" blobs. **Score pins** are teardrop markers colored by light type, each showing its numeric score. Top overlay: a glass search bar ("Search Portland, OR") + a horizontal filter chip row (☀ Golden now [active, golden fill] / 🌙 Blue hour / Low crowd), all `white-space:nowrap`. Bottom info card (above tab bar): "6 SPOTS PEAKING TONIGHT" + explainer. Tap a pin → detail.

### 5. Saved
- **Purpose:** The user's collection.
- **Layout:** "YOUR COLLECTION" eyebrow + serif "Saved spots" with a count. 2-col grid of compact cards: 130px image with scrim + heart top-right, serif name, colored light-window line. Tap → detail.

---

## Interactions & Behavior
- **Tab nav:** switches the active screen; Today/Detail share the Today tab highlight.
- **Spot card / pin / saved card tap:** push Spot Detail for that spot.
- **Back button (detail):** return to Today.
- **Add to route toggle (detail):** adds/removes the spot from the route array; button label + fill swap between golden "Add to route" and green-outline "✓ In tonight's route".
- **Save toggle (detail):** heart fills `#E07A8B` and adds to saved.
- **Route remove (`×`):** removes that stop; timeline renumbers.
- **Route suggestion `+`:** appends the spot to the route.
- **Enter animations:** screens rise+fade in; cards stagger with `vRise`; the hero "live" dot pulses.
- No error/loading/validation states in this prototype (add per your data layer).

## State Management
- `screen`: `'today' | 'detail' | 'map' | 'routes' | 'saved'`
- `activeId`: currently opened spot id (drives detail).
- `route`: ordered array of spot ids (default `['pittock','steel','japanese']`).
- `saved`: array of spot ids (default `['pittock','sauvie']`).
- Derived per render: score/window colors, light-quality curve, crowd curve, sun azimuth → dial rotation, route arrival/drive strings, suggestions (spots not already in route).
- **Data to fetch in production:** per-spot sun times (golden/blue hour, azimuth/elevation) from lat/long + date (e.g. a sun-position library), live weather + cloud cover, and a crowd-density signal. In the prototype these are hardcoded on each spot object.

## Assets
- **Fonts:** Newsreader + Hanken Grotesk (Google Fonts).
- **Icons:** simple Unicode glyphs (◎ ⊕ ⤳ ♥ ☀ 🌙 ☁ ‹ × +). Replace with your icon set.
- **Photos:** Unsplash placeholder IDs referenced as `images.unsplash.com/photo-{id}`. These are **placeholders** — replace with real licensed or user-contributed imagery. The example-shot galleries are central to the product, so photo sourcing/permissions is a real design decision.
- Sample spots are Portland, OR locations (Pittock Mansion, Steel Bridge, Japanese Garden, Sauvie Island, Old Town/Chinatown, KOIN Rooftop) — placeholder content.

## Files
- `Vantage.dc.html` — the full prototype (all 5 screens + logic). The `class Component` block near the bottom holds all spot data, the light/crowd curve generators, and route logic. Read it as the source of truth for exact copy and values.
