# Vantage — Backlog (epics & stories)

**How we work (calibrated to stage):** epics/themes are mapped out now for tracking; **stories get detailed just-in-time** for the epic we're about to build (not the whole tree upfront), because the product is still pre-validation and requirements will shift. **Acceptance criteria + automated tests** are written for stable, regression-prone logic — not everything. Rigor scales up as the product validates or the team grows.

**Status:** ✅ done · ▶ in progress · 🎯 next · ⬜ planned · ◽ later

---

## E0 · App shell & core UX  ✅ (built)
The nudge-first app, rebuilt from the Claude Design handoff v2.
- ✅ Today — gear banner, "your shoot tonight", inspiration hero + "why this pick?", ranked "best near you"
- ✅ Spot detail — hero, why, live light-ramp chart, "what to look for", gallery, getting there
- ✅ Plan — this-week slate, day groups, Light/Activity/Event tags, "I'm going"
- ✅ Bag — gear onboarding (cameras, lens/style chips)
- ✅ Lock — notification moment → tap to enter
- ✅ Bottom tab nav (Today / Plan / Bag)
- ◽ Saved collection screen (hearts persist somewhere) — deferred

---

## E1 · Content  🎯 NEXT — the biggest open workstream
The app currently runs on 5 hand-curated Atlanta spots + Unsplash placeholders. This epic answers: where does real content come from, and in what voice?
- 🎯 **C1 — Spot sourcing strategy.** Decide how spots are generated/curated at scale (LLM-assisted from OSM + local knowledge? editorial? community?). *AC: a documented, repeatable way to produce a new city's spot list with the fields the UI needs (name, why, look-for, getting-there, coords, window type).*
  - ⏸️ **Content-drafting pipeline BUILT, running DEFERRED** (`content-pipeline/generate.mjs`): places (name+coords+genre) → Claude (`claude-opus-4-8`, structured output = the `Spot` schema, voice guide baked in) → reviewable `out/atlanta.json`. Validated the *quality* by hand (8 ATL spots, user approved). **Not worth the API spend pre-validation** — the app runs fine on the 5 curated placeholder spots, and bulk generation only pays off once we need volume (launch, or a 2nd city). Code is committed; has never been run (no `out/atlanta.json`, no key used). WHEN REVISITED: run it (needs ANTHROPIC_API_KEY), review output, wire JSON into `vantage/lib/spots.ts`. Still separate: the *curation* step (which places make the list — OSM + local knowledge).
