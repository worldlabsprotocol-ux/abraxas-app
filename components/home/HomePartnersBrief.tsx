"use client";
// FILE: components/home/HomePartnersBrief.tsx
// Integration partners — infrastructure social proof, owners secondary.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { PartnerExecutionCards } from "@/components/partners/PartnerExecutionCards";
import { partnersActiveLabel } from "@/lib/partnerStatus";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomePartnersBrief() {
  return (
    <section id="partners" aria-labelledby="partners-heading" className="home-partners" style={{
      padding: "clamp(1.25rem, 3vw, 2rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }}>
      <div className="abx-glass-panel" style={{
        padding: "clamp(1rem, 3vw, 1.35rem)",
        borderRadius: 16,
        border: "1px solid var(--border-strong)",
      }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          {partnersActiveLabel()}
        </div>
        <h2 id="partners-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h3)", fontWeight: 800,
          letterSpacing: "-0.02em", color: "var(--text-primary)",
          margin: "0 0 0.5rem", maxWidth: 640,
        }}>
          Relying parties · <span className="abx-gradient-text">live today</span>
        </h2>
        <p className="partners-body" style={{
          fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 640, margin: "0 0 1.1rem",
        }}>
          Cielo and {CPG_ASSET.name} accept Abraxas verification in production — proof the trust layer works outside first-party dogfood.
        </p>

        <div className="partners-cards">
          <PartnerExecutionCards />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "1.1rem", alignItems: "center" }}>
          <Btn href="/integrate" size="sm">Integrate Abraxas →</Btn>
          <Btn href="/integrations/relying-parties" variant="secondary" size="sm">Relying party program →</Btn>
          <Link href="/case-studies/cielo" className="partners-extra-link" style={{
            fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: "var(--accent)", textDecoration: "none",
          }}>
            Cielo case study →
          </Link>
        </div>
      </div>

      <div className="partners-owners" style={{ marginTop: "clamp(1.25rem, 3vw, 1.75rem)" }} aria-labelledby="issuers-heading">
        <h3 id="issuers-heading" style={{
          fontFamily: FONT, fontSize: "1.05rem", fontWeight: 800,
          color: "var(--text-primary)", margin: "0 0 0.45rem",
        }}>
          Issuing an asset?
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 560, margin: "0 0 0.85rem",
        }}>
          Self-serve owner launch syncs to the public registry — verification becomes reusable for every counterparty.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/portal/apply" variant="secondary" size="sm">Launch listing →</Btn>
          <Btn href="/operators" variant="ghost" size="sm">For operators →</Btn>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 640px) {
          .home-partners :global(.partners-body) {
            margin-bottom: 0.75rem;
          }
          .home-partners :global(.partners-cards) {
            display: none;
          }
          .home-partners :global(.partners-extra-link) {
            display: none;
          }
          .home-partners :global(.partners-owners) {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
