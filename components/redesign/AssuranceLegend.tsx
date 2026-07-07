"use client";
// FILE: components/redesign/AssuranceLegend.tsx
// L1–L4 definitions — visible wherever assurance levels appear.

import { ASSURANCE_LEVELS_PARTNER } from "@/lib/assuranceTaxonomy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function AssuranceLegend({ compact = false }: { compact?: boolean }) {
  return (
    <div style={{
      padding: compact ? "0.75rem" : "1rem 1.1rem",
      borderRadius: 14,
      background: "var(--surface)",
      border: "1px solid var(--border)",
    }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
        letterSpacing: "0.08em", textTransform: "uppercase",
        color: "var(--text-muted)", marginBottom: "0.5rem",
      }}>
        Assurance levels (L1–L4)
      </div>
      <div style={{ display: "grid", gap: compact ? "0.35rem" : "0.45rem" }}>
        {ASSURANCE_LEVELS_PARTNER.map(l => (
          <div key={l.level} style={{
            display: "grid",
            gridTemplateColumns: compact ? "auto 1fr" : "52px 1fr",
            gap: "0.5rem", alignItems: "start",
          }}>
            <span style={{
              fontFamily: MONO, fontSize: "0.62rem", fontWeight: 800, color: "#10B981",
            }}>
              L{l.level}
            </span>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)" }}>
                {l.label}
              </div>
              {!compact && (
                <div style={{ fontFamily: FONT, fontSize: "0.66rem", color: "var(--text-muted)", lineHeight: 1.5, marginTop: 2 }}>
                  {l.evidence} · Issuer: {l.issuerType} · TTL: {l.typicalTtl} · Revoke: {l.revocation}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
