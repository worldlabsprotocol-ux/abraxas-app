// FILE: lib/icalSync.ts
// SEPARATE FEATURE — real Cielo Sunrise availability, not a live Airbnb
// widget (Airbnb doesn't offer one for third-party embedding). Airbnb
// DOES let hosts export a private iCal feed for any listing (Listing ->
// Availability -> "Export Calendar"). This fetches that feed and parses
// the actual blocked/available dates, so Abraxas shows real availability
// instead of a guess.
//
// SETUP REQUIRED FROM YOU:
//   1. Go to your Cielo Sunrise listing's Airbnb host dashboard
//   2. Availability -> Calendar -> Export Calendar
//   3. Copy the private iCal URL (looks like
//      https://www.airbnb.com/calendar/ical/XXXXX.ics?s=XXXXX)
//   4. Set AIRBNB_ICAL_URL in your environment variables
//
// This is read-only: it shows you Airbnb's existing availability, it
// does not create or modify bookings on Airbnb. A booking made through
// Abraxas still needs your team to manually confirm it on the Airbnb
// side, exactly like the existing BuyNowModal flow already says.

export interface BlockedDate {
  start: string; // ISO date
  end: string;    // ISO date
}

// Minimal iCal VEVENT parser, just enough to extract DTSTART/DTEND pairs.
// Not a full RFC 5545 parser, Airbnb's export format is simple and
// consistent enough that this covers it.
function parseICalEvents(icalText: string): BlockedDate[] {
  const events: BlockedDate[] = [];
  const blocks = icalText.split("BEGIN:VEVENT").slice(1);

  for (const block of blocks) {
    const startMatch = block.match(/DTSTART(?:;[^:]*)?:(\d{8})/);
    const endMatch = block.match(/DTEND(?:;[^:]*)?:(\d{8})/);
    if (!startMatch || !endMatch) continue;

    const toIso = (raw: string) =>
      `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;

    events.push({ start: toIso(startMatch[1]), end: toIso(endMatch[1]) });
  }
  return events;
}

let cache: { data: BlockedDate[]; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes — Airbnb calendars don't need to be polled constantly

export async function getCieloBlockedDates(): Promise<BlockedDate[]> {
  const url = process.env.AIRBNB_ICAL_URL;
  if (!url) {
    throw new Error("AIRBNB_ICAL_URL not set — export the calendar from your Airbnb host dashboard first");
  }

  if (cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.data;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch Airbnb calendar: ${res.status}`);
  }
  const text = await res.text();
  const events = parseICalEvents(text);

  cache = { data: events, fetchedAt: Date.now() };
  return events;
}

export function isDateBlocked(dateIso: string, blocked: BlockedDate[]): boolean {
  return blocked.some(b => dateIso >= b.start && dateIso < b.end);
}
