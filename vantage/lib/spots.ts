// Curated Atlanta spots — content ported from the Claude Design handoff (v2).
// The rich copy (why / what-to-look-for / getting-there) is hand-authored in the
// design; sourcing this at scale is the upcoming "content strategy" workstream.
// Light timing stays LIVE via lib/light.ts + each spot's real coordinates.

export type WindowType = "golden" | "blue" | "flat";

export type Spot = {
  id: string;
  name: string;
  type: string;
  windowType: WindowType;
  distance: string;
  reason: string;      // one-line for list rows
  tagline: string;     // under the detail title
  why: string;
  look: string[];      // "what to look for here"
  img: string;         // hero/thumb Unsplash id
  gallery: string[];   // "what people shoot here" Unsplash ids
  getting: string;
  lat: number;
  lon: number;
};

// Unsplash placeholder IDs (from the design). Replace with licensed/real imagery later.
export function img(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=900&q=80&auto=format&fit=crop`;
}

export const HERO_ID = "sweetauburn";

export const SPOTS: Spot[] = [
  {
    id: "sweetauburn", name: "Sweet Auburn", type: "Street", windowType: "golden",
    distance: "6 min", reason: "Historic district, alive at dusk",
    tagline: "Historic district · street & portraits",
    why: "The heart of Atlanta's historic Black business district hums on a warm evening — market stalls, front-porch talk, and low sun raking down Auburn Avenue. It's a street room where everyone's a little more open.",
    look: [
      "Murals along Auburn Ave — backlit and glowing right at dusk.",
      "The Municipal Market crowd — candid portraits as people spill out.",
      "The old marquee signs catch the last warm light near 8:20.",
    ],
    img: "1449824913935-59a10b8d2000", gallery: ["1506905925346-21bda4d32df4", "1470770841072-f978cf4d019e", "1444723121867-7a241cacace9"],
    getting: "6 min drive · evening street parking on Edgewood · MARTA King Memorial, a short walk.",
    lat: 33.7550, lon: -84.3720,
  },
  {
    id: "krog", name: "Krog Street Tunnel", type: "Street art", windowType: "blue",
    distance: "9 min", reason: "Neon and spray paint after dark",
    tagline: "Ever-changing murals · night color",
    why: "A quarter-mile of layered graffiti that repaints itself weekly. As blue hour settles, the tunnel lights turn the walls electric and the color balance falls right into place.",
    look: [
      "Fresh paste-ups near the east mouth change every few days.",
      "Long exposures blur passing cyclists into ribbons of light.",
      "Puddles after rain double the color underfoot.",
    ],
    img: "1533106418989-88406c7cc8ca", gallery: ["1533106418989-88406c7cc8ca", "1444723121867-7a241cacace9", "1470770841072-f978cf4d019e"],
    getting: "9 min drive · park at Krog Street Market · tunnel is a 2-min walk north.",
    lat: 33.7540, lon: -84.3620,
  },
  {
    id: "jackson", name: "Jackson Street Bridge", type: "Cityscape", windowType: "golden",
    distance: "12 min", reason: "The skyline shot, glowing",
    tagline: "The classic downtown view",
    why: "Atlanta's postcard: the full downtown skyline stacked behind the interstate, warm light on glass and taillights streaking below. Simple, and it never misses.",
    look: [
      "Center the skyline as the sun drops behind the towers.",
      "Traffic trails on the freeway build after 8:15.",
      "Step to the north rail for a cleaner foreground.",
    ],
    img: "1477959858617-67f85cf4f1df", gallery: ["1477959858617-67f85cf4f1df", "1506905925346-21bda4d32df4", "1444723121867-7a241cacace9"],
    getting: "12 min drive · limited street parking — arrive early · sidewalk shooting only, mind traffic.",
    lat: 33.7545, lon: -84.3710,
  },
  {
    id: "piedmont", name: "Piedmont Park", type: "Nature", windowType: "golden",
    distance: "8 min", reason: "Open sky over Midtown",
    tagline: "Meadow foreground · Midtown backdrop",
    why: "Oak Hill's open lawn gives you an unobstructed western sky with the Midtown towers as a backdrop — golden grass in front, glowing glass behind.",
    look: [
      "Backlit grass on Oak Hill turns to gold near sunset.",
      "Silhouettes of dog-walkers read clean against the sky.",
      "The lake mirrors the skyline once the wind drops.",
    ],
    img: "1441974231531-c6227db76b6e", gallery: ["1441974231531-c6227db76b6e", "1470770841072-f978cf4d019e", "1506905925346-21bda4d32df4"],
    getting: "8 min drive · park at 12th & Piedmont · Oak Hill is a 6-min walk in.",
    lat: 33.7850, lon: -84.3730,
  },
  {
    id: "ponce", name: "Ponce City Market Roof", type: "Cityscape", windowType: "blue",
    distance: "11 min", reason: "Rooftops and bridges light up",
    tagline: "Elevated blue-hour panorama",
    why: "From the roof the whole east side spreads out — the BeltLine, distant downtown, and a sky that deepens to cobalt as the city switches its lights on.",
    look: [
      "Shoot west toward downtown as the sky goes cobalt.",
      "The BeltLine ribbon glows amber below.",
      "Steady the camera on the rail for the long blue-hour frames.",
    ],
    img: "1480714378408-67cf0d13bc1b", gallery: ["1480714378408-67cf0d13bc1b", "1444723121867-7a241cacace9", "1506905925346-21bda4d32df4"],
    getting: "11 min drive · rooftop entry via the elevator · check posted rooftop hours.",
    lat: 33.7720, lon: -84.3650,
  },
];

export const getSpot = (id: string): Spot => SPOTS.find((s) => s.id === id) ?? SPOTS[0];

export function windowMeta(t: WindowType): { color: string; icon: string; label: string } {
  if (t === "golden") return { color: "#E9B872", icon: "☀", label: "Golden" };
  if (t === "blue") return { color: "#7FA0CF", icon: "☽", label: "Blue hour" };
  return { color: "#9DB89A", icon: "☁", label: "Flat / day" };
}
