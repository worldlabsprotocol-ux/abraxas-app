"use client";
// FILE: components/home/HomeLiveStats.tsx
// Beta pilot counters from /api/metrics/public.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  METRICS_EMPTY,
  METRICS_EMPTY_CTA,
  METRICS_EMPTY_HREF,
  METRICS_ERROR,
  METRICS_EYEBROW,
  METRICS_FOOTNOTE_PREFIX,
  METRICS_HEADING,
  METRICS_LOADING,
} from "@/lib/activation/activationCopy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  buildHomepageMetricsView,
  type HomeMetricsStatus,
  type HomeStatCard,
  type PublicMetricsPayload,
} from "@/lib/home/publicMetrics";

const FONT = ABRAXAS_FONT_SANS;
const MONO = "'JetBrains Mono',monospace";

function StatCard({ card }: { card: HomeStatCard }) {
  return (
    <div
      style={{
        padding: "1rem 1.1rem",
        borderRadius: 12,
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
        minWidth: 140,
        flex: "1 1 140px",
      }}
      title={card.window ? `${card.definition} (${card.window} window)` : card.definition}
    >
      <div style={{ fontFamily: MONO, fontSize: "1.35rem", fontWeight: 800, color: "var(--accent)", letterSpacing: "-0.02em" }}>
        {card.value}
      </div>
      <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 4, lineHeight: 1.4 }}>
        {card.label}
      </div>
    </div>
  );
}

function formatUpdatedAt(iso: string | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

async function fetchPublicMetricsPayload(): Promise<PublicMetricsPayload> {
  const response = await fetch("/api/metrics/public");
  if (!response.ok) throw new Error("metrics_unavailable");
  const data = await response.json() as PublicMetricsPayload;
  return data;
}

export function HomeLiveStats() {
  const [payload, setPayload] = useState<PublicMetricsPayload | null>(null);
  const [status, setStatus] = useState<HomeMetricsStatus>("loading");

  const loadMetrics = useCallback(async () => {
    setStatus("loading");
    setPayload(null);
    try {
      const nextPayload = await fetchPublicMetricsPayload();
      const view = buildHomepageMetricsView(nextPayload);
      setPayload(nextPayload);
      setStatus(view.cards.length > 0 ? "ready" : "empty");
    } catch {
      setPayload(null);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const view = buildHomepageMetricsView(payload);
  const updatedLabel = formatUpdatedAt(view.updatedAt);

  return (
    <section aria-labelledby="home-live-stats" className="abx-home-section-center" style={{ width: "100%" }}>
      <div className="abx-home-intro">
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.65rem" }}>
          {METRICS_EYEBROW}
        </div>
        <h2 id="home-live-stats" className="abx-home-section-title" style={{ marginBottom: "1rem" }}>
          {METRICS_HEADING}
        </h2>
      </div>

      {status === "loading" && (
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, maxWidth: 520 }}>
          {METRICS_LOADING}
        </p>
      )}

      {status === "ready" && (
        <>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
            {view.cards.map((card) => (
              <StatCard key={card.key} card={card} />
            ))}
          </div>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: "0.85rem auto 0", maxWidth: 560, lineHeight: 1.55 }}>
            {METRICS_FOOTNOTE_PREFIX}
            {view.phase ? ` Phase: ${view.phase.replace(/_/g, " ")}.` : ""}
            {updatedLabel ? ` Updated ${updatedLabel}.` : ""}
            {view.databaseSource === "unavailable" ? " Database source offline — counts may be incomplete." : ""}
          </p>
        </>
      )}

      {status === "empty" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.65rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, maxWidth: 520 }}>
            {METRICS_EMPTY}
          </p>
          <Link
            href={METRICS_EMPTY_HREF}
            style={{
              fontFamily: FONT,
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "var(--accent)",
              textDecoration: "none",
            }}
          >
            {METRICS_EMPTY_CTA} →
          </Link>
        </div>
      )}

      {status === "error" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem" }}>
          <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", margin: 0, maxWidth: 520, textAlign: "center" }}>
            {METRICS_ERROR}
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
    </section>
  );
}
