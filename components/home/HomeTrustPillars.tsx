"use client";
// FILE: components/home/HomeTrustPillars.tsx
// Four protocol pillars introduced after the problem statement.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const PILLARS = [
  {
    title: "Passport",
    href: "/passport",
    summary: "Sign in once. Wallet and identity anchor created automatically.",
    accent: "#10B981",
  },
  {
    title: "Biometrics",
    href: "/passport",
    summary: "Government ID, selfie, fraud screening, and human review when needed.",
    accent: "#A78BFA",
  },
  {
    title: "Trust Registry",
    href: "/docs/credential-portability",
    summary: "Reusable credentials partners can verify without asking users to upload documents again.",
    accent: "#38BDF8",
  },
  {
    title: "Assets",
    href: "/build",
    summary: "Tokenization workflow with compliance gates and due diligence stages.",
    accent: "#F59E0B",
  },
] as const;

export function HomeTrustPillars() {
  return (
    <section aria-labelledby="home-pillars-heading">
      <div className="abx-home-intro">
      <h2 id="home-pillars-heading" style={{
        fontFamily: FONT, fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.45rem",
      }}>
        How Abraxas solves it
      </h2>
      <p className="abx-home-section-lead">
        Four pillars work together so verification happens once and trust travels with the user.
      </p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.85rem" }}>
        {PILLARS.map(p => (
          <Link
            key={p.title}
            href={p.href}
            style={{
              display: "block", padding: "1.1rem 1.15rem", borderRadius: 14, textDecoration: "none",
              background: "var(--surface-raised)", border: "1px solid var(--border-strong)",
              transition: "border-color 0.15s",
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