- ✅ **C2 — Imagery (interim).** AI-generated **stylized illustrations** as honest placeholders (art, not fake photos of real places). Direction + copy-paste prompts at `docs/design/ILLUSTRATION_STYLE.md`. DONE: user generated all 5, wired into `vantage/assets/spots/*.png` + `lib/spots.ts` (local `require()` map replacing the Unsplash URLs, `img()` now returns a bundled module); the "what people shoot here" gallery was REMOVED (can't honestly show illustrations as real user photos). Typecheck + 32 tests pass. FOLLOW-UPS (deferred): images are ~3 MB each / ~15 MB total — resize/compress before ship; real place photography (user's own / Wikimedia) is still the eventual replacement. *AC met: hero images load per spot; no fake stock misrepresenting a place.*
- ✅ **C3 — Voice & tone guide.** 1-page guide at `docs/design/VOICE.md` (extracted from the pipeline's baked-in voice + the gold-standard spot copy). Existing app copy audited against it: mostly on-voice; fixed 2 real drifts — invented hours ("last entry 9 PM" / "parking after 7 PM" → generalized, per the honesty rule) + Plan-screen jargon tags (Light/Activity/Event-driven → "The light" / "The crowd" / "Happening"). Open polish (logged, not done): Plan fit-label register, generic "Add your gear", hardcoded "M" avatar. Imagery-misrepresentation flag handed to C2.
- ⬜ **C4 — Content generation pipeline.** Tooling to draft per-spot copy at scale, human-reviewed.
- Note: mixed-genre content (street + cityscape + nature) is confirmed good — validated as "top areas to shoot today."

---

## E2 · Personalization & Gear  ⬜
Make "your kit" real and load-bearing (it's currently a static "35mm").
- ✅ **G1 — Persist the gear profile.** Selected lenses persist on-device via AsyncStorage (`lib/gearStorage.ts`) — hydrated on launch, saved on change, survives reload. Verified: 46 tests (incl. save/load round-trip + corrupt-data guards) + clean headless web bundle. (Camera still fixed X100VI, so only lenses persist for now; backend sync is later.)
- ✅ **G2 — Gear → subject matching.** Telephoto→distance/sports; fast prime→low-light street; wide→architecture; macro→details. Drives the "why … your kit" line and per-spot "fits/grab a tele". CATALOG + MATCHING ENGINE BUILT: `vantage/lib/gear.ts` (19 cameras, 24 lenses w/ real specs; `equivalentFocal`/`genresForLens`/`genresForKit`, crop-factor aware) + `__tests__/gear.test.ts`. WIRED INTO THE APP (2026-07-12): Bag screen is catalog-backed with a live "Your kit shoots" row (`lib/gearProfile.ts`); Today hero + Lock copy name the lens that actually fits tonight's spot — annotate-only + honest (a tele won't be called a street lens; falls back to the street-capable body). Spots gained a `genre` field for the fit check. DONE: camera picker — pick from all 19 catalog bodies on the Bag screen → the kit recomputes per body (e.g. a 35mm reads differently full-frame vs APS-C) → persists across reload. Verified end-to-end in-browser. ✅ G1 persistence (camera + lenses) · ✅ Plan "fits" labels gear-aware (`fitLabel`, honest — never claims a lens that doesn't cover the spot) · ✅ Today/Lock copy gear-aware. Known simplifications: phones filed as "1-inch" (crop math still lands ~24mm); `genresForKit` assumes any lens fits any body (over-generous — future: match lenses to compatible mounts). **ADR: `docs/engineering/GEAR_MATCHING.html`** (rules + the open filter/re-rank/annotate decision).
- ⬜ **G3 — Gear banner re-prompt logic.** Dismiss = 30-day floor; re-ask event-based (after "I'm going" / on 2nd–3rd return), not a blind timer.

---

## E3 · The nudge & notifications  ✅ (live, end-to-end)
Turn the in-app hero into an actual proactive nudge — the north star.
- ✅ **N1 — "Is today great?" threshold.** A quality bar that decides whether to nudge at all (inspire, don't nag). `lib/nudge.ts` — `tonightNudge(now, camera, lenses)` scores every spot (light-timing × gear-fit; activity = weight-0 placeholder for events), picks the best, returns go/no-go + confidence + Why-signals. Pure/testable (13 tests). WIRED into the app + verified in-browser: the brain now picks the Today hero, sets the confidence badge ("TONIGHT'S PICK · MEDIUM"), and generates the "Why this pick?" signals (Light timing / Activity placeholder / gear fit). Honest: with no weather/events yet, "light" scores WHEN the good light is, not cloud cover. NEXT (N3/N2): richer nudge-copy generation, then real push delivery (needs backend E4 + dev build).
- ✅ **N2 — Push delivery** — LIVE. Deployed Supabase Edge Function (`supabase/functions/nudge/index.ts`, a Deno port of the brain) reads profiles + sends via Expo Push; scheduled nightly by `pg_cron` (`vantage-nightly-nudge`, `0 22 * * *` ≈ 6 pm Atlanta). Real push verified end-to-end onto the Pixel — manual curl, deployed-function invoke, and the scheduled job all confirmed. Needed the dev build (E5/P1) for the token.
- ✅ **N3 — Nudge copy generation** — personal, non-spammy, gear-aware. `lib/nudgeCopy.ts` — `nudgeCopy(verdict, lens, now)` composes a fresh push title+body from confidence-tiered phrasing pools, weaving in the spot, the fitting lens, the window + time, and distance. Variety is DETERMINISTIC (day-of-year seed → fresh per day, stable within a day, testable). Tone tracks confidence (high = "Tonight's the night", medium = "worth a look", no-go = honest "quiet one"). Wired into the Lock screen (the push mock), verified in-browser. 4 tests. Voice per `docs/design/VOICE.md`.
- ✅ **N4 — Shooting check-in / journal.** "Did you get out?" → doubles as the engagement/return metric *and* a shooting log. `lib/journal.ts` (+ `components/CheckInCard.tsx`): "I'm going" records a persisted Commitment; on RETURN in a later session the Today screen asks "Did you make it to [spot]?" → [I shot it / Not this time] → resolves into a persisted JournalEntry. A "Your shoots — you've been out N times" stat surfaces the return metric. Closes the loop: nudge → shoot → return → check-in. All on-device (AsyncStorage); opt-in photo-EXIF match is the later strengthening. Verified end-to-end in-browser. 3 tests. (Also fixed: "Best near you" now excludes the dynamic hero, not the old hardcoded HERO_ID.)

---

## E4 · Backend & data  ▶ (foundation LIVE)
**Design:** `docs/engineering/PUSH_ARCHITECTURE.html` (ADR) — Supabase cron → the ported nudge brain → Expo Push. Blocked on the user creating a free Supabase project (URL + anon key) + a free Expo account; then I scaffold DB + edge function + app-side push registration.
- ✅ **B1 — Supabase** — DB (profiles + push token + gear + nudge_log) + the scheduled edge function running `nudge.ts`/`nudgeCopy.ts` server-side. Project live + creds validated (`yqulquuzhkiwbucpqdcm`). DONE: app Supabase client (`lib/supabase.ts`, anon key via gitignored `.env`, RN url-polyfill + AsyncStorage per Supabase docs); schema at `vantage/supabase/schema.sql` (profiles + nudge_log, RLS scoped to `auth.uid()`, anonymous-auth model). Dashboard steps DONE (schema run + anonymous sign-ins enabled); full path validated by hand (anon sign-in → RLS insert → read → delete). **App↔cloud sync LIVE** (`lib/sync.ts`): app anonymously signs in on launch and upserts the gear profile to `profiles` — verified in-browser (console `[sync] profile saved`, row visible in Table Editor). Dev build + push token: `expo-notifications`/`expo-device`/`expo-constants` installed; push registration wired + verified (`lib/push.ts` → token → `savePushToken` → `profiles.push_token`, no-op on web); `app.json` (android package `com.shadeo5.vantage` + notifications plugin) + `eas.json` (preview = internal-distribution APK) set. DONE: `eas login` (shadeo5) + `eas init` (projectId `487f03db…`); Firebase project `vantage-57f96` + `google-services.json` wired via `android.googleServicesFile` (committed — EAS builds from git). **ALL DONE ✅** — Pixel preview-APK build installed + push token saved to `profiles.push_token`; Firebase project `vantage-57f96` + FCM service-account key uploaded to EAS; Edge Function deployed + scheduled via `pg_cron` (`vantage-nightly-nudge`). Push verified end-to-end. **GOTCHA (cost us a rebuild):** EAS builds from git, so a gitignored `.env` never reaches the cloud build — Supabase creds must be set as **EAS env vars** (`eas env:create`, preview env), not just `.env`.
- ⬜ **B2 — Precompute + serve** — scheduled job generates districts per city into Postgres; app reads a ready list (near-instant loads; no phone hits Overpass). *(Layer 1 of the "loads instant" plan.)*
- ⬜ **B3 — On-device cache** — stale-while-revalidate; instant relaunch even before a backend. *(Layer 2 — cheap early win.)*
- ⬜ **B4 — Real events integration** — ESPN (sports, proven) + tentpole editorial (+ Ticketmaster later), geo-filtered. (Prototyped in `archive/poc`.)
- ◽ **B5 — Supply analysis** — run the engine across many days/times to measure how many worth-it options a day has (decides single-hero vs. list). Partial until N1 exists.

---

## E5 · Platform & ship  ▶
- ✅ **P1 — Dev build** (EAS, Android). Preview-APK profile (`eas.json`, internal distribution) built + installed on the Pixel; push token registered (`lib/push.ts`) → saved to the profile. Firebase FCM configured (`google-services.json` + service-account key on EAS). iOS build later (needs Apple Developer, $99/yr). *(Also fixed expo-doctor — `@types/jest` dedupe.)*
- ⬜ **P2 — Real location** (device GPS) instead of hardcoded downtown Atlanta.
- ⬜ **P3 — Weather (Open-Meteo)** → weather-aware light chart (cloud cover tempers golden hour).
- ◽ **P4 — Accounts / auth** (anonymous → real, once cross-device sync matters).
- ◽ **P5 — App Store + Play submission.**

---

## E6 · Quality & maintainability  ▶
- ✅ **Q1 — Dead code removed** (old OSM areas/events + old components).
- ✅ **Q2 — Unit tests on core logic** (`lib/light.ts`, `lib/spots.ts`) incl. a regression guard for the suncalc degrees/radians gotcha. `npm test`.
- ⬜ **Q3 — Metrics instrumentation** — engagement (nudge response + return), "I'm going" taps. Truth-checked against real shooting.
- ⬜ **Q4 — Error / loading / empty states** across screens (network images, data fetches).
- ◽ **Q5 — Component / e2e tests** once flows stabilize.
- ◽ **Q6 — Accessibility pass** (labels, contrast, touch targets). *(See UX on-device pass in E7.)*

---

## E7 · Experience & polish  ▶ (from the Jul-13 UX review — `docs/UX_REVIEW.html`)
Now that the app is on a real Pixel, the job is closing "impressive demo → feels finished." The review logged **2 P0 · 10 P1 · 7 P2**. Below is the **authoritative ordered work-list** — one row per review finding (its `#ID`), in the order to build. This is what the `/loop` run walks top-to-bottom.

**Ordered checklist (each row = one review finding; build in this order):**
| # | ID | Sev | Item | Status |
|---|----|-----|------|--------|
| 1 | #B1 | P0 | **Bag tab ≠ onboarding** — strip "SETUP · 2 OF 3 / Continue / Skip"; make the Bag *tab* a calm gear manager ("Your bag", changes auto-save, single "Done" or nothing). | ✅ eyebrow→"YOUR GEAR · SAVES AS YOU GO", title→"Your bag", removed Continue/Skip (swipe nav + auto-save make them moot); dropped `onContinue`. |
| 2 | #P1 | P0 | **Plan week hardcoded / wrong day labels** — "TONIGHT · SAT" on a Monday. Near-term: generate day labels from the real date. Longer-term: drive the week from the nudge brain. | ✅ (near-term) day labels derived from real date; event cards anchored to their real weekday (`when: {dow}` → Sunday market on a Sunday, Fri art walk on a Friday); sorted by date; "Tonight/Tomorrow · Dow". Brain-driven week still longer-term. |
| 3 | #T1 | P1 | **Gear banner persists after gear set** (ties **G3**) — only show when gear is empty; else drop or a quiet dismissible "Tuned to your a7 IV · edit." | ✅ banner gated on `lenses.length === 0` — drops out in the default state (ships with a lens), reappears only if you clear all lenses (where "Add your gear" is accurate). Copy reword → #B2. |
| 4 | #T3 | P1 | **Hide "Activity — coming soon"** in "Why this pick?" until events exist — two strong reasons beat two + an IOU. | ✅ dropped the activity signal from `scoreSpot` (weight was already 0, score unchanged); "Why this pick?" now shows Light + Your kit. Type key kept for when events land; test updated. |
| 5 | #T2 | P1 | **"MEDIUM" confidence reads as "meh"** — flourish for HIGH only ("TONIGHT'S PICK ✦"), nothing extra on medium, genuinely weak night → honest "quiet night." | ✅ badge: HIGH→"TONIGHT'S PICK ✦", MEDIUM→plain "TONIGHT'S PICK" (no raw grade), !go→"A QUIET NIGHT" (dimmed dot, no pulse) with honest hero name + lede instead of "alive tonight / grab your lens and go". |
| 6 | #D1 | P1 | **Heart/save doesn't persist** — wire to local+cloud (patterns exist) or remove until a Saved surface exists. *(decision: persist vs remove — default persist local, flag cloud.)* | ✅ **default call: persist locally.** New `lib/savedStorage.ts` (AsyncStorage, same best-effort pattern as gear) + 5 tests; `saved` hydrates on launch and persists on every toggle. FOLLOW-UPS (flagged): cloud sync (mirror to `profiles` like gear), and a Saved surface to browse hearts. |
| 7 | #P2 | P1 | **Plan's four full-width gold "I'm going" buttons flatten hierarchy** — demote per-card action to secondary (outline/compact pill); reserve solid gold for the one primary CTA. | ⬜ |
| 8 | #B2 | P1 | **No real first-run path to gear** — decide the model. Default (recommend): no wizard — Today works with sensible defaults, Bag is always gear-management, banner (when unset) is a gentle "personalize your picks →". *(pairs with #B1.)* | ⬜ |
| 9 | #T4 | P2 | **"M" avatar** — wrong initial + dead tap. Derive the initial (or drop until a profile exists); if it stays, make it lead to Bag/settings. | ⬜ |
| 10 | #D2 | P2 | **Light chart under-explained** — one plain-language line ("taller = better light; you're here →") + make the "now" bar unmistakable. | ⬜ |
| 11 | #P3 | P2 | **"fits your 35mm" repeats every Plan card** — show the fit label only when it *differs* from the obvious (e.g. "grab a tele"). | ⬜ |
| 12 | #B3 | P2 | **Surface "YOUR KIT SHOOTS" more** — it's the payoff of the Bag screen; give it prominence + consider echoing on Today ("your kit's built for street tonight"). | ⬜ |
| 13 | #T5 | P2 | **Today→Detail black flash on web** — verify on Pixel; if present, cross-fade from the current screen instead of fading up from black; confirm hero image loaded before animating. | ⬜ |
| 14 | — | P2 | **No max-width (web stretch)** — cross-cutting refinement from E7's old P2 bucket; cap content width so the web preview doesn't stretch edge-to-edge. | ⬜ |
| 15 | — | — | **On-device pass** (ties **Q6**) — mostly needs the hand: notification appearance, touch targets/thumb reach, safe areas (sticky CTA vs gesture bar), **haptics** (code-able via `expo-haptics`), contrast in real light, in-context permission timing. | ⬜ |

**Done (this workstream):**
- ✅ **#N1 (UX-N1) — Swipe navigation.** Today/Plan/Bag are a horizontal paging `ScrollView` in `App.tsx`; swipe + the bottom bar both drive it, kept in sync via `onScroll` (not `onMomentumScrollEnd`, which doesn't fire on web). Detail + Lock ride as absolute overlays so the pager keeps its scroll position. Replaced the old `screen`/`detailFrom` state with `tab` + `detailOpen`/`showLock`. Verified on web (user confirmed swipe + tab-sync); on-device pending an `eas build`.
- ✅ **#N2 (UX-N2) — Bottom-tab icons.** Heavier strokes (2), size 24, brighter inactive, gold "pill" behind the active tab, press ripple. (`BottomNav.tsx`)
- ✅ **#N3 (UX-N3) — Button press feedback.** All controls now have a pressed state (opacity/scale) + `android_ripple`: Today hero, Plan card+CTA, Bag Continue/Skip/camera + lens/camera/style chips + "pick your style" toggle, check-in buttons, `SpotRow` rows, `SpotDetail` back/heart circles + sticky CTA.
- ✅ **#N4 (UX-N4) — Overscroll bounce.** `alwaysBounceVertical` + `overScrollMode="always"` on Today/Plan/Bag/Detail scroll views.
- NOTE: these are JS changes — live on web immediately, but need an `eas build` to appear on the installed Pixel APK.

**Loop guidance:** decision-heavy rows (#D1 persist-vs-remove, #P2 hierarchy, #B2 first-run model) — make the flagged default call, note it in the commit, keep moving; don't block. Rows needing the physical phone (#T5 verify, most of the on-device pass) — do the code-able part, flag the rest for Desha's hands.
