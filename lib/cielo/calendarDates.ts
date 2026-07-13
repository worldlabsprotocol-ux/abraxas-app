// FILE: lib/cielo/calendarDates.ts
// Local-date helpers for Protocol Calendar (avoid UTC off-by-one).

/** YYYY-MM-DD in local timezone, anchored at noon to avoid DST edge cases. */
export function localDateIso(base: Date, dayOffset = 0): string {
  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + dayOffset, 12, 0, 0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function todayLocalIso(): string {
  return localDateIso(new Date());
}

export interface CalendarWeek {
  monthLabel: string;
  weekdayLabels: string[];
  cells: CalendarCell[];
}

export interface CalendarCell {
  dateIso: string | null;
  dayOfMonth: number | null;
  isToday: boolean;
  inRange: boolean;
}

/** Build a 7-column grid aligned to Sunday, covering `totalDays` from today. */
export function buildCalendarGrid(totalDays: number, start = new Date()): CalendarWeek {
  const startIso = localDateIso(start);
  const endIso = localDateIso(start, totalDays - 1);

  const first = parseLocalIso(startIso);
  const padStart = first.getDay();
  const gridStart = new Date(first.getFullYear(), first.getMonth(), first.getDate() - padStart, 12, 0, 0);

  const last = parseLocalIso(endIso);
  const padEnd = 6 - last.getDay();
  const totalCells = padStart + totalDays + padEnd;

  const today = todayLocalIso();
  const monthLabel = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const cells: CalendarCell[] = Array.from({ length: totalCells }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i, 12, 0, 0);
    const iso = localDateIso(d);
    const inRange = iso >= startIso && iso <= endIso;
    return {
      dateIso: inRange ? iso : null,
      dayOfMonth: inRange ? d.getDate() : null,
      isToday: inRange && iso === today,
      inRange,
    };
  });

  return {
    monthLabel,
    weekdayLabels: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    cells,
  };
}

function parseLocalIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0);
}
