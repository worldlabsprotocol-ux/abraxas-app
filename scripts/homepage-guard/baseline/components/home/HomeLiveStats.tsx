"use client";
// FILE: components/home/HomeLiveStats.tsx
// Beta pilot counters from /api/metrics/public.

import { useCallback, useEffect, useState } from "react";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  buildHomepageStatCards,
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

async function fetchPublicMetrics(): Promise<PublicMetrics | null> {
  const response = await fetch("/api/metrics/public");
  if (!response.ok) throw new Error("metrics_unavailable");
  const data = await response.json() as { metrics?: PublicMetrics };
  return data.metrics ?? null;
}

export function HomeLiveStats() {
  const [metrics, setMetrics] = useState<PublicMetrics | null>(null);
  const [status, setStatus] = useState<HomeMetricsStatus>("loading");

  const loadMetrics = useCallback(async () => {
    setStatus("loading");
    try {
      const nextMetrics = await fetchPublicMetrics();
      setMetrics(nextMetrics);
      setStatus("ready");
    } catch {
      setMetrics(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const cards = buildHomepageStatCards(metrics);
  const loading = status === "loading";
  const refreshing = loading && metrics !== null;
  const showPlaceholder = !loading && status === "ready" && cards.length === 0;

  return (
    <section aria-labelledby="home-live-stats" className="abx-home-section-center" style={{ width: "100%" }}>
      <div className="abx-home-intro">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
        Beta metrics
      </div>
      <h2 id="home-live-stats" className="abx-home-section-title" style={{ marginBottom: "1rem" }}>
        Early pilot activity
      </h2>
      </div>
      {showPlaceholder ? (
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, maxWidth: 520 }}>
          Pilot volume is still ramping. Aggregate beta metrics will appear here as design-partner activity grows.
        </p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
          {cards.map((card) => (
            <StatCard
              key={card.key}
              label={card.label}
              value={loading && !refreshing ? "…" : card.value}
              loading={loading && !refreshing}
            />
          ))}
        </div>
      )}
      {status === "error" && (
        <div style={{ marginTop: "0.75rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, maxWidth: 520, textAlign: "center" }}>
            Beta metrics are temporarily unavailable. This counter is a pilot rollup, not audited financial data.
          </p>
          <button
            type="button"
            onClick={() => void loadMetrics()}
            style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "0.45rem 0.85rem",
              borderRadius: 999,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      )}
      {refreshing && (
        <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.75rem 0 0" }}>
          Refreshing…
        </p>
      )}
    </section>
  );
}
