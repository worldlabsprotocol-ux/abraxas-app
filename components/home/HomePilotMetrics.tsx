"use client";
// FILE: components/home/HomePilotMetrics.tsx
// Live Supabase metrics with pilot-labeled fallbacks — boot-screen stat tiles.

import { useEffect, useState } from "react";
import {
  buildPilotMetricsFromPublic,
  type PilotMetric,
  type PublicMetricsPayload,
  PILOT_METRICS,
} from "@/lib/reusableTrust";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const ACCENT_CYCLE = ["var(--accent)", "var(--accent-2)", "var(--accent)"] as const;

export function HomePilotMetrics() {
  const [metrics, setMetrics] = useState<PilotMetric[]>(PILOT_METRICS);

  useEffect(() => {
    fetch("/api/metrics/public")
      .then(r => r.json())
      .then((data: PublicMetricsPayload) => setMetrics(buildPilotMetricsFromPublic(data)))
      .catch(() => { /* static fallbacks */ });
  }, []);

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
        {metrics.map((m, i) => (
          <div key={m.label} className="abx-glass-panel" style={{
            padding: "0.85rem 0.9rem", borderRadius: 14,
          }}>
            <div style={{
              fontFamily: FONT, fontSize: "clamp(1.1rem, 3vw, 1.35rem)",
              fontWeight: 900,
              color: ACCENT_CYCLE[i % ACCENT_CYCLE.length],
              letterSpacing: "-0.03em",
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
