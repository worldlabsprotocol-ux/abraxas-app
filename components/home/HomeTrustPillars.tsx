"use client";
// FILE: components/home/HomeTrustPillars.tsx
// Four product pillars — Passport, Biometrics, Trust Registry, Asset Protocol.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const PILLARS = [
  {
    title: "Abraxas Passport",
    href: "/passport",
    bullets: ["Google sign-in", "Wallet created automatically", "Portable verification"],
    accent: "#10B981",
  },
  {
    title: "Biometric Engine",
    href: "/passport",
    bullets: ["Government ID + selfie", "Face match & liveness", "Fraud screening", "Human review when needed"],
    accent: "#A78BFA",
  },
  {
    title: "Trust Registry",
    href: "/docs/credential-portability",
    bullets: ["Reusable credentials", "Permissioned access", "On-chain attestations"],
    accent: "#38BDF8",
  },
  {
    title: "Asset Protocol",
    href: "/build",
    bullets: ["Tokenization workflow", "Compliance gates", "Due diligence pipeline"],
    accent: "#F59E0B",
  },
] as const;

export function HomeTrustPillars() {
  return (
    <section aria-labelledby="home-pillars-heading">
      <h2 id="home-pillars-heading" style={{
        fontFamily: FONT, fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 1rem",
      }}>
        Four pillars of the protocol
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.85rem" }}>
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
            <div style={{ fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: p.accent, marginBottom: "0.55rem" }}>
              {p.title}
            </div>
            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
              {p.bullets.map(b => (
                <li key={b} style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", lineHeight: 1.55, marginBottom: 3 }}>
                  {b}
                </li>
              ))}
            </ul>
          </Link>
        ))}
      </div>
    </section>
  );
}
