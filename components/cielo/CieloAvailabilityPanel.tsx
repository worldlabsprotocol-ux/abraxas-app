"use client";
// FILE: components/cielo/CieloAvailabilityPanel.tsx
// Airbnb-mirrored calendar + Abraxas holds. No double booking on Abraxas.

import { useEffect, useState } from "react";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";
const BLOCKED = "#EF4444";

interface BlockedDate { start: string; end: string; }

interface AvailabilityResponse {
  blocked?: BlockedDate[];
  sources?: { airbnb: number; abraxas: number };
  ical_connected?: boolean;
  error?: string;
}

export function CieloAvailabilityPanel({ compact = false }: { compact?: boolean }) {
  const [blocked, setBlocked] = useState<BlockedDate[] | null>(null);
  const [meta, setMeta] = useState<{ airbnb: number; abraxas: number; ical: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/cielo/availability")
      .then(r => r.json())
      .then((data: AvailabilityResponse) => {
        if (data.blocked) {
          setBlocked(data.blocked);
          setMeta({
            airbnb: data.sources?.airbnb ?? 0,
            abraxas: data.sources?.abraxas ?? 0,
            ical: data.ical_connected ?? false,
          });
        } else {
          setError(data.error ?? "Could not load availability");
        }
      })
      .catch(() => setError("Could not load availability"));
  }, []);

  const today = new Date();
  const days = Array.from({ length: compact ? 21 : 35 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d.toISOString().slice(0, 10);
  });

  function isBlocked(dateIso: string): boolean {
    if (!blocked) return false;
    return blocked.some(b => dateIso >= b.start && dateIso < b.end);
  }

  return (
    <div style={{
      padding: compact ? "0.85rem" : "1rem 1.1rem",
      borderRadius: 14,
      background: "var(--surface-raised)",
      border: "1px solid var(--border)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                     gap: "0.75rem", marginBottom: "0.65rem", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700, color: ACCENT,
                         letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.25rem" }}>
            Availability mirror
          </div>
          <div style={{ fontFamily: FONT, fontSize: compact ? "0.78rem" : "0.85rem", fontWeight: 700,
                         color: "var(--text-primary)" }}>
            Synced with Airbnb. no overlap on Abraxas.
          </div>
        </div>
        {meta && (
          <div style={{ fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)", textAlign: "right" }}>
            {meta.ical ? "Airbnb iCal live" : "Airbnb iCal pending"}
            <br />
            {meta.abraxas} Abraxas hold{meta.abraxas === 1 ? "" : "s"}
          </div>
        )}
      </div>

      {error ? (
        <p style={{ fontFamily: FONT, fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.6 }}>
          Live calendar sync is not connected yet. Check dates on the Airbnb listing, or submit a request and we will confirm within 24 hours.
        </p>
      ) : (
        <>
          <div style={{
            display: "grid",
            gridTemplateColumns: `repeat(${compact ? 7 : 10}, 1fr)`,
            gap: 3,
            marginBottom: "0.65rem",
          }}>
            {days.map(d => (
              <div key={d} title={d} style={{
                aspectRatio: "1", borderRadius: 4,
                background: blocked === null ? "rgba(255,255,255,0.06)"
                  : isBlocked(d) ? `${BLOCKED}88` : `${ACCENT}35`,
              }} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <Legend color={`${ACCENT}35`} label="Open on Abraxas" />
            <Legend color={`${BLOCKED}88`} label="Booked (Airbnb or Abraxas)" />
          </div>
        </>
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
