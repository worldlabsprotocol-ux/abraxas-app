"use client";
// FILE: components/cielo/CieloAvailabilityPanel.tsx
// Abraxas Protocol Calendar — labeled grid with open / pending / blocked states.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";
import { buildCalendarGrid } from "@/lib/cielo/calendarDates";
import type { BlockedDate } from "@/lib/cielo/types";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const PENDING = "#F59E0B";
const BLOCKED = "#EF4444";

interface AvailabilityResponse {
  blocked?: BlockedDate[];
  calendar?: string;
  sources?: {
    pending_bookings: number;
    confirmed_bookings: number;
    operator_blocks: number;
  };
  airbnb_listing_url?: string;
}

export function CieloAvailabilityPanel({ compact = false }: { compact?: boolean }) {
  const [blocked, setBlocked] = useState<BlockedDate[] | null>(null);
  const [meta, setMeta] = useState<AvailabilityResponse["sources"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch("/api/cielo/availability")
      .then(r => r.json())
      .then((data: AvailabilityResponse & { error?: string }) => {
        if (data.error && !data.blocked) {
          throw new Error(data.error);
        }
        setBlocked(data.blocked ?? []);
        setMeta(data.sources ?? null);
      })
      .catch(() => {
        setBlocked(null);
        setError("Could not load Protocol Calendar. Try again or book on /flagship.");
      })
      .finally(() => setLoading(false));
  }, []);

  const grid = useMemo(() => buildCalendarGrid(compact ? 28 : 42), [compact]);

  function cellColors(dateIso: string): { bg: string; border: string; text: string } {
    if (!blocked) {
      return { bg: "rgba(255,255,255,0.06)", border: "transparent", text: "var(--text-muted)" };
    }
    const hit = blocked.find(b => dateIso >= b.start && dateIso < b.end);
    if (!hit) {
      return { bg: `${ACCENT}22`, border: `${ACCENT}44`, text: "var(--text-primary)" };
    }
    if (hit.source === "abraxas_pending") {
      return { bg: `${PENDING}33`, border: `${PENDING}66`, text: "#FDE68A" };
    }
    return { bg: `${BLOCKED}44`, border: `${BLOCKED}77`, text: "#FECACA" };
  }

  function statusLabel(dateIso: string): string {
    if (!blocked) return dateIso;
    const hit = blocked.find(b => dateIso >= b.start && dateIso < b.end);
    if (!hit) return `${dateIso} · Open on Abraxas`;
    if (hit.source === "abraxas_pending") return `${dateIso} · Pending request`;
    return `${dateIso} · Confirmed / blocked`;
  }

  if (loading) {
    return (
      <div id="protocol-calendar" style={shellStyle(compact)}>
        Loading Abraxas Protocol Calendar…
      </div>
    );
  }

  if (error || blocked === null) {
    return (
      <div id="protocol-calendar" style={{ ...shellStyle(compact), borderStyle: "dashed" }}>
        {error ?? "Calendar unavailable."}{" "}
        <Link href="/cielo/status" style={{ color: ACCENT }}>Track a booking</Link>
      </div>
    );
  }

  return (
    <div id="protocol-calendar" style={shellStyle(compact)}>
      <div style={{ marginBottom: "0.75rem" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                       letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
          Abraxas Protocol Calendar
        </div>
        <div style={{ fontFamily: FONT, fontSize: compact ? "0.78rem" : "0.85rem", fontWeight: 700,
                       color: "var(--text-primary)" }}>
          {grid.monthLabel} · USDC stays on Abraxas
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
                     lineHeight: 1.6, margin: "0.35rem 0 0" }}>
          Dates with numbers show availability on our calendar — not Airbnb host tools.
          Cross-check the{" "}
          <Link href={CIELO_AIRBNB_URL} target="_blank" rel="noopener noreferrer"
            style={{ color: ACCENT, textDecoration: "underline" }}>
            public listing
          </Link>{" "}
          before you travel; we reconcile both channels.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        gap: 4,
        marginBottom: 4,
      }}>
        {grid.weekdayLabels.map(w => (
          <div key={w} style={{
            fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
            color: "var(--text-muted)", textAlign: "center", padding: "0.15rem 0",
          }}>
            {w}
          </div>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
        gap: 4,
        marginBottom: "0.75rem",
      }}>
        {grid.cells.map((cell, i) => {
          if (!cell.dateIso || cell.dayOfMonth == null) {
            return <div key={`pad-${i}`} style={{ aspectRatio: "1", minHeight: compact ? 28 : 34 }} />;
          }
          const colors = cellColors(cell.dateIso);
          return (
            <div
              key={cell.dateIso}
              title={statusLabel(cell.dateIso)}
              aria-label={statusLabel(cell.dateIso)}
              style={{
                aspectRatio: "1",
                minHeight: compact ? 28 : 34,
                borderRadius: 6,
                background: colors.bg,
                border: `1px solid ${cell.isToday ? ACCENT : colors.border}`,
                boxShadow: cell.isToday ? `0 0 0 1px ${ACCENT}` : undefined,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONT,
                fontSize: compact ? "0.68rem" : "0.74rem",
                fontWeight: cell.isToday ? 800 : 600,
                color: colors.text,
              }}
            >
              {cell.dayOfMonth}
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginBottom: meta ? "0.5rem" : 0 }}>
        <Legend color={`${ACCENT}44`} label="Open on Abraxas" />
        <Legend color={`${PENDING}88`} label="Pending request" />
        <Legend color={`${BLOCKED}88`} label="Confirmed / blocked" />
      </div>

      {meta && (
        <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)" }}>
          {meta.operator_blocks} operator blocks · {meta.pending_bookings} pending · {meta.confirmed_bookings} confirmed
        </div>
      )}
    </div>
  );
}

function shellStyle(compact: boolean): React.CSSProperties {
  return {
    padding: compact ? "0.85rem" : "1rem 1.1rem",
    borderRadius: 14,
    background: "var(--surface-raised)",
    border: "1px solid var(--border)",
    fontFamily: FONT,
    fontSize: "0.78rem",
    color: "var(--text-muted)",
  };
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
