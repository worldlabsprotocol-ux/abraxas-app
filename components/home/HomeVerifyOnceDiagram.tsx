"use client";
// FILE: components/home/HomeVerifyOnceDiagram.tsx
// Today vs With Abraxas — value prop at a glance.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = "'JetBrains Mono',monospace";
const ACCENT = "#10B981";

function FlowNode({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: "0.78rem",
        fontWeight: 700,
        padding: "0.5rem 0.75rem",
        borderRadius: 10,
        border: `1px solid ${muted ? "var(--border)" : `${ACCENT}44`}`,
        background: muted ? "var(--surface)" : `${ACCENT}10`,
        color: muted ? "var(--text-secondary)" : "var(--text-primary)",
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
}

function Arrow({ horizontal }: { horizontal?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: ACCENT,
        fontFamily: MONO,
        fontSize: "1.1rem",
        fontWeight: 700,
        padding: horizontal ? "0 0.35rem" : "0.35rem 0",
        flexShrink: 0,
      }}
    >
      {horizontal ? "→" : "↓"}
    </div>
  );
}

export function HomeVerifyOnceDiagram() {
  return (
    <section aria-labelledby="home-verify-once-heading">
      <h2
        id="home-verify-once-heading"
        className="sr-only"
        style={{ position: "absolute", width: 1, height: 1, overflow: "hidden" }}
      >
        Verify once comparison
      </h2>
      <div className="verify-once-diagram" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1.25rem" }}>
        <div
          style={{
            padding: "clamp(1rem, 3vw, 1.35rem)",
            borderRadius: 14,
            background: "var(--surface-raised)",
            border: "1px solid var(--border-strong)",
          }}
        >
          <div style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: "var(--text-muted)", marginBottom: "0.75rem",
          }}>
            Today
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>
            {["Exchange A ── KYC", "Exchange B ── KYC", "Marketplace ── KYC", "RWA Platform ── KYC"].map((row) => (
              <FlowNode key={row} muted>{row}</FlowNode>
            ))}
          </div>
        </div>

        <Arrow />

        <div
          style={{
            padding: "clamp(1rem, 3vw, 1.35rem)",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${ACCENT}12 0%, rgba(167,139,250,0.06) 100%)`,
            border: `1px solid ${ACCENT}33`,
          }}
        >
          <div style={{
            fontFamily: FONT, fontSize: "0.68rem", fontWeight: 800,
            letterSpacing: "0.08em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.75rem",
          }}>
            With Abraxas
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <FlowNode>Verify Once</FlowNode>
            <Arrow />
            <FlowNode>Reusable Credential</FlowNode>
            <div aria-hidden style={{
              fontFamily: MONO, fontSize: "0.85rem", fontWeight: 700,
              color: ACCENT, padding: "0.35rem 0", textAlign: "center",
            }}>
              ┌──────┼──────┐
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0.5rem", width: "100%" }}>
              {["RWA", "Exchange", "Marketplace"].map((p) => (
                <FlowNode key={p}>{p}</FlowNode>
              ))}
            </div>
          </div>
        </div>
      </div>
      <style jsx>{`
        @media (min-width: 860px) {
          .verify-once-diagram {
            grid-template-columns: 1fr auto 1fr;
            align-items: stretch;
            gap: 1rem !important;
          }
        }
      `}</style>
    </section>
  );
}
