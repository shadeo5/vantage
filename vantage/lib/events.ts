// Events / Opportunities (B4) — the app's TIMELINESS layer.
//
// Evergreen spots answer "where's good to shoot?"; events answer "what's happening
// worth shooting, and WHEN?" — the scarcity ("here now, gone next week") is exactly
// what makes a great nudge. This module is the app-side of the events architecture
// (ADR: docs/engineering/EVENTS_ARCHITECTURE.html): the curated catalog, the
// live/upcoming time-gates, and the Spot adapter that lets a live event ride the
// existing hero/brief/detail pipeline.
//
// SCOPE (first slice): the catalog is BUNDLED (assets/events/atlanta.json — the
// hand-curated, photo-gated marquee events from content-pipeline). Moving it to a
// Postgres `events` table + push parity is a later slice, mirroring how spots went
// (this is the same bundled-fallback shape as the 5-core spots). The photo-lens gate
// is already applied by curation — every event in the catalog is shootable by design.
import type { Genre } from "./gear";
import type { Spot, WindowType } from "./spots";
import ATLANTA_EVENTS_RAW from "../assets/events/atlanta.json";

// An Opportunity = a time-bound, photographable event. Shape matches the curated
// catalog (content-pipeline/content/atlanta-events.json).
export type Opportunity = {
  id: string;
  kind: "event";
  name: string;
  eventType: string;            // display label, e.g. "Costume parade / spectacle"
  genres: Genre[];              // what you'd shoot here (primary first)
  neighborhood: string;
  lat: number;
  lon: number;
  venueSpotId: string | null;   // if the event lives at a known spot, its id (for inherit + eclipse)
  recurrence: string;           // human-readable ("Saturday of Labor Day weekend")
  window: { start: string; end: string }; // ISO-ish; date-only OR "YYYY-MM-DDTHH:mm"
  windowConfidence: "high" | "needs-date-verify";
  admission: string;
  ticketing: string;
  magnitude: "high" | "medium" | "low"; // draw — amplifies, never qualifies (photo value is the gate)
  windowType: WindowType;       // the light during the event, for phase-scoring
  tagline: string;
  reason: string;
  why: string;
  look: string[];
  kitAngles: Record<string, string>; // wide/normal/tele/macro angles
  getting: string;
  source: string;
};

export const ATLANTA_EVENTS = ATLANTA_EVENTS_RAW as Opportunity[];

// --- time parsing ---------------------------------------------------------------
// The catalog mixes datetime ("2026-09-05T10:00") and date-only ("2027-04-09")
// windows. JS parses a bare date string as UTC midnight but a bare datetime as
// LOCAL — so we parse every field explicitly in LOCAL time for consistency (the app
// pins to one city; device tz ≈ city tz, same simplification as the light layer).
function parseLocal(s: string, endOfDay = false): Date {
  const [datePart, timePart] = s.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (timePart) {
    const [hh, mm] = timePart.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm);
  }
  // A date-only END means the event runs THROUGH that whole day.
  return endOfDay ? new Date(y, m - 1, d, 23, 59, 59) : new Date(y, m - 1, d, 0, 0, 0);
}

export function eventWindow(ev: Opportunity): { start: Date; end: Date } {
  return { start: parseLocal(ev.window.start), end: parseLocal(ev.window.end, true) };
}

function localMidnight(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

// Whole calendar days from now until the event's start (0 = starts today, 1 = tomorrow).
export function daysUntil(now: Date, ev: Opportunity): number {
  return Math.round((localMidnight(eventWindow(ev).start) - localMidnight(now)) / 86_400_000);
}

// --- time-gates -----------------------------------------------------------------
// LIVE: now is inside the event window → it can take the hero/push (the takeover).
export function isLive(ev: Opportunity, now: Date): boolean {
  const { start, end } = eventWindow(ev);
  return now >= start && now <= end;
}

export function liveEvents(all: Opportunity[], now: Date): Opportunity[] {
  return all.filter((e) => isLive(e, now));
}

// UPCOMING: not started yet, within the planning horizon → the "Coming up" shelf.
// (Live events are excluded — they belong to the takeover, not "coming up".)
export type UpcomingOpts = { horizonDays?: number; limit?: number };
export function upcomingEvents(all: Opportunity[], now: Date, opts?: UpcomingOpts): Opportunity[] {
  const horizon = opts?.horizonDays ?? 60;
  const list = all
    .filter((e) => { const d = daysUntil(now, e); return d >= 1 && d <= horizon; })
    .sort((a, b) => eventWindow(a).start.getTime() - eventWindow(b).start.getTime());
  return opts?.limit ? list.slice(0, opts.limit) : list;
}

// --- labels ---------------------------------------------------------------------
// A warm, forward "when" for the Coming-up shelf — never a passed time (VOICE).
export function whenLabel(now: Date, ev: Opportunity): string {
  const d = daysUntil(now, ev);
  if (d <= 0) return "Happening now";
  if (d === 1) return "Tomorrow";
  if (d < 7) return `In ${d} days`;
  if (d < 11) return "Next week";
  if (d < 56) return `In ${Math.round(d / 7)} weeks`;
  const months = Math.round(d / 30);
  return `In ${months} month${months > 1 ? "s" : ""}`;
}

// A concrete date ("Sat, Sep 5") for the card's second line.
export function dateLabel(ev: Opportunity): string {
  return eventWindow(ev).start.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// --- the Spot adapter -----------------------------------------------------------
// A live event masquerades as a Spot so it rides the existing hero/brief/detail
// pipeline unchanged. Per the ADR's inherit/override seam: the SUBJECT is the event
// (name, why, look, window), but PLACE-INTRINSIC facts inherit from the venue spot
// when there is one — here, the imagery (events have no art of their own). Standalone
// events (venueSpotId null) fall back to the default illustration via spotImageSource.
export function eventToSpot(ev: Opportunity, pack: Spot[]): Spot {
  const venue = ev.venueSpotId ? pack.find((s) => s.id === ev.venueSpotId) : undefined;
  return {
    id: ev.id,
    name: ev.name,
    type: ev.eventType,
    genre: ev.genres[0] ?? "Street",
    genres: ev.genres,
    windowType: ev.windowType,
    reason: ev.reason,
    tagline: ev.tagline,
    why: ev.why,
    look: ev.look,
    img: venue?.img ?? "",       // inherit the venue's bundled art, else default fallback
    imageUrl: venue?.imageUrl,   // or its Storage URL
    getting: ev.getting,
    lat: ev.lat,
    lon: ev.lon,
  };
}
