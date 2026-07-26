// Event pack — the app's live events list, read from Postgres (the events DB slice).
//
// The read side for events, mirroring lib/cityPack.ts (spots). We fetch the published
// events for one city and map each DB row onto the app's Opportunity shape. On ANY
// failure — offline, backend unconfigured, RLS, or an empty result — we fall back to
// the bundled ATLANTA_EVENTS so the app always has events (for Atlanta) and never
// blanks the "Coming up" shelf. Kept SEPARATE from lib/events.ts (types + pure
// time-gates + the bundle) so that module stays free of the Supabase client — exactly
// how spots.ts (types + fallback) pairs with cityPack.ts (the DB read).
//
// Moving events into the DB means you can add/fix an event in the Supabase dashboard
// and it's live in the app on the next load — no app release.
import { supabase } from "./supabase";
import { ATLANTA_EVENTS, type Opportunity } from "./events";
import { type Genre } from "./gear";
import { type WindowType } from "./spots";

// The city whose events ship bundled in the app (the fallback catalog).
const BUNDLED_EVENTS_CITY = "atlanta";

// DB row shape (snake_case columns). Dates are text (date-only or datetime), read in
// local time by lib/events.ts — see the events table comment in schema.sql.
type EventRow = {
  id: string;
  name: string;
  event_type: string | null;
  genres: string[] | null;
  neighborhood: string | null;
  lat: number | null;
  lon: number | null;
  venue_spot_id: string | null;
  recurrence: string | null;
  window_start: string | null;
  window_end: string | null;
  window_confidence: string | null;
  admission: string | null;
  ticketing: string | null;
  magnitude: string | null;
  window_type: string | null;
  tagline: string | null;
  reason: string | null;
  why: string | null;
  look: string[] | null;
  kit_angles: Record<string, string> | null;
  getting: string | null;
  source: string | null;
};

// The columns fetched, in DB (snake_case) form. Exported so a test can assert every one
// exists in the events table — the mismatch that silently drops us to the bundled fallback.
export const EVENT_COLUMNS =
  "id,name,event_type,genres,neighborhood,lat,lon,venue_spot_id,recurrence,window_start,window_end," +
  "window_confidence,admission,ticketing,magnitude,window_type,tagline,reason,why,look,kit_angles,getting,source";

export function rowToOpportunity(r: EventRow): Opportunity {
  return {
    id: r.id,
    kind: "event",
    name: r.name,
    eventType: r.event_type ?? "",
    genres: (r.genres ?? []) as Genre[],
    neighborhood: r.neighborhood ?? "",
    lat: r.lat ?? 0,
    lon: r.lon ?? 0,
    venueSpotId: r.venue_spot_id ?? null,
    recurrence: r.recurrence ?? "",
    window: { start: r.window_start ?? "", end: r.window_end ?? "" },
    windowConfidence: r.window_confidence === "needs-date-verify" ? "needs-date-verify" : "high",
    admission: r.admission ?? "",
    ticketing: r.ticketing ?? "",
    magnitude: r.magnitude === "high" || r.magnitude === "low" ? r.magnitude : "medium",
    windowType: (r.window_type ?? "flat") as WindowType,
    tagline: r.tagline ?? "",
    reason: r.reason ?? "",
    why: r.why ?? "",
    look: r.look ?? [],
    kitAngles: r.kit_angles ?? {},
    getting: r.getting ?? "",
    source: r.source ?? "",
  };
}

// Load the published events for a city, mapped to the app Opportunity shape. Returns
// the bundled fallback (never throws) if the fetch fails or comes back empty — the
// bundle is Atlanta's, so other cities fall back to [] rather than the wrong city's events.
export async function fetchEvents(cityId: string = BUNDLED_EVENTS_CITY): Promise<Opportunity[]> {
  const fallback = cityId === BUNDLED_EVENTS_CITY ? ATLANTA_EVENTS : [];
  try {
    const { data, error } = await supabase
      .from("events")
      .select(EVENT_COLUMNS)
      .eq("city_id", cityId)
      .eq("published", true);
    if (error || !data || data.length === 0) {
      if (error) console.warn("[eventPack] load failed, using bundled fallback:", error.message);
      return fallback;
    }
    // via unknown: the column list is a named const (not a string literal), so supabase-js
    // can't infer the row type from it — we assert our EventRow shape explicitly.
    return (data as unknown as EventRow[]).map(rowToOpportunity);
  } catch (e) {
    console.warn("[eventPack] load threw, using bundled fallback:", e);
    return fallback;
  }
}
