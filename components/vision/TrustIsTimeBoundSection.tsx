"use client";
// FILE: components/vision/TrustIsTimeBoundSection.tsx
// Non-technical trust-over-time story — revocation, refresh, real estate triggers.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import {
  TRUST_IS_TIME_BOUND_HEADLINE,
  TRUST_IS_TIME_BOUND_SUBHEAD,
  TRUST_DEED_ANALOGY,
  TRUST_VERIFY_ONCE_HONEST,
  TRUST_FAIL_CLOSED,
  REAL_ESTATE_REFRESH_TRIGGERS,
  TRUST_OVER_TIME_VERIFY,
  TRUST_OVER_TIME_FOR_PARTNERS,
} from "@/lib/trustOverTime";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function TrustIsTimeBoundSection() {
  return (
    <section id="trust-over-time" aria-labelledby="trust-over-time-heading" style={{ marginBottom: "2.5rem" }}>
      <div style={{
        fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
        letterSpacing: "0.1em", textTransform: "uppercase",
        color: ACCENT, marginBottom: "0.45rem",
      }}>
        Trust over time
      </div>
      <h2
        id="trust-over-time-heading"
        style={{
          fontFamily: FONT,
          fontSize: "var(--fs-h2)",
          fontWeight: 800,
          letterSpacing: "-0.02em",
          lineHeight: 1.15,
          color: "var(--text-primary)",
          margin: "0 0 0.55rem",
          maxWidth: 640,
        }}
      >
        {TRUST_IS_TIME_BOUND_HEADLINE}
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)",
        lineHeight: 1.7, maxWidth: 680, margin: "0 0 0.85rem",
      }}>
        {TRUST_IS_TIME_BOUND_SUBHEAD}
      </p>

      <div
        style={{
          padding: "1rem 1.15rem",
          borderRadius: 14,
          border: "1px solid rgba(16,185,129,0.28)",
          background: "linear-gradient(155deg, rgba(16,185,129,0.07) 0%, var(--surface-raised) 100%)",
          marginBottom: "1.25rem",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.75, margin: "0 0 0.65rem" }}>
          {TRUST_DEED_ANALOGY}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
          {TRUST_VERIFY_ONCE_HONEST}
        </p>
        <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          {TRUST_FAIL_CLOSED}
        </p>
      </div>

      <h3 style={{ fontFamily: FONT, fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.65rem" }}>
        Real estate refresh triggers
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-muted)", lineHeight: 1.65, margin: "0 0 0.85rem", maxWidth: 640 }}>
        Land and title workflows have natural re-verification events — sale, refinance, lien — instead of constant full re-KYC.
      </p>

      <div style={{ overflowX: "auto", borderRadius: 14, border: "1px solid var(--border-strong)", marginBottom: "1.25rem" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
          <thead>
            <tr style={{ background: "var(--surface-raised)" }}>
              {["Event", "System response", "Why it matters"].map(h => (
                <th key={h} style={{
                  fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
                  letterSpacing: "0.06em", textTransform: "uppercase",
                  color: "var(--text-muted)", textAlign: "left",
                  padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {REAL_ESTATE_REFRESH_TRIGGERS.map(row => (
              <tr key={row.event}>
                <td style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-primary)", padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)", verticalAlign: "top" }}>
                  {row.event}
                </td>
                <td style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)", verticalAlign: "top", lineHeight: 1.55 }}>
                  {row.action}
                </td>
                <td style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", padding: "0.75rem 0.85rem", borderBottom: "1px solid var(--border)", verticalAlign: "top", lineHeight: 1.55 }}>
                  {row.why}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{
        padding: "1rem 1.15rem",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        marginBottom: "1rem",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          {TRUST_OVER_TIME_FOR_PARTNERS.title}
        </div>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {TRUST_OVER_TIME_FOR_PARTNERS.bullets.map(b => (
            <li key={b} style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 6 }}>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div style={{
        padding: "0.85rem 1rem",
        borderRadius: 12,
        border: "1px solid var(--border-strong)",
        background: "#06090B",
        marginBottom: "1rem",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
          {TRUST_OVER_TIME_VERIFY.label}
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT, lineHeight: 1.7 }}>
          {TRUST_OVER_TIME_VERIFY.api}
          <br />
          {TRUST_OVER_TIME_VERIFY.registry}
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem" }}>
        <Btn href={TRUST_OVER_TIME_VERIFY.docsHref} size="sm">
          Relying party docs →
        </Btn>
        <Btn href={TRUST_OVER_TIME_VERIFY.verifyHref} variant="secondary" size="sm">
          Public verifier →
        </Btn>
        <Link
          href="/integrate#counterparty-trust"
          style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", alignSelf: "center", textDecoration: "none" }}
        >
          Why counterparties trust it →
        </Link>
      </div>
    </section>
  );
}
