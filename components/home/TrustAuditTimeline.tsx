"use client";
// FILE: components/home/TrustAuditTimeline.tsx
// Permanent trust trail — signature UI for reusable proof.

import { TRUST_AUDIT_TRAIL_EXAMPLE } from "@/lib/reusableTrust";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function TrustAuditTimeline({ compact }: { compact?: boolean }) {
  return (
    <section aria-labelledby={compact ? undefined : "audit-trail-heading"} style={{
      padding: compact ? 0 : "clamp(1.25rem, 3vw, 2rem) 0",
      borderTop: compact ? "none" : "1px solid var(--border-strong)",
    }}>
      {!compact && (
        <>
          <p style={{
            fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: ACCENT, margin: "0 0 0.45rem",
          }}>
            Audit trail
          </p>
          <h2 id="audit-trail-heading" style={{
            fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
            letterSpacing: "-0.02em", color: "var(--text-primary)",
            margin: "0 0 0.35rem", maxWidth: 560, lineHeight: 1.15,
          }}>
            Every step becomes permanent
          </h2>
          <p style={{
            fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
            lineHeight: 1.65, maxWidth: 480, margin: "0 0 1rem",
          }}>
            From first sign-in to registry acceptance — one timeline partners can trust without re-forwarding PDFs.
          </p>
        </>
      )}

      <div style={{ maxWidth: compact ? "100%" : 420 }}>
        {TRUST_AUDIT_TRAIL_EXAMPLE.map((row, i) => (
          <div key={row.step} style={{ display: "flex", gap: "0.75rem" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 14, flexShrink: 0 }}>
              <span style={{
                width: 10, height: 10, borderRadius: "50%", marginTop: 5,
                background: i === TRUST_AUDIT_TRAIL_EXAMPLE.length - 1 ? ACCENT : "var(--border-strong)",
                boxShadow: i === TRUST_AUDIT_TRAIL_EXAMPLE.length - 1 ? `0 0 10px ${ACCENT}66` : "none",
              }} />
              {i < TRUST_AUDIT_TRAIL_EXAMPLE.length - 1 && (
                <span style={{ width: 2, flex: 1, minHeight: 28, background: "var(--border)", marginTop: 4 }} />
              )}
            </div>
            <div style={{ paddingBottom: i < TRUST_AUDIT_TRAIL_EXAMPLE.length - 1 ? "0.65rem" : 0 }}>
              <div style={{
                fontFamily: FONT, fontSize: compact ? "0.78rem" : "0.85rem",
                fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.3,
              }}>
                {row.step}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.45,
              }}>
                {row.detail}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
