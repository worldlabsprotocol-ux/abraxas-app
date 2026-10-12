"use client";
// FILE: components/home/HomeProductEvidence.tsx
// Evidence-backed product capabilities — links to real docs and tools.

import Link from "next/link";
import { AbxCard } from "@/components/design/AbxPrimitives";
import { ABX_FONT_SANS, ABX_TYPOGRAPHY } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

const EVIDENCE = [
  { title: "Policy result", body: "Approved or denied for the requested policy. Nothing extra.", href: "/docs/partner-flow" },
  { title: "Minimal disclosure", body: "Partners receive the result, not documents, wallets, or a profile.", href: "/docs/policy-packs" },
  { title: "Reusable receipt", body: "A signed receipt can be verified again without repeating capture.", href: "/verification" },
  { title: "Partner verification", body: "The server fetches the public receipt and grants the action.", href: "/docs/integration-kit" },
  { title: "Integrations", body: "Partner Flow, Passport, sandbox merchants, and labeled devnet proofs.", href: "/developers" },
] as const;

export function HomeProductEvidence() {
  return (
    <section aria-labelledby="home-evidence-heading" className="abx-institutional-section">
      <h2 id="home-evidence-heading" className="abx-institutional-section__title">
        What you can verify in the product
      </h2>
      <div
        style={{
          display: "grid",
          gap: "0.65rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          width: "100%",
        }}
      >
        {EVIDENCE.map((item) => (
          <Link key={item.title} href={item.href} style={{ textDecoration: "none", color: "inherit" }}>
            <AbxCard accent="verify" padding="0.95rem 1rem" style={{ height: "100%" }}>
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: "0.84rem",
                  fontWeight: 800,
                  color: "var(--text-primary)",
                  marginBottom: 6,
                  textAlign: "left",
                }}
              >
                {item.title}
              </div>
              <p
                style={{
                  fontFamily: FONT,
                  fontSize: ABX_TYPOGRAPHY.small.fontSize,
                  color: "var(--text-secondary)",
                  lineHeight: ABX_TYPOGRAPHY.small.lineHeight,
                  margin: 0,
                  textAlign: "left",
                }}
              >
                {item.body}
              </p>
            </AbxCard>
          </Link>
        ))}
      </div>
    </section>
  );
}
