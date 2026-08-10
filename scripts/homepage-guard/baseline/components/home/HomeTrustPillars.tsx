"use client";
// FILE: components/home/HomeTrustPillars.tsx
// Three product pillars — reusable identity, policy-based proof, verifiable outcomes.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const PILLARS = [
  {
    title: "Reusable identity",
    href: "/passport",
    summary: "Verify once and reuse an Abraxas Passport across approved applications.",
    accent: "#10B981",
  },
  {
    title: "Policy-based proof",
    href: "/docs/partner-flow",
    summary: "Partners ask specific eligibility questions instead of requesting an entire identity profile.",
    accent: "#A78BFA",
  },
  {
    title: "Verifiable outcomes",
    href: "/docs/credential-portability",
    summary: "Signed receipts can be independently checked, metered, expired, audited, and revoked.",
    accent: "#38BDF8",
  },
] as const;

export function HomeTrustPillars() {
  return (
    <section aria-labelledby="home-pillars-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <div className="abx-home-intro">
      <h2 id="home-pillars-heading" style={{
        fontFamily: FONT, fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.45rem",
      }}>
        What Abraxas provides
      </h2>
      <p className="abx-home-section-lead">
        Designed for permissioned eligibility decisions—share only what a policy requires to answer.
      </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem", maxWidth: 960, margin: "0 auto", width: "100%" }}>
        {PILLARS.map(p => (
          <Link
            key={p.title}
            href={p.href}
            style={{
              display: "block", padding: "1.1rem 1.15rem", borderRadius: 14, textDecoration: "none",
              background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
              transition: "border-color 0.15s", textAlign: "center",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: p.accent, marginBottom: "0.45rem" }}>
              {p.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, margin: 0 }}>
              {p.summary}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
