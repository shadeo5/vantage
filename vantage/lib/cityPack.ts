// City pack — the app's live spot list, read from Postgres (Serve slice 3).
//
// The content pipeline (curate → vet → draft → image → serve) publishes per-city
// spots into Supabase; this is the read side. We fetch the published spots for one
// city and map each DB row onto the app's Spot shape. On ANY failure — offline, the
// backend unconfigured, RLS, or an empty result — we fall back to the five bundled
// core Atlanta spots so the app always has content and art (see FALLBACK_SPOTS).
//
// The user chooses a city via the Today header switcher (fetchCities lists the
// published ones); the app reads that city's pack. Atlanta is the default until a
// location-based default (device GPS) lands as P2. This is the whole point of the
// both/and content model — a published city needs no app release to appear.
import { supabase } from "./supabase";
import { FALLBACK_SPOTS, type Spot, type WindowType } from "./spots";
import { type Genre } from "./gear";

export const CITY_ID = "atlanta"; // default city until GPS-based selection (P2)

// A selectable city, from the `cities` table (published rows only).
export type City = { id: string; name: string; region: string | null };

type CityRow = { id: string; name: string; region: string | null };

// List the published cities the user can switch between. Returns [] on any failure
// (the switcher then just shows the current city — the pack still loads/falls back).
export async function fetchCities(): Promise<City[]> {
  try {
    const { data, error } = await supabase
      .from("cities")
      .select("id,name,region")
      .eq("published", true)
      .order("name");
    if (error || !data) {
      if (error) console.warn("[cityPack] cities load failed:", error.message);
      return [];
    }
    return (data as CityRow[]).map((c) => ({ id: c.id, name: c.name, region: c.region }));
  } catch (e) {
    console.warn("[cityPack] cities load threw:", e);
    return [];
  }
}

// The columns we select, in DB shape. `genres` is multi-genre (primary first);
// `image_url` is the Storage URL (null for the bundled core → art comes from the app).
type SpotRow = {
  id: string;
  name: string;
  type: string | null;
  genres: string[] | null;
  window_type: string | null;
  reason: string | null;
  tagline: string | null;
  why: string | null;
  look: string[] | null;
  getting: string | null;
  image_url: string | null;
  lat: number | null;
  lon: number | null;
};

function rowToSpot(r: SpotRow): Spot {
  const genres = (r.genres ?? []) as Genre[];
  return {
    id: r.id,
    name: r.name,
    type: r.type ?? "",
    genre: genres[0] ?? "Street",   // gear-fit reads the primary genre
    genres,
    windowType: (r.window_type ?? "flat") as WindowType,
    reason: r.reason ?? "",
    tagline: r.tagline ?? "",
    why: r.why ?? "",
    look: r.look ?? [],
    img: r.id,                       // bundled-image key (the core ids match assets)
    imageUrl: r.image_url ?? undefined,
    getting: r.getting ?? "",
    lat: r.lat ?? 0,
    lon: r.lon ?? 0,
  };
}

// Load the published spots for a city, mapped to the app Spot shape. Returns the
// bundled fallback (never throws) if the fetch fails or comes back empty.
export async function fetchCityPack(cityId: string = CITY_ID): Promise<Spot[]> {
  try {
    const { data, error } = await supabase
      .from("spots")
      .select("id,name,type,genres,window_type,reason,tagline,why,look,getting,image_url,lat,lon")
      .eq("city_id", cityId)
      .eq("published", true);
    if (error || !data || data.length === 0) {
      if (error) console.warn("[cityPack] load failed, using bundled fallback:", error.message);
      return FALLBACK_SPOTS;
    }
    return (data as SpotRow[]).map(rowToSpot);
  } catch (e) {
    console.warn("[cityPack] load threw, using bundled fallback:", e);
    return FALLBACK_SPOTS;
  }
}
