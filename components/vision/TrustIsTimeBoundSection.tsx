"use client";
// FILE: components/vision/TrustIsTimeBoundSection.tsx
// Premium trust-over-time — deed analogy, refresh triggers, verify paths.

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
      <div
        className="abx-glass-panel"
        style={{
          padding: "clamp(1.25rem, 3vw, 1.75rem)",
          borderRadius: 20,
          border: "1px solid rgba(16,185,129,0.22)",
          background: "linear-gradient(165deg, rgba(16,185,129,0.08) 0%, var(--surface-raised) 50%, rgba(10,8,20,0.35) 100%)",
          boxShadow: "var(--shadow-soft)",
          marginBottom: "1.25rem",
        }}
      >
        <div style={{
          fontFamily: MONO, fontSize: "0.58rem", fontWeight: 700,
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          How verification stays current
        </div>
        <h2
          id="trust-over-time-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.35rem, 3.5vw, var(--fs-h2))",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            lineHeight: 1.12,
            color: "var(--text-primary)",
            margin: "0 0 0.55rem",
            maxWidth: 560,
          }}
        >
          {TRUST_IS_TIME_BOUND_HEADLINE}
        </h2>
        <p style={{
          fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)",
          lineHeight: 1.7, maxWidth: 640, margin: 0,
        }}>
          {TRUST_IS_TIME_BOUND_SUBHEAD}
        </p>
      </div>

      <div
        style={{
          padding: "1.15rem 1.25rem",
          borderRadius: 16,
          border: "1px solid var(--border-strong)",
          background: "var(--surface)",
          marginBottom: "1.25rem",
        }}
      >
        <p style={{ fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.8, margin: "0 0 0.75rem" }}>
          {TRUST_DEED_ANALOGY}
        </p>
        <p style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
          {TRUST_VERIFY_ONCE_HONEST}
        </p>
        <p style={{ fontFamily: MONO, fontSize: "0.58rem", color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          {TRUST_FAIL_CLOSED}
        </p>
      </div>

      <h3 style={{ fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
        What triggers refresh — real estate & land
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.65, margin: "0 0 0.85rem", maxWidth: 560 }}>
        Recorded events — not random re-KYC. Sale, lien, and appraisal expiry are natural checkpoints.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
        gap: "0.5rem",
        marginBottom: "1.25rem",
      }}>
        {REAL_ESTATE_REFRESH_TRIGGERS.map(row => (
          <div
            key={row.event}
            style={{
              padding: "0.85rem 0.95rem",
              borderRadius: 14,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.8rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
              {row.event}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 6 }}>
              {row.action}
            </div>
            <div style={{ fontFamily: FONT, fontSize: "0.66rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              {row.why}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        padding: "1rem 1.15rem",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        marginBottom: "1rem",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: "0.5rem" }}>
          {TRUST_OVER_TIME_FOR_PARTNERS.title}
        </div>
        <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
          {TRUST_OVER_TIME_FOR_PARTNERS.bullets.map(b => (
            <li key={b} style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, marginBottom: 6 }}>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div style={{
        padding: "1rem 1.15rem",
        borderRadius: 14,
        border: "1px solid var(--border-strong)",
        background: "#06090B",
        marginBottom: "1.15rem",
      }}>
        <div style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-primary)", marginBottom: "0.45rem" }}>
          {TRUST_OVER_TIME_VERIFY.label}
        </div>
        <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: ACCENT, lineHeight: 1.75 }}>
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
          href="/roadmap#mainnet-readiness"
          style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--text-muted)", alignSelf: "center", textDecoration: "none" }}
        >
          Mainnet gates →
        </Link>
      </div>
    </section>
  );
}
