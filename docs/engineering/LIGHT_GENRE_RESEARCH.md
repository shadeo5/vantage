# Light Quality × Genre — Research Findings

**Status:** Research findings for the [Light Quality is Genre-Dependent ADR](./LIGHT_QUALITY_GENRE.html) · **Date:** 2026-07-16
**Feeds:** the nudge scorer's light model (`vantage/lib/nudge.ts` — the `BASE_QUALITY` weights)

**Method:** deep-research harness — 5 search angles → **22 sources fetched** → **86 falsifiable claims extracted** → **25 put through 3-vote adversarial verification** (a claim needs 2-of-3 refutes to be killed). **Result: 25 confirmed, 0 refuted, 0 unverified.** Every claim below is tagged with its confidence and carries a supporting quote + source.

> **Provenance note (be honest about it):** the harness's final *synthesis* step returned a placeholder, so these findings were recovered directly from the run's `journal.jsonl` (the per-agent verified claims), not from a clean synthesized report. The underlying search + extract + verify work is intact; the packaging step is what failed. The numeric weights proposed in the ADR are **my derivation for tuning — no source supplies them.**

---

## The one-line answer

**Light is not a good/bad quality ladder — it's a multidimensional set of creative modes, and how much "light quality" gates a shoot depends heavily on the genre.** Landscape is highly light-timing-dependent; street is largely light-flexible (but *not* zero — light-forward/color street still times light). This directly supports replacing the global `golden 1.0 / blue 0.85 / flat 0.55` with a **per-genre light-sensitivity** model.

---

## Q1 · "Quality of light" is multidimensional, not good/bad — **STRONG**

- **Light has four separable characteristics** — intensity, quality (hard/soft), color temperature, direction — so "quality of light" is not a single axis. *"Four Key Characteristics of Light: 1. Quantity/Intensity … 2. Quality (Hard vs. Soft) … 3. Color/Temperature … 4. Direction"* — Light Stalking. Corroborated by Shutterbug (Quantity/Quality/Color/Direction, "direction… one of the most important").
- **Hard vs. soft is a physical property (shadow transition / source size), not a ranking.** *"When we discuss the quality of light, we are talking about how 'hard' or 'soft' it is — how hard or soft the shadow looks"* — Photography Icon. *"The determining factor: angular size of the source as seen from the subject"* — Photography Life.
- **Neither is inherently better; it's an artistic choice.** *"Like any tool… it's not about whether hard light is 'good' or 'bad'… Neither is inherently better than the other"* — The Honcho. *"The quality of light one prefers to use comes down to artistic choice"* — Nicola Levine.
- **There is no universally 'best' light.** *"There may not always be a 'best' quality of light that is applicable to all situations or cherished by all photographers"* — Photography Life.

→ **Confirms the core reframe.** The inherited "golden = best" scoring encodes a preference as if it were a physical fact.

---

## Q2 · Light-dependence varies sharply by genre — **STRONG**

- **Landscape is highly light-timing-dependent.** *"The quality of light that lends itself well for landscape photography is low angle, unidirectional light from the side or directly behind"* — and even/overcast/midday light is the author's **least preferred** for grand landscapes because it flattens shadow, texture, depth (Photography Life). Wikipedia: *"the warm color of the low sun is often considered desirable to enhance the colours of the scene."*
- **Street is explicitly the opposite — light-flexible.** *"Street photography isn't like landscape photography, where you generally want to shoot in the early morning or late afternoon… street is infinitely flexible"* — Digital Photography School. *"You can shoot street photos in literally any light — from blue hour to harsh sunny midday to several hours after dark."*
- **Working proof:** street photographer Roman Fox — *"around 95% of my photos are not during golden hour"* (DPS).
- **Genre preferences can be opposite for the same light.** Front/diffused shadow-hiding light that landscape shooters *avoid* is exactly what portrait shooters *use* (butterfly lighting) to conceal skin texture (Photography Life). Overcast, "flat" for grand landscape, is **favorable** for close-up flora/detail (Photography Life).

→ **Confirms the sensitivity spectrum:** landscape high, street low, others between — and that "flat" is genre-relative, not universally worst.

---

## Q3 · Light-condition → creative-use mapping — **STRONG**

| Condition | Character | Creatively suited to | Source |
|---|---|---|---|
| **Golden hour** | warm, soft, low-contrast, less-dark shadows | landscape, portraits, warm scenes | Wikipedia; PhotoPills ("magic hours = best hours" — the convention) |
| **Blue hour** | cool, no sharp shadows, balances artificial light | **cityscape/architecture**, long exposure, neon; *poor for nature foregrounds (underexposed)* | PhotoPills; Light Stalking |
| **Harsh / midday (hard)** | high contrast, sharp shadows, reveals texture | **graphic/high-contrast street**, hard-shadow B&W, B&W architecture, silhouettes, vibrant color | Streethunters; Snaps by Fox; Shutterbug |
| **Overcast / soft** | shadowless, even, forgiving | **even-light street portraits**, color, detail/texture, close-up flora | Photography Life; DPS |

