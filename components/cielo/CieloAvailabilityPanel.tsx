"use client";
// FILE: components/cielo/CieloAvailabilityPanel.tsx
// Protocol Calendar — month grid aligned with institutional redesign.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";
import type { BlockedDate } from "@/lib/cielo/types";
import {
  CIELO_FONT,
  CIELO_MONO,
  CIELO_ACCENT,
  CIELO_VERIFY,
  CIELO_PENDING,
  CIELO_BLOCKED,
  cieloPanelStyle,
  cieloEyebrowStyle,
} from "./cieloBookingStyles";
import { Spinner } from "@/components/ui/Spinner";

interface AvailabilityResponse {
  blocked?: BlockedDate[];
  sources?: {
    pending_bookings: number;
    confirmed_bookings: number;
    operator_blocks: number;
  };
}

export type DayStatus = "open" | "pending" | "blocked" | "past";

export interface SelectedRange {
  start: string;
  end: string;
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startPad = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startPad; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function dayStatus(dateIso: string, blocked: BlockedDate[], todayIso: string): DayStatus {
  if (dateIso < todayIso) return "past";
  const hit = blocked.find(b => dateIso >= b.start && dateIso < b.end);
  if (!hit) return "open";
  if (hit.source === "abraxas_pending") return "pending";
  return "blocked";
}

function inSelectedRange(dateIso: string, range?: SelectedRange) {
  if (!range?.start) return false;
  if (!range.end) return dateIso === range.start;
  return dateIso >= range.start && dateIso < range.end;
}

function statusColors(status: DayStatus, selected: boolean) {
  if (selected) {
    return {
      bg: "rgba(232,197,71,0.22)",
      border: "1px solid var(--accent-border, rgba(232,197,71,0.55))",
      color: "var(--text-primary)",
    };
  }
  switch (status) {
    case "open":
      return { bg: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.22)", color: "var(--text-primary)" };
    case "pending":
      return { bg: "rgba(245,158,11,0.18)", border: "1px solid rgba(245,158,11,0.35)", color: "var(--text-primary)" };
    case "blocked":
      return { bg: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "var(--text-muted)" };
    default:
      return { bg: "transparent", border: "1px solid transparent", color: "var(--text-muted)" };
  }
}

export function CieloAvailabilityPanel({
  selectedRange,
  onSelectDate,
}: {
  selectedRange?: SelectedRange;
  onSelectDate?: (dateIso: string) => void;
}) {
  const [blocked, setBlocked] = useState<BlockedDate[] | null>(null);
  const [meta, setMeta] = useState<AvailabilityResponse["sources"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewDate, setViewDate] = useState(() => new Date());

  const todayIso = isoDate(new Date());
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/cielo/availability")
      .then(r => r.json())
      .then((data: AvailabilityResponse & { error?: string }) => {
        if (data.error && !data.blocked) throw new Error(data.error);
        setBlocked(data.blocked ?? []);
        setMeta(data.sources ?? null);
      })
      .catch(() => {
        setBlocked(null);
        setError("Could not load Protocol Calendar.");
      })
      .finally(() => setLoading(false));
  }, []);

  function shiftMonth(delta: number) {
    setViewDate(d => new Date(d.getFullYear(), d.getMonth() + delta, 1));
  }

  if (loading) {
    return (
      <div id="protocol-calendar" className="abx-glass-panel" style={{ ...cieloPanelStyle, padding: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <Spinner size={18} color={CIELO_VERIFY} />
          <span style={{ fontFamily: CIELO_FONT, fontSize: "0.82rem", color: "var(--text-muted)" }}>
            Loading Protocol Calendar…
          </span>
        </div>
      </div>
    );
  }

  if (error || blocked === null) {
    return (
      <div id="protocol-calendar" className="abx-glass-panel" style={{ ...cieloPanelStyle, padding: "1.25rem" }}>
        <p style={{ fontFamily: CIELO_FONT, fontSize: "0.82rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          {error ?? "Calendar unavailable."}{" "}
          <Link href="/cielo/status" style={{ color: CIELO_VERIFY }}>Track a booking</Link>
        </p>
      </div>
    );
  }

  return (
    <div id="protocol-calendar" className="abx-glass-panel" style={{ ...cieloPanelStyle, padding: "1.25rem" }}>
      <div style={{ marginBottom: "1rem" }}>
        <div style={cieloEyebrowStyle}>Abraxas Protocol Calendar</div>
        <h3 style={{
          fontFamily: CIELO_FONT,
          fontSize: "var(--fs-h2, 1.05rem)",
          fontWeight: 700,
          color: "var(--text-primary)",
          margin: "0 0 0.35rem",
        }}>
          Live availability for USDC bookings
        </h3>
        <p style={{
          fontFamily: CIELO_FONT,
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          margin: 0,
        }}>
          Crypto stays run on this calendar — not Airbnb host tools. Cross-check the{" "}
          <Link href={CIELO_AIRBNB_URL} target="_blank" rel="noopener noreferrer" style={{ color: CIELO_VERIFY }}>
            public listing
          </Link>{" "}
          before you travel.
          {onSelectDate && " Tap open dates to build your stay."}
        </p>
      </div>

      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "0.75rem",
        gap: "0.5rem",
      }}>
        <button
          type="button"
          onClick={() => shiftMonth(-1)}
          aria-label="Previous month"
          style={navBtnStyle}
        >
          ←
        </button>
        <div style={{
          fontFamily: CIELO_FONT,
          fontSize: "0.92rem",
          fontWeight: 700,
          color: "var(--text-primary)",
          textAlign: "center",
        }}>
          {monthLabel(year, month)}
        </div>
        <button
          type="button"
          onClick={() => shiftMonth(1)}
          aria-label="Next month"
          style={navBtnStyle}
        >
          →
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "0.35rem",
        marginBottom: "0.35rem",
      }}>
        {WEEKDAYS.map(d => (
          <div key={d} style={{
            fontFamily: CIELO_MONO,
            fontSize: "0.55rem",
            fontWeight: 700,
            color: "var(--text-muted)",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            padding: "0.25rem 0",
          }}>
            {d}
          </div>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "0.35rem",
        marginBottom: "1rem",
      }}>
        {grid.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} />;
          const dateIso = isoDate(cell);
          const status = dayStatus(dateIso, blocked, todayIso);
          const selected = inSelectedRange(dateIso, selectedRange);
          const colors = statusColors(status, selected);
          const isToday = dateIso === todayIso;
          const clickable = onSelectDate && status === "open";

          return (
            <button
              key={dateIso}
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelectDate(dateIso)}
              title={dateIso}
              style={{
                aspectRatio: "1",
                borderRadius: 10,
                background: colors.bg,
                border: colors.border,
                color: colors.color,
                fontFamily: CIELO_FONT,
                fontSize: "0.78rem",
                fontWeight: isToday ? 800 : 600,
                cursor: clickable ? "pointer" : "default",
                opacity: status === "past" ? 0.45 : 1,
                boxShadow: isToday ? "0 0 0 1px var(--accent-border, rgba(232,197,71,0.4))" : undefined,
                padding: 0,
              }}
            >
              {cell.getDate()}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: meta ? "0.65rem" : 0 }}>
        <Legend swatch={`${CIELO_VERIFY}33`} border="rgba(16,185,129,0.35)" label="Open" />
        <Legend swatch={`${CIELO_PENDING}44`} border="rgba(245,158,11,0.4)" label="Pending" />
        <Legend swatch={`${CIELO_BLOCKED}44`} border="rgba(239,68,68,0.35)" label="Booked / blocked" />
        {selectedRange?.start && (
          <Legend swatch="rgba(232,197,71,0.25)" border="rgba(232,197,71,0.5)" label="Your selection" />
        )}
      </div>

      {meta && (
        <div style={{ fontFamily: CIELO_MONO, fontSize: "0.58rem", color: "var(--text-muted)" }}>
          {meta.operator_blocks} operator blocks · {meta.pending_bookings} pending · {meta.confirmed_bookings} confirmed
        </div>
      )}
    </div>
  );
}

function Legend({ swatch, border, label }: { swatch: string; border: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <div style={{ width: 10, height: 10, borderRadius: 4, background: swatch, border: `1px solid ${border}` }} />
      <span style={{ fontFamily: CIELO_FONT, fontSize: "0.72rem", color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}

const navBtnStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 999,
  border: "1px solid var(--border)",
  background: "var(--surface)",
  color: "var(--text-secondary)",
  fontFamily: CIELO_FONT,
  fontSize: "0.9rem",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};
