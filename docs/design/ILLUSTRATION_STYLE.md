# Vantage — Illustration Style (interim placeholder imagery)

> **Status: PLACEHOLDER.** These AI-generated illustrations are a deliberate stand-in to unblock concept-testing — **not** the final imagery. They are *stylized art*, never fake documentary photos of a real place (that would break the voice guide's honesty rule). When we move to real place photography (your own shots / Wikimedia), this doc retires. See `VOICE.md` → "Honest."

## Why illustrated (not AI "photos")
AI can't truthfully render a *specific* real spot — it invents the skyline, the tunnel, the view. A realistic-looking fake would mislead someone we're telling to physically go there. An obvious **illustration** reads as *mood art*, not "here's the exact frame," so it sets the vibe honestly, needs no licensing, and scales to any city.

## The look
One cohesive style across all spots so the app feels designed, not stock-scraped:
- **Editorial travel illustration** — textured **screen-print / risograph** feel, painterly with visible grain.
- **Atmospheric & moody**, cinematic light. Evocative, not literal.
- **Limited palette per light window** (below). People only as loose **silhouettes** — no detailed faces.
- **No text, no logos, no watermarks.**

## Palette (matches the app theme)
| Light window | Palette | Anchor hex |
|---|---|---|
| **Golden** | warm amber, burnt orange, deep-brown shadows, cream highlights | `#E9B872` `#F2A93B` shadow `#1c1610` |
| **Blue** | cobalt & deep navy, electric teal / magenta neon accents | `#7FA0CF` navy `#151a26` |
| **Flat** | soft sage green, muted grey-green, diffuse overcast | `#9DB89A` |

## Reusable prompt recipe
**Master style block** (paste at the end of every prompt — keeps all 5 consistent):

> *Editorial travel illustration, textured screen-print / risograph aesthetic, painterly with visible grain, atmospheric and moody, cinematic lighting, evocative not photorealistic, no text, no logos, no watermarks, clean composition.*

**Formula:** `[scene sentence] + [palette line] + [master style block]`

**Midjourney only:** append `--ar 4:5` (portrait, crops cleanly to hero + thumbnail). For a unified look, generate all 5 in one session and reuse the **same style reference** across them (`--sref <code>` from your first favorite result).

## The 5 launch-spot prompts (copy-paste)

Each block below is **fully assembled — copy it as-is** (master style already appended). In Midjourney add ` --ar 4:5` to the end; in ChatGPT you don't need it. Save each result under the spot id noted.

**1. Sweet Auburn** *(golden · street)* → `sweetauburn`
```
A historic urban main street at dusk in warm golden light — brick storefronts, market stalls, string lights, loose silhouettes of people, low sun raking down the avenue. Warm amber and burnt-orange palette with deep-brown shadows and cream highlights. Editorial travel illustration, textured screen-print / risograph aesthetic, painterly with visible grain, atmospheric and moody, cinematic lighting, evocative not photorealistic, no text, no logos, no watermarks, clean composition.
```

**2. Krog Street Tunnel** *(blue · street art)* → `krog`
```
A graffiti-covered pedestrian tunnel glowing at blue hour, layered spray-paint murals turning electric under the tunnel lights, a lone cyclist blurring past. Cobalt and deep-navy palette with electric teal and magenta neon accents. Editorial travel illustration, textured screen-print / risograph aesthetic, painterly with visible grain, atmospheric and moody, cinematic lighting, evocative not photorealistic, no text, no logos, no watermarks, clean composition.
```

**3. Jackson Street Bridge** *(golden · cityscape)* → `jackson`
```
A downtown skyline of glass towers stacked behind a sunken interstate at golden hour, warm light glinting off the buildings, faint red taillight trails on the freeway below. Warm amber and orange palette, deep-shadowed foreground. Editorial travel illustration, textured screen-print / risograph aesthetic, painterly with visible grain, atmospheric and moody, cinematic lighting, evocative not photorealistic, no text, no logos, no watermarks, clean composition.
```

**4. Piedmont Park** *(golden · nature)* → `piedmont`
```
An open park meadow of tall golden grass at sunset, a cluster of distant midtown high-rises on the horizon behind the treeline, soft backlit haze. Golden-green and warm amber palette, glowing sky. Editorial travel illustration, textured screen-print / risograph aesthetic, painterly with visible grain, atmospheric and moody, cinematic lighting, evocative not photorealistic, no text, no logos, no watermarks, clean composition.
```

**5. Ponce City Market Roof** *(blue · cityscape)* → `ponce`
```
An elevated rooftop view over a city at blue hour, a distant downtown skyline with a glowing amber rail-trail cutting through, deep cobalt sky as the city lights switch on. Cobalt and navy palette with warm amber pinpoints of light. Editorial travel illustration, textured screen-print / risograph aesthetic, painterly with visible grain, atmospheric and moody, cinematic lighting, evocative not photorealistic, no text, no logos, no watermarks, clean composition.
```

## Delivery → me
1. Generate one image per spot (4:5 or square is fine).
2. Name each by its spot id: `sweetauburn`, `krog`, `jackson`, `piedmont`, `ponce` (`.jpg`/`.png`).
3. Drop them anywhere (a folder, AirDrop) and tell me where — I'll add them to `vantage/assets/` and swap `lib/spots.ts` from the Unsplash URLs to the local illustrations.

## Open / deferred
- **Gallery ("what people shoot here")** — implies *real* photos from that spot, so illustrations don't fit there. For placeholder testing we'll hide or soften that row rather than fake it; real gallery imagery comes with the real-photo path later.
- **Automation** — generating these via an API is designed in the content ADR (`docs/engineering/CONTENT_PIPELINE.html`, decision **D3**): **OpenAI GPT Image 1.5** (note: `gpt-image-1` retires Oct 23 2026), driven by the master-style block above, seeded with a per-city reference image for cohesion, then downscaled + WebP-compressed (<300 KB — the current ~3 MB PNGs are unoptimized). Hand-generation is fine until the pipeline is built.
