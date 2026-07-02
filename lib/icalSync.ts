// FILE: lib/icalSync.ts
// DEPRECATED: Host iCal export. Abraxas uses lib/cielo/calendar.ts (Protocol Calendar) instead.
// Kept for optional legacy enrichment if AIRBNB_ICAL_URL is ever provided.

export interface BlockedDate {
  start: string;
  end: string;
}

function parseICalEvents(icalText: string): BlockedDate[] {
  const events: BlockedDate[] = [];
  const blocks = icalText.split("BEGIN:VEVENT").slice(1);
  for (const block of blocks) {
    const startMatch = block.match(/DTSTART(?:;[^:]*)?:(\d{8})/);
    const endMatch = block.match(/DTEND(?:;[^:]*)?:(\d{8})/);
    if (!startMatch || !endMatch) continue;
    const toIso = (raw: string) => `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
    events.push({ start: toIso(startMatch[1]), end: toIso(endMatch[1]) });
  }
  return events;
}

let cache: { data: BlockedDate[]; fetchedAt: number } | null = null;

/** @deprecated Use getProtocolCalendarBlocks from lib/cielo/calendar.ts */
export async function getCieloBlockedDates(): Promise<BlockedDate[]> {
  const url = process.env.AIRBNB_ICAL_URL;
  if (!url) return [];
  if (cache && Date.now() - cache.fetchedAt < 1000 * 60 * 30) return cache.data;
  const res = await fetch(url);
  if (!res.ok) return [];
  const text = await res.text();
  const events = parseICalEvents(text);
  cache = { data: events, fetchedAt: Date.now() };
  return events;
}

export function isDateBlocked(dateIso: string, blocked: BlockedDate[]): boolean {
  return blocked.some(b => dateIso >= b.start && dateIso < b.end);
}
