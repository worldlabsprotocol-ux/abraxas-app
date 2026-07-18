"use client";
// FILE: components/vision/TrustIsTimeBoundSection.tsx

import { TRUST_OVER_TIME, REAL_ESTATE_REFRESH_TRIGGERS } from "@/lib/trustOverTime";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function TrustIsTimeBoundSection() {
  return (
    <section id="trust-over-time" style={{ scrollMarginTop: 96 }}>
      <h2 style={{ fontFamily: FONT, fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.75rem" }}>
        {TRUST_OVER_TIME.headline}
      </h2>
      <p style={{ fontFamily: FONT, fontSize: "0.92rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1.25rem" }}>
        {TRUST_OVER_TIME.intro}
      </p>

      <div style={{
        padding: "1.1rem 1.25rem", borderRadius: 16,
        border: "1px solid var(--border-strong)", background: "var(--surface-raised)",
        marginBottom: "1.25rem",
      }}>
        <h3 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.5rem" }}>The deed analogy</h3>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.7, margin: 0 }}>
          {TRUST_OVER_TIME.deedAnalogy}
        </p>
      </div>

      <h3 style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, margin: "0 0 0.35rem" }}>
        Real estate refresh triggers
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 0.75rem" }}>
        When these events occur, credentials should refresh or revoke — validity is checked at transaction time.
      </p>

      <div style={{ borderRadius: 14, border: "1px solid var(--border-strong)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: FONT, fontSize: "0.78rem" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
              <th style={{ textAlign: "left", padding: "0.65rem 0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>Event</th>
              <th style={{ textAlign: "left", padding: "0.65rem 0.85rem", fontWeight: 700, color: "var(--text-secondary)" }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {REAL_ESTATE_REFRESH_TRIGGERS.map(row => (
              <tr key={row.event} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.65rem 0.85rem", color: "var(--text-secondary)" }}>{row.event}</td>
                <td style={{ padding: "0.65rem 0.85rem", color: "#10B981" }}>{row.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.65,
        margin: "1rem 0 0", paddingLeft: "0.85rem", borderLeft: "2px solid rgba(16,185,129,0.4)",
      }}>
        {TRUST_OVER_TIME.closingNote}
      </p>
    </section>
  );
}