- *"High-contrast lighting is great for street photography — it simplifies scenes, produces interesting shadows, adds mood"* — Streethunters. *"To create effective high-contrast street photos you're going to need… strong, bright sunlight."*
- *"When the sky is gray… diffused light that eliminates harsh shadows… beautifully suited to capturing detail and texture"* — DPS (overcast → street detail).
- Blue hour for cityscape: *"the contrast created between the blue hue of the sky and the orange hue of the lights is very photogenic"*; *"car lights become red and yellow streaks"* — PhotoPills.

---

## Q4 · The street tradition embraces all light — **STRONG** (with a real nuance)

- **Fan Ho** built his signature on hard-light chiaroscuro: *"deep, inky shadows balanced against bright highlights"*, *"narrow alleyways, using the interplay of sunlight and darkness to create dramatic contrasts"* (ProEDU).
- **Ray Metzker** — *"mastery of light, shadow and line"* in high-contrast B&W street; built on the *"Decisive Moment,"* not optimal-light windows (PetaPixel).
- **Saul Leiter** — found material in ordinary weather: *"A window covered with raindrops interests me more than a photograph of a famous person"*; used overexposure/soft focus and shot through windows (About Photography).
- **Alex Webb** — *"frames his subjects in dark shadows, using available light and silhouettes"* (Urth).

**The nuance — street is low-sensitivity, NOT zero:**
- **Alex Webb** (color): *"I work in color, where light is really important in a very special way, so I work certain hours much more than others. I am always out at the latter half of the afternoon and in the evening"* (Eric Kim).
- **Fan Ho** *"patiently waited for the perfect lighting conditions… returned to locations multiple times to capture the ideal interplay of light and shadow"* (ProEDU).

→ So **color / light-forward street does time light.** The model must let light *nudge* street, never *gate* it.

---

## Q5 · Existing scoring frameworks — **STRONG**

- **GoldCast** = exactly the model we're leaving: *"a single score from 0 to 100"* from six sky variables, **no genre input**, labeled *"Epic Light (75–100) … Flat Light (0–34, uninspiring)."* The single-axis, landscape-inherited ladder made explicit.
- **Golden Hour One** = the precedent for what we want: it **splits** into a **Sky Index** (dramatic sky), a **Light Index** *"for portraits, landscape and architecture,"* and a **Moon Index** — i.e. subject-differentiated scoring, and its light index is **scoped to landscape/portrait/architecture, not street.**
- **Camera-club judging rubric** (HSV): lighting is **one component within a 10-pt "Technical Excellence" group** (of three equally-weighted groups), judged *functionally* ("how dimension and shape are defined… should enhance the image"), natural or artificial equally valid — **not** a golden-hour timing ladder.

→ Genre-differentiated light scoring exists in the wild (Golden Hour One), and formal judging treats light as a modest, functional factor — both support down-weighting a single golden-hour axis.

---

## Confidence summary

| Finding | Confidence |
|---|---|
| Light is multidimensional, not good/bad | **Strong** — multiple independent sources |
| Landscape = high light-dependence | **Strong** |
| Street = low light-dependence (flexible) | **Strong** |
| Street is low-not-zero (color/light-forward times light) | **Strong** (Webb, Fan Ho) |
| Condition→creative-use mappings | **Strong** |
| Exact sensitivity **numbers** (0.15 street … 0.9 landscape) | **Convention / tuning — no source; my derivation** |
| Portrait-vs-architecture relative ordering | **Reasoned, moderate** |

---

## Sources (22)

**Foundational — quality of light:** Photography Life (`/the-quality-of-light`) · Photography Icon (`/quality-of-light`) · Shutterbug (`characteristics-light-quantity-quality-color-direction`) · Light Stalking (`4-basic-characteristics-light`) · Nicola Levine (`quality-of-light-hard-vs-soft`) · The Honcho (`hard-light-vs-soft-light`).
**Genre light-dependence:** Wikipedia (`Golden_hour_(photography)`) · Urth Magazine (`alex-webb-street-photography`) · ProEDU (`fan-ho-street-photography…`) · Eric Kim (`10-things-alex-webb…`).
**Condition → creative use:** Streethunters (`high-contrast-street-photography`) · Digital Photography School (`bad-light-street-photography`) · Snaps by Fox (`harsh-midday-light`) · PhotoPills (`blue-hour-photography-guide`) · Light Stalking (`blue-hour-cityscapes`). *(DIY Photography `overcast-vs-sunny-portrait` fetched but yielded no usable claims — flagged unreliable.)*
**Street tradition:** Fallen Leaves (`alex-webb-the-suffering-of-light`) · PetaPixel (`ray-metzker`) · About Photography (`saul-leiter`).
**Scoring frameworks:** GoldCast (`lightcastsuite.com/goldcast`) · Golden Hour One (App Store `id1080118736`) · HSV Camera Club (`judging-and-scoring-criteria`).
