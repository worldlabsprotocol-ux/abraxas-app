"use client";
// FILE: components/home/HomePartnerProof.tsx
// Compact partner proof — authorized public names only.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  HOME_PARTNER_PROOF_CTA,
  HOME_PARTNER_PROOF_HEADING,
  HOME_PARTNER_PROOF_SUBHEAD,
  resolveHomePartnerProofCards,
} from "@/lib/home/partnerProof";
import { PUBLIC_SURFACE } from "@/lib/design/publicSurface";

const FONT = ABRAXAS_FONT_SANS;
const GOLD = "#E8C547";

export function HomePartnerProof() {
  const cards = resolveHomePartnerProofCards();

  return (
    <section aria-labelledby="home-partner-proof-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <h2
        id="home-partner-proof-heading"
        className="abx-home-section-title"
        style={{ marginBottom: "0.55rem", fontSize: "clamp(1.1rem, 2.8vw, 1.35rem)" }}
      >
        {HOME_PARTNER_PROOF_HEADING}
      </h2>
      <p style={{
        fontFamily: FONT,
        fontSize: PUBLIC_SURFACE.bodySize,
        lineHeight: PUBLIC_SURFACE.bodyLineHeight,
        color: "var(--text-secondary)",
        margin: "0 auto 1.25rem",
        maxWidth: 640,
      }}>
        {HOME_PARTNER_PROOF_SUBHEAD}
      </p>

      <div style={{ display: "grid", gap: "0.85rem", maxWidth: 560, width: "100%", margin: "0 auto" }}>
        {cards.map((card) => (
          <article
            key={card.title}
            style={{
              padding: PUBLIC_SURFACE.cardPadding,
              borderRadius: PUBLIC_SURFACE.cardRadius,
              border: `1px solid ${GOLD}33`,
              background: `${GOLD}08`,
              textAlign: "left",
            }}
          >
            <p style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700, color: GOLD, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {card.badge}
            </p>
            <h3 style={{ margin: "0 0 0.4rem", fontFamily: FONT, fontSize: "0.98rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {card.title}
            </h3>
            <p style={{ margin: "0 0 0.85rem", fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
              {card.summary}
            </p>
            <Link
              href={card.journeyHref}
              style={{
                fontFamily: FONT,
                fontSize: "0.82rem",
                fontWeight: 700,
                color: "var(--accent)",
                textDecoration: "none",
              }}
            >
              {HOME_PARTNER_PROOF_CTA} →
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
