"use client";
// FILE: components/roadmap/MainnetReadinessPanel.tsx

import Link from "next/link";
import {
  MAINNET_READINESS_MILESTONES,
  MAINNET_READINESS_HEADLINE,
  mainnetReadinessProgress,
} from "@/lib/mainnetReadiness";
import { CURRENT_STATUS_LIVE } from "@/lib/currentStatus";
import { CurrentStatusModule } from "@/components/status/CurrentStatusModule";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";

export function MainnetReadinessPanel() {
  const { done, total } = mainnetReadinessProgress();

  return (
    <section id="mainnet-readiness" aria-labelledby="mainnet-readiness-heading">
      <div style={{ marginBottom: "1.25rem" }}>
        <CurrentStatusModule id="roadmap-status" variant="full" />
      </div>

      <div
        className="abx-glass-panel"
        style={{
          marginBottom: "1.25rem",
          padding: "clamp(1.15rem, 3vw, 1.5rem)",
          borderRadius: 18,
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.4rem" }}>
          Full checklist · {done}/{total} gates complete
        </div>
        <h2
          id="mainnet-readiness-heading"
          style={{
            fontFamily: FONT,
            fontSize: "var(--fs-h2)",
            fontWeight: 800,
            color: "var(--text-primary)",
            margin: "0 0 1rem",
            letterSpacing: "-0.02em",
          }}
        >
          {MAINNET_READINESS_HEADLINE}
        </h2>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
          {CURRENT_STATUS_LIVE.map(item => (
            <span
              key={item.id}
              style={{
                padding: "0.35rem 0.7rem",
                borderRadius: 999,
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: ACCENT,
                background: "rgba(16,185,129,0.1)",
                border: "1px solid rgba(16,185,129,0.28)",
              }}
            >
              ✓ {item.label}
            </span>
          ))}
        </div>

        <div style={{ display: "grid", gap: "0.45rem" }}>
          {MAINNET_READINESS_MILESTONES.map(m => (
            <Link
              key={m.id}
              href={m.href}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "0.65rem",
                alignItems: "start",
                padding: "0.75rem 0.9rem",
                borderRadius: 12,
                border: `1px solid ${m.done ? "rgba(16,185,129,0.35)" : "var(--border)"}`,
                background: m.done ? "rgba(16,185,129,0.06)" : "var(--surface)",
                textDecoration: "none",
                transition: "border-color 0.15s ease",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  flexShrink: 0,
                  marginTop: 2,
                  background: m.done ? `${ACCENT}22` : "var(--surface-raised)",
                  border: `1.5px solid ${m.done ? ACCENT : "var(--border-strong)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.62rem",
                  color: m.done ? ACCENT : "var(--text-muted)",
                }}
              >
                {m.done ? "✓" : ""}
              </span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.74rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {m.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
