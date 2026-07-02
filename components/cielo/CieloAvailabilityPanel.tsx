"use client";
// FILE: components/cielo/CieloAvailabilityPanel.tsx
// Abraxas Protocol Calendar — our own availability layer for crypto bookings.

import { useEffect, useState } from "react";
import Link from "next/link";
import { CIELO_AIRBNB_URL } from "@/lib/data/flagshipProperty";
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

  useEffect(() => {
    fetch("/api/cielo/availability")
      .then(r => r.json())
      .then((data: AvailabilityResponse) => {
        setBlocked(data.blocked ?? []);
        setMeta(data.sources ?? null);
      })
      .catch(() => setBlocked([]));
  }, []);

  const today = new Date();
  const days = Array.from({ length: compact ? 21 : 35 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  function blockStyle(dateIso: string): string {
    if (!blocked) return "rgba(255,255,255,0.06)";
    const hit = blocked.find(b => dateIso >= b.start && dateIso < b.end);
    if (!hit) return `${ACCENT}35`;
    if (hit.source === "abraxas_pending") return `${PENDING}88`;
    return `${BLOCKED}88`;
  }

  return (
    <div style={{
      padding: compact ? "0.85rem" : "1rem 1.1rem",
      borderRadius: 14,
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
    }}>
      <div style={{ marginBottom: "0.65rem" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                       letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
          Abraxas Protocol Calendar
        </div>
        <div style={{ fontFamily: FONT, fontSize: compact ? "0.78rem" : "0.85rem", fontWeight: 700,
                       color: "var(--text-primary)" }}>
          Our calendar. our crypto bookings.
        </div>
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
                     lineHeight: 1.6, margin: "0.35rem 0 0" }}>
          USDC stays on Abraxas run on this calendar — not Airbnb&apos;s host tools.
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
        gridTemplateColumns: `repeat(${compact ? 7 : 10}, 1fr)`,
        gap: 3,
        marginBottom: "0.65rem",
      }}>
        {days.map(d => (
          <div key={d} title={d} style={{ aspectRatio: "1", borderRadius: 4, background: blockStyle(d) }} />
        ))}
      </div>

      <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap", marginBottom: meta ? "0.5rem" : 0 }}>
        <Legend color={`${ACCENT}35`} label="Open on Abraxas" />
        <Legend color={`${PENDING}88`} label="Pending request" />
        <Legend color={`${BLOCKED}88`} label="Confirmed / blocked" />
      </div>

      {meta && (
        <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)" }}>
          {meta.operator_blocks} operator blocks · {meta.pending_bookings} pending · calendar v1
        </div>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
      <div style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
      <span style={{ fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)" }}>{label}</span>
    </div>
  );
}
