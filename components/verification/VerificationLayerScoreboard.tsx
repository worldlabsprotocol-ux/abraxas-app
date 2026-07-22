"use client";
// FILE: components/verification/VerificationLayerScoreboard.tsx
// Seven-item verification layer tracker with blockers and E2E status.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Btn } from "@/components/redesign/ui";
import { COSMIC_PALETTE, DEMO_TYPOGRAPHY } from "@/lib/demoDesignSystem";
import type { VerificationLayerItem, VerificationLayerStatus } from "@/lib/authenticationProof/verificationLayerStatus";
import type { E2eVerificationCheckResult } from "@/lib/authenticationProof/runE2eVerificationCheck";

const FONT = DEMO_TYPOGRAPHY.fontSans;
const MONO = DEMO_TYPOGRAPHY.fontMono;

const STATUS_COLOR: Record<string, string> = {
  live: COSMIC_PALETTE.emerald,
  partial: COSMIC_PALETTE.gold,
  not_configured: COSMIC_PALETTE.rose,
};

const STATUS_LABEL: Record<string, string> = {
  live: "LIVE",
  partial: "PARTIAL",
  not_configured: "BLOCKED",
};

interface LayerApiResponse extends VerificationLayerStatus {
  progress: {
    done: number;
    total: number;
    percent: number;
    isFullyReady: boolean;
  };
  e2e?: {
    ok: boolean;
    summary: string;
    fully_live: boolean;
    steps: E2eVerificationCheckResult["steps"];
    blockers: string[];
  };
}

export function VerificationLayerScoreboard({ compact = false }: { compact?: boolean }) {
  const [data, setData] = useState<LayerApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/verify/layer")
      .then((r) => r.json())
      .then((json) => setData(json as LayerApiResponse))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const progress = data?.progress ?? { done: 0, total: 7, percent: 0, isFullyReady: false };
  const items: VerificationLayerItem[] = data?.items ?? [];

  if (loading) {
    return (
      <div className="abx-cosmic-card" style={{ padding: "1.5rem", borderRadius: 20 }}>
        <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: COSMIC_PALETTE.textMuted }}>Loading verification layer…</span>
      </div>
    );
  }

  return (
    <div>
      <div
        className="abx-cosmic-card"
        style={{
          padding: compact ? "1rem 1.15rem" : "clamp(1.1rem, 2.5vw, 1.5rem)",
          borderRadius: 20,
          marginBottom: compact ? 0 : "1.25rem",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: "0.72rem",
              fontWeight: 800,
              letterSpacing: "0.1em",
              color: progress.isFullyReady ? COSMIC_PALETTE.emerald : COSMIC_PALETTE.gold,
              padding: "6px 14px",
              borderRadius: 999,
              border: `1px solid ${progress.isFullyReady ? COSMIC_PALETTE.emerald : COSMIC_PALETTE.gold}44`,
              background: `${progress.isFullyReady ? COSMIC_PALETTE.emerald : COSMIC_PALETTE.gold}12`,
            }}
          >
            {progress.done}/{progress.total} VERIFICATION LAYER
          </span>
          <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: COSMIC_PALETTE.textMuted }}>
            {progress.percent}% production-ready · Sui {data?.sui_network ?? "—"}
          </span>
        </div>

        <div style={{ height: 8, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden", marginBottom: compact ? 12 : 20 }}>
          <div
            style={{
              width: `${progress.percent}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${COSMIC_PALETTE.emerald}, ${COSMIC_PALETTE.violet})`,
              transition: "width 0.5s ease",
            }}
          />
        </div>

        {data?.summary && !compact && (
          <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: "0 0 1rem" }}>
            {data.summary}
          </p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((item, i) => (
            <div
              key={item.id}
              style={{
                padding: compact ? "10px 12px" : "12px 14px",
                borderRadius: 12,
                border: `1px solid ${STATUS_COLOR[item.status]}33`,
                background: item.status === "live" ? `${COSMIC_PALETTE.emerald}08` : "rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: COSMIC_PALETTE.textMuted }}>{i + 1}</span>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.52rem",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    color: STATUS_COLOR[item.status],
                    padding: "2px 8px",
                    borderRadius: 999,
                    border: `1px solid ${STATUS_COLOR[item.status]}44`,
                  }}
                >
                  {STATUS_LABEL[item.status]}
                </span>
                <span style={{ fontFamily: FONT, fontSize: compact ? "0.76rem" : "0.82rem", fontWeight: 800, color: "var(--text-primary)", flex: 1 }}>
                  {item.label}
                </span>
              </div>
              {!compact && (
                <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", margin: "0 0 6px", lineHeight: 1.5 }}>
                  {item.detail}
                </p>
              )}
              {item.blockers.length > 0 && item.status !== "live" && (
                <div style={{ fontFamily: MONO, fontSize: "0.58rem", color: COSMIC_PALETTE.gold, lineHeight: 1.6 }}>
                  {item.blockers.map((b) => (
                    <div key={b}>→ {b}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {!compact && data?.e2e && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 12,
              border: `1px solid ${data.e2e.fully_live ? COSMIC_PALETTE.emerald : COSMIC_PALETTE.gold}33`,
              background: `${data.e2e.fully_live ? COSMIC_PALETTE.emerald : COSMIC_PALETTE.gold}08`,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700, letterSpacing: "0.08em", color: COSMIC_PALETTE.gold, marginBottom: 6 }}>
              E2E CHECK
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.5 }}>
              {data.e2e.summary}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {data.e2e.steps.map((step) => (
                <div key={step.id} style={{ display: "flex", gap: 8, fontFamily: FONT, fontSize: "0.68rem" }}>
                  <span style={{ color: step.passed ? COSMIC_PALETTE.emerald : COSMIC_PALETTE.rose, fontWeight: 800 }}>
                    {step.passed ? "✓" : "○"}
                  </span>
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{step.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-strong)" }}>
          <Btn href="/api/verify/e2e" size="sm">
            E2E check (JSON) →
          </Btn>
        <Btn href="/api/verify/bootstrap" variant="secondary" size="sm">
          Bootstrap diagnostics (JSON) →
        </Btn>
          <Btn href="/mainnet" variant="ghost" size="sm">
            Mainnet gates →
          </Btn>
          <Link href="/docs/ai-agents" style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
            Agent verify docs →
          </Link>
        </div>
      </div>
    </div>
  );
}
