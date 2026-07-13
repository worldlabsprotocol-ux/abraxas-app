"use client";
// FILE: components/home/HomePartnersBrief.tsx
// Active partners — compact on mobile.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { PartnerExecutionCards } from "@/components/partners/PartnerExecutionCards";
import { partnersActiveLabel } from "@/lib/partnerStatus";
import { CPG_ASSET } from "@/lib/cpgLandCaseStudy";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomePartnersBrief() {
  return (
    <section id="partners" aria-labelledby="partners-heading" className="home-partners" style={{
      padding: "clamp(1.25rem, 3vw, 2rem) 0",
      borderTop: "1px solid var(--border-strong)",
    }}>
      <div style={{
        padding: "clamp(1rem, 3vw, 1.35rem)",
        borderRadius: 16,
        border: `1px solid ${ACCENT}33`,
        background: `linear-gradient(160deg, ${ACCENT}10 0%, var(--surface-raised) 45%, var(--surface) 100%)`,
      }}>
        <div style={{
          fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: ACCENT, marginBottom: "0.45rem",
        }}>
          {partnersActiveLabel()}
        </div>
        <h2 id="partners-heading" style={{
          fontFamily: FONT, fontSize: "var(--fs-h3)", fontWeight: 800,
          letterSpacing: "-0.02em", color: "var(--text-primary)",
          margin: "0 0 0.5rem", maxWidth: 640,
        }}>
          Live partners · verify once, integrate once
        </h2>
        <p className="partners-body" style={{
          fontFamily: FONT, fontSize: "0.84rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 640, margin: "0 0 1.1rem",
        }}>
          Cielo and {CPG_ASSET.name} prove the loop. Partners get yes or no — not document folders.
        </p>

        <div className="partners-cards">
          <PartnerExecutionCards />
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.55rem", marginTop: "1.1rem", alignItems: "center" }}>
          <Btn href="/operators" size="sm">For operators →</Btn>
          <Btn href="/design-partner" variant="secondary" size="sm">Design partner →</Btn>
          <Link href="/case-studies/cielo" className="partners-extra-link" style={{
            fontFamily: FONT, fontSize: "0.76rem", fontWeight: 700, color: ACCENT, textDecoration: "none",
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
          List your asset
        </h3>
        <p style={{
          fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
          lineHeight: 1.65, maxWidth: 560, margin: "0 0 0.85rem",
        }}>
          Publish to the registry in minutes — verify once, share everywhere.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          <Btn href="/portal/apply" variant="secondary" size="sm">Launch listing →</Btn>
          <Btn href="/build" variant="ghost" size="sm">Build →</Btn>
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
