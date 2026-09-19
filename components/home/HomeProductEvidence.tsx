"use client";
// FILE: components/home/HomeProductEvidence.tsx
// Early product evidence: policy result, disclosure, receipt, partner verify, integrations.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

const EVIDENCE = [
  { title: "Policy result", body: "Approved or denied for the requested policy. Nothing extra.", href: "/docs/partner-flow" },
  { title: "Minimal disclosure", body: "Partners receive the result, not documents, wallets, or a profile.", href: "/docs/policy-packs" },
  { title: "Reusable receipt", body: "A signed receipt can be verified again without repeating capture.", href: "/verification" },
  { title: "Partner verification", body: "The server fetches the public receipt and grants the action.", href: "/docs/integration-kit" },
  { title: "Integrations", body: "Partner Flow, Passport, Solana, Good Trouble, and Circle testnet.", href: "/developers" },
] as const;

export function HomeProductEvidence() {
  return (
    <section aria-labelledby="home-evidence-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <h2
        id="home-evidence-heading"
        className="abx-home-section-title"
        style={{ marginBottom: "0.85rem", fontSize: "clamp(1rem, 2.5vw, 1.15rem)" }}
      >
        What the product proves
      </h2>
      <div
        style={{
          display: "grid",
          gap: "0.65rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          width: "100%",
          maxWidth: 860,
        }}
      >
        {EVIDENCE.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            style={{
              textDecoration: "none",
              textAlign: "left",
              padding: "0.9rem 1rem",
              borderRadius: 16,
              border: "1px solid rgba(45,212,191,0.22)",
              background: "linear-gradient(160deg, rgba(8,18,28,0.88) 0%, rgba(12,22,42,0.72) 100%)",
              boxShadow: "0 12px 40px rgba(2,8,18,0.35)",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800, color: "#F8FAFC", marginBottom: 6 }}>
              {item.title}
            </div>
            <p style={{ fontFamily: FONT, fontSize: "0.74rem", color: "#CBD5E1", lineHeight: 1.55, margin: 0 }}>
              {item.body}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
