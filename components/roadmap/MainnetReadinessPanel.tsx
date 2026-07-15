"use client";
// FILE: components/roadmap/MainnetReadinessPanel.tsx

import Link from "next/link";
import {
  MAINNET_READINESS_MILESTONES,
  MAINNET_READINESS_HEADLINE,
  MAINNET_READINESS_SUMMARY,
  MAINNET_CURRENT_STAGE,
  mainnetReadinessProgress,
} from "@/lib/mainnetReadiness";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function MainnetReadinessPanel() {
  const { done, total, percent } = mainnetReadinessProgress();

  return (
    <section id="mainnet-readiness" aria-labelledby="mainnet-readiness-heading">
      <ContentCardShell>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.85rem" }}>
          <div style={{ flex: "1 1 280px" }}>
            <div className="abx-eyebrow-violet" style={{ marginBottom: "0.4rem" }}>
              Mainnet readiness · {done}/{total} gates
            </div>
            <h2
              id="mainnet-readiness-heading"
              style={{
                fontFamily: FONT,
                fontSize: "var(--fs-h2)",
                fontWeight: 800,
                color: "var(--text-primary)",
                margin: "0 0 0.5rem",
                letterSpacing: "-0.02em",
              }}
            >
              {MAINNET_READINESS_HEADLINE}
            </h2>
            <p style={{ fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0, maxWidth: 640 }}>
              {MAINNET_READINESS_SUMMARY}
            </p>
          </div>
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: 12,
              border: "1px solid rgba(16,185,129,0.3)",
              background: "rgba(16,185,129,0.08)",
              minWidth: 160,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: "0.48rem", letterSpacing: "0.1em", color: ACCENT, marginBottom: 4 }}>
              {MAINNET_CURRENT_STAGE.label}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              {MAINNET_CURRENT_STAGE.stage}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {percent}% of gates complete
            </div>
          </div>
        </div>

        <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 680 }}>
          {MAINNET_CURRENT_STAGE.body}
        </p>

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
                padding: "0.7rem 0.85rem",
                borderRadius: 12,
                border: `1px solid ${m.done ? "rgba(16,185,129,0.35)" : "var(--border)"}`,
                background: m.done ? "rgba(16,185,129,0.06)" : "var(--surface)",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  flexShrink: 0,
                  marginTop: 2,
                  background: m.done ? `${ACCENT}22` : "var(--surface-raised)",
                  border: `1.5px solid ${m.done ? ACCENT : "var(--border-strong)"}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.6rem",
                  color: m.done ? ACCENT : "var(--text-muted)",
                }}
              >
                {m.done ? "✓" : ""}
              </span>
              <div>
                <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
                  {m.label}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.55 }}>
                  {m.description}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </ContentCardShell>
    </section>
  );
}

function ContentCardShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="abx-glass-panel"
      style={{
        marginBottom: "1.25rem",
        padding: "1.25rem",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      {children}
    </div>
  );
}
