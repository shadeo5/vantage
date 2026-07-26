// Spot types + the BUNDLED FALLBACK pack.
//
// As of Serve slice 3 the live content comes from the DB (see lib/cityPack.ts):
// the app reads published Atlanta spots from Postgres, with per-spot illustrations
// served from Supabase Storage. This file no longer holds the app's runtime spot
// list — it holds the type, the light-window helpers, and the five hand-authored
// core Atlanta spots kept as a BUNDLED FALLBACK (used before the DB responds, or if
// it's offline/unconfigured). Those five also ship their illustrations in the app
// bundle (their DB rows carry a null image_url), so they always have art.
// Light timing stays LIVE via lib/light.ts + each spot's real coordinates.

import { type ImageSourcePropType } from "react-native";
import { type Genre } from "./gear";

export type WindowType = "golden" | "blue" | "flat";

export type Spot = {
  id: string;
  name: string;
  type: string;       // display label, e.g. "Cityscape", "Street art"
  genre: Genre;       // the matching genre (primary), for gear-fit checks
  genres?: Genre[];   // multi-genre, primary first (from the DB `genres text[]`)
  windowType: WindowType;
  reason: string;      // one-line for list rows
  tagline: string;     // under the detail title
  why: string;
  look: string[];      // "what to look for here"
  img: string;         // key into SPOT_IMAGES (bundled core only; matches the spot id)
  imageUrl?: string;   // remote Storage URL (DB spots); when set, wins over the bundle
  getting: string;
  lat: number;
  lon: number;
};

// Local illustrated placeholder imagery — interim AI-generated illustrations
// (stylized art, NOT documentary photos of the real place). See
// docs/design/ILLUSTRATION_STYLE.md. Keys match spot ids; require() paths must be
// static string literals for Metro to bundle them. Only the five core spots are
// bundled — every other spot's illustration is served from Storage via imageUrl.
const SPOT_IMAGES: Record<string, number> = {
  sweetauburn: require("../assets/spots/sweetauburn.png"),
  krog: require("../assets/spots/krog.png"),
  jackson: require("../assets/spots/jackson.png"),
  piedmont: require("../assets/spots/piedmont.png"),
  ponce: require("../assets/spots/ponce.png"),
};

// Resolve the image source for a spot: a remote Storage URL when the spot carries
// one, otherwise its bundled illustration (falls back to the hero image for a spot
// with neither — e.g. a brand-new DB spot whose image hasn't been generated yet).
export function spotImageSource(spot: Spot): ImageSourcePropType {
  if (spot.imageUrl) return { uri: spot.imageUrl };
  return SPOT_IMAGES[spot.img] ?? SPOT_IMAGES.sweetauburn;
}

// Find a spot by id within a loaded pack (falls back to the first spot).
export function findSpot(spots: Spot[], id: string): Spot {
  return spots.find((s) => s.id === id) ?? spots[0];
}

export const HERO_ID = "sweetauburn";

// The five hand-authored core Atlanta spots — the bundled fallback pack. The live
// app list is loaded from the DB (lib/cityPack.ts); these are what it shows before
// that resolves, or when the backend is unreachable.
export const FALLBACK_SPOTS: Spot[] = [
  {
    id: "sweetauburn", name: "Sweet Auburn", type: "Street", genre: "Street", windowType: "golden",
    reason: "Historic district, alive at dusk",
    tagline: "Historic district · street & portraits",
    why: "The heart of Atlanta's historic Black business district hums on a warm evening — market stalls, front-porch talk, and low sun raking down Auburn Avenue. It's a street room where everyone's a little more open.",
    look: [
      "Murals along Auburn Ave — backlit and glowing right at dusk.",
      "The Municipal Market crowd — candid portraits as people spill out.",
      "The old marquee signs catch the last warm light near 8:20.",
    ],
    img: "sweetauburn",
    getting: "Evening street parking on Edgewood · MARTA King Memorial, a short walk.",
    lat: 33.7550, lon: -84.3720,
  },
  {
    id: "krog", name: "Krog Street Tunnel", type: "Street art", genre: "Street", windowType: "blue",
    reason: "Neon and spray paint after dark",
    tagline: "Ever-changing murals · night color",
    why: "A quarter-mile of layered graffiti that repaints itself weekly. As blue hour settles, the tunnel lights turn the walls electric and the color balance falls right into place.",
    look: [
      "Fresh paste-ups near the east mouth change every few days.",
      "Long exposures blur passing cyclists into ribbons of light.",
      "Puddles after rain double the color underfoot.",
    ],
    img: "krog",
    getting: "Park at Krog Street Market · tunnel is a short walk north.",
    lat: 33.7540, lon: -84.3620,
  },
  {
    id: "jackson", name: "Jackson Street Bridge", type: "Cityscape", genre: "Architecture", windowType: "golden",
    reason: "The skyline shot, glowing",
    tagline: "The classic downtown view",
    why: "Atlanta's postcard: the full downtown skyline stacked behind the interstate, warm light on glass and taillights streaking below. Simple, and it never misses.",
    look: [
      "Center the skyline as the sun drops behind the towers.",
      "Traffic trails on the freeway build after 8:15.",
      "Step to the north rail for a cleaner foreground.",
    ],
    img: "jackson",
    getting: "Limited street parking — arrive early · sidewalk shooting only, mind traffic.",
    lat: 33.7545, lon: -84.3710,
  },
  {
    id: "piedmont", name: "Piedmont Park", type: "Nature", genre: "Nature", windowType: "golden",
    reason: "Open sky over Midtown",
    tagline: "Meadow foreground · Midtown backdrop",
    why: "Oak Hill's open lawn gives you an unobstructed western sky with the Midtown towers as a backdrop — golden grass in front, glowing glass behind.",
    look: [
      "Backlit grass on Oak Hill turns to gold near sunset.",
      "Silhouettes of dog-walkers read clean against the sky.",
      "The lake mirrors the skyline once the wind drops.",
    ],
    img: "piedmont",
    getting: "Park at 12th & Piedmont · Oak Hill is a short walk in.",
    lat: 33.7850, lon: -84.3730,
  },
  {
    id: "ponce", name: "Ponce City Market Roof", type: "Cityscape", genre: "Architecture", windowType: "blue",
    reason: "Rooftops and bridges light up",
    tagline: "Elevated blue-hour panorama",
    why: "From the roof the whole east side spreads out — the BeltLine, distant downtown, and a sky that deepens to cobalt as the city switches its lights on.",
    look: [
      "Shoot west toward downtown as the sky goes cobalt.",
      "The BeltLine ribbon glows amber below.",
      "Steady the camera on the rail for the long blue-hour frames.",
    ],
    img: "ponce",
    getting: "Rooftop entry via the elevator · check posted rooftop hours.",
    lat: 33.7720, lon: -84.3650,
  },
];

export function windowMeta(t: WindowType): { color: string; icon: string; label: string } {
  if (t === "golden") return { color: "#E9B872", icon: "☀", label: "Golden" };
  if (t === "blue") return { color: "#7FA0CF", icon: "☽", label: "Blue hour" };
  return { color: "#9DB89A", icon: "☁", label: "Flat / day" };
}
