"use client";
// FILE: components/home/HomeReusableComplianceStrip.tsx
// Position Abraxas at reusable age-gated / regulated retail compliance.

import Link from "next/link";
import {
  COMPLIANCE_GATE_EYEBROW,
  COMPLIANCE_GATE_HEADLINE,
  COMPLIANCE_GATE_HONESTY,
  COMPLIANCE_GATE_INSIGHT,
  COMPLIANCE_GATE_SUBLINE,
  COMPLIANCE_GATE_USE_CASES,
} from "@/lib/complianceGatePositioning";
import { ABRAXAS_FONT_DISPLAY, ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const DISPLAY = ABRAXAS_FONT_DISPLAY;

export function HomeReusableComplianceStrip() {
  return (
    <section
      id="compliance"
      aria-labelledby="compliance-heading"
      style={{
        padding: "clamp(1.5rem, 4vw, 2.25rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        {COMPLIANCE_GATE_EYEBROW}
      </div>
      <h2
        id="compliance-heading"
        style={{
          fontFamily: DISPLAY,
          fontSize: "clamp(1.25rem, 3.5vw, 1.85rem)",
          fontWeight: 900,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          margin: "0 0 0.65rem",
          maxWidth: 520,
        }}
      >
        {COMPLIANCE_GATE_HEADLINE}
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.88rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 0.75rem", maxWidth: 640,
      }}>
        {COMPLIANCE_GATE_SUBLINE}
      </p>
      <p style={{
        fontFamily: FONT, fontSize: "0.8rem", color: "var(--text-muted)",
        lineHeight: 1.6, margin: "0 0 1.1rem", maxWidth: 640,
      }}>
        {COMPLIANCE_GATE_INSIGHT}
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "0.65rem",
        marginBottom: "1rem",
      }}>
        {COMPLIANCE_GATE_USE_CASES.map(item => (
          <div
            key={item.label}
            style={{
              padding: "0.85rem 1rem",
              borderRadius: 12,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
            }}
          >
            <div style={{
              fontFamily: FONT, fontSize: "0.78rem", fontWeight: 700,
              color: "var(--text-primary)", marginBottom: 4,
            }}>
              {item.label}
            </div>
            <div style={{
              fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", lineHeight: 1.5,
            }}>
              {item.detail}
            </div>
          </div>
        ))}
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)",
        lineHeight: 1.55, margin: "0 0 0.75rem", maxWidth: 600,
      }}>
        {COMPLIANCE_GATE_HONESTY}
      </p>

      <Link
        href="/verification"
        style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
          color: "var(--accent)", textDecoration: "none", marginRight: "1rem",
        }}
      >
        Full verification layer →
      </Link>
      <Link
        href="/good-trouble"
        style={{
          fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
          color: "var(--accent)", textDecoration: "none",
        }}
      >
        See cannabis retail pilot →
      </Link>
    </section>
  );
}
