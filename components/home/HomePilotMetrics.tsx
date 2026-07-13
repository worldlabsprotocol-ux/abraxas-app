"use client";
// FILE: components/home/HomePilotMetrics.tsx
// Undeniable proof — pilot-labeled numbers where we have data.

import { PILOT_METRICS } from "@/lib/reusableTrust";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomePilotMetrics() {
  return (
    <section aria-labelledby="pilot-metrics-heading" style={{
      padding: "clamp(1rem, 2.5vw, 1.5rem) 0",
    }}>
      <h2 id="pilot-metrics-heading" className="sr-only">Pilot metrics</h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
        gap: "0.65rem",
      }}>
        {PILOT_METRICS.map(m => (
          <div key={m.label} style={{
            padding: "0.85rem 0.9rem", borderRadius: 12,
            border: "1px solid var(--border-strong)",
            background: "var(--surface-raised)",
          }}>
            <div style={{
              fontFamily: FONT, fontSize: "clamp(1.1rem, 3vw, 1.35rem)",
              fontWeight: 900, color: ACCENT, letterSpacing: "-0.03em",
              marginBottom: "0.25rem",
            }}>
              {m.value}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
              color: "var(--text-primary)", lineHeight: 1.35, marginBottom: 4,
            }}>
              {m.label}
            </div>
            <div style={{
              fontFamily: MONO, fontSize: "0.5rem", color: "var(--text-muted)",
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}>
              {m.pilot ? "Pilot · " : ""}{m.note}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
