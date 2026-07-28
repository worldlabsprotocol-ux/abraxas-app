"use client";
// FILE: components/home/HomeLiveStats.tsx
// Live protocol counters from /api/metrics/public.

import { useEffect, useState } from "react";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  buildHomeStatCards,
  type HomeMetricsStatus,
  type PublicMetrics,
} from "@/lib/home/publicMetrics";

const FONT = ABRAXAS_FONT_SANS;
const MONO = "'JetBrains Mono',monospace";

function StatCard({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div style={{
      padding: "1rem 1.1rem",
      borderRadius: 12,
      background: "var(--surface-raised)",
      border: "1px solid var(--border-strong)",
      minWidth: 140,
      flex: "1 1 140px",
      opacity: loading ? 0.65 : 1,
    }}>
      <div style={{ fontFamily: MONO, fontSize: "1.35rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
        {label}
      </div>
    </div>
  );
}

export function HomeLiveStats() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const [status, setStatus] = useState<HomeMetricsStatus>("loading");

  useEffect(() => {
    void fetch("/api/metrics/public")
      .then(async (r) => {
        if (!r.ok) throw new Error("metrics_unavailable");
        return r.json() as Promise<{ metrics?: PublicMetrics }>;
      })
      .then((data) => {
        setMetrics(data.metrics ?? null);
        setStatus("ready");
      })
      .catch(() => {
        setMetrics(null);
        setStatus("error");
      });
  }, []);

  const cards = buildHomeStatCards(metrics);
  const loading = status === "loading";

  return (
    <section aria-labelledby="home-live-stats">
      <p className="abx-section-label" style={{ marginBottom: "0.65rem" }}>
        Live protocol
      </p>
      <h2 id="home-live-stats" className="abx-home-h2" style={{ marginBottom: "1rem" }}>
        Trust in motion
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
        {cards.map((card) => (
          <StatCard
            key={card.key}
            label={card.label}
            value={loading ? "…" : card.value}
            loading={loading}
          />
        ))}
      </div>
      {status === "error" && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.75rem 0 0" }}>
          Live metrics temporarily unavailable. Counts will refresh when the API recovers.
        </p>
      )}
    </section>
  );
}
