"use client";
// FILE: components/vision/IssuerHolderVerifierSection.tsx

import { NETWORK_ROLES } from "@/lib/abraxasNetwork";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

const ROLE_COLOR: Record<string, string> = {
  issuer: "#3B82F6",
  holder: ACCENT,
  verifier: "#F59E0B",
};

export function IssuerHolderVerifierSection({ compact = false }: { compact?: boolean }) {
  return (
    <section aria-labelledby="ihv-heading">
      {!compact && (
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{
            fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: ACCENT, marginBottom: "0.45rem",
          }}>
            Core mental model
          </div>
          <h2 id="ihv-heading" style={{
            fontFamily: FONT, fontSize: compact ? "1rem" : "var(--fs-h2)",
            fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.15,
            color: "var(--text-primary)", margin: "0 0 0.5rem", maxWidth: 620,
          }}>
            Issuer · Holder · Verifier
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
            lineHeight: 1.65, maxWidth: 640, margin: 0,
          }}>
            Share the proof, not the documents. The issuer signs facts. The holder controls consent.
            The verifier applies its own policy and keeps an audit record.
          </p>
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: "0.75rem",
      }}>
        {(["issuer", "holder", "verifier"] as const).map(role => {
          const meta = NETWORK_ROLES[role];
          const color = ROLE_COLOR[role];
          return (
            <div key={role} style={{
              borderRadius: 14, padding: "1rem 1.05rem",
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
              borderTop: `3px solid ${color}`,
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
                color, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem",
              }}>
                {meta.title}
              </div>
              <p style={{
                fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)",
                lineHeight: 1.6, margin: "0 0 0.55rem",
              }}>
                {meta.description}
              </p>
              <ul style={{ margin: 0, paddingLeft: "1rem" }}>
                {meta.examples.slice(0, compact ? 2 : 3).map(ex => (
                  <li key={ex} style={{
                    fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
                    lineHeight: 1.5, marginBottom: 4,
                  }}>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
