"use client";
// FILE: components/home/HomeWhyAbraxas.tsx
// Product explanation — reusable identity and policy-based eligibility proof.

import { COMPLIANCE_GATE_HONESTY } from "@/lib/complianceGatePositioning";
import {
  ABRAXAS_CORE_EXPLANATION,
  ABRAXAS_POLICY_QUESTION_EXAMPLE,
} from "@/lib/positioningStrategy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeWhyAbraxas() {
  return (
    <section aria-labelledby="home-why-heading" className="abx-home-prose">
      <h2
        id="home-why-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.85rem",
        }}
      >
        How Abraxas works
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          margin: "0 0 0.85rem",
        }}
      >
        {ABRAXAS_CORE_EXPLANATION}
      </p>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          margin: "0 0 0.65rem",
        }}
      >
        A person verifies once and receives an Abraxas Passport. When an approved partner
        needs to make a decision, it asks a specific policy question—for example:
      </p>
      <blockquote
        style={{
          margin: "0 0 0.85rem",
          padding: "0.75rem 1rem",
          borderLeft: "3px solid var(--accent)",
          fontFamily: FONT,
          fontSize: "clamp(0.92rem, 2.1vw, 1rem)",
          fontWeight: 600,
          fontStyle: "italic",
          color: "var(--text-primary)",
          lineHeight: 1.6,
          textAlign: "left",
          maxWidth: 560,
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {ABRAXAS_POLICY_QUESTION_EXAMPLE}
      </blockquote>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          margin: "0 0 0.65rem",
        }}
      >
        Abraxas evaluates the request against verified credentials and returns a signed,
        privacy-preserving receipt. The partner receives the answer required to make its
        decision—not another copy of identification documents or a complete identity profile.
      </p>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 600,
          color: "var(--text-primary)",
          lineHeight: 1.7,
          margin: "0 0 0.65rem",
        }}
      >
        Receipts can be independently validated, expired, audited, metered, and revoked.
      </p>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.78rem, 1.8vw, 0.88rem)",
          fontWeight: 500,
          color: "var(--text-muted, var(--text-secondary))",
          lineHeight: 1.6,
          margin: 0,
          opacity: 0.85,
        }}
      >
        {COMPLIANCE_GATE_HONESTY}
      </p>
    </section>
  );
}
