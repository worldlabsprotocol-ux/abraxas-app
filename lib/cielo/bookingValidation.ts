// FILE: lib/cielo/bookingValidation.ts
import type { BlockedDate } from "@/lib/cielo/types";

export type { BlockedDate };

export function eachNight(checkIn: string, checkOut: string): string[] {
  const nights: string[] = [];
  const start = new Date(`${checkIn}T12:00:00`);
  const end = new Date(`${checkOut}T12:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return nights;
  const cur = new Date(start);
  while (cur < end) {
    nights.push(cur.toISOString().slice(0, 10));
    cur.setDate(cur.getDate() + 1);
  }
  return nights;
}

export function isDateBlocked(dateIso: string, blocked: BlockedDate[]): boolean {
  return blocked.some(b => dateIso >= b.start && dateIso < b.end);
}

export function blockedNightsInRange(
  checkIn: string,
  checkOut: string,
  blocked: BlockedDate[],
): string[] {
  return eachNight(checkIn, checkOut).filter(d => isDateBlocked(d, blocked));
}

export function rangesOverlap(
  checkIn: string,
  checkOut: string,
  blocked: BlockedDate[],
): boolean {
  return blockedNightsInRange(checkIn, checkOut, blocked).length > 0;
}

export const CIELO_RATES = { weeknight: 299, weekend: 349, week: 1799 } as const;

export function estimateUsdc(checkIn: string, checkOut: string): number {
  const nights = eachNight(checkIn, checkOut).length;
  if (nights === 0) return 0;
  if (nights >= 7) return Math.round(nights / 7) * CIELO_RATES.week;
  return nights * CIELO_RATES.weeknight;
}
