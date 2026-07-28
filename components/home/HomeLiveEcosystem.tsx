"use client";
// FILE: components/home/HomeLiveEcosystem.tsx
// Live partner integrations — a living network, not a concept.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { LIVE_ECOSYSTEM_PARTNERS, type EcosystemPartnerCard } from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

function PartnerCard({ card }: { card: EcosystemPartnerCard }) {
  const inner = (
    <article
      style={{
        height: "100%",
        padding: "1rem 1.05rem",
        borderRadius: 12,
        background: card.status === "coming" ? "var(--surface)" : "var(--surface-raised)",
        border: `1px solid ${card.status === "coming" ? "var(--border)" : `${ACCENT}33`}`,
        opacity: card.status === "coming" ? 0.9 : 1,
      }}
    >
      <h3 style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
        {card.title}
      </h3>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
        {card.summary}
      </p>
    </article>
  );

  if (!card.href) return inner;
  return (
    <Link href={card.href} style={{ textDecoration: "none", color: "inherit", display: "block", height: "100%" }}>
      {inner}
    </Link>
  );
}

export function HomeLiveEcosystem() {
  return (
    <section aria-labelledby="home-ecosystem-heading" id="ecosystem">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Live ecosystem
      </div>
      <h2
        id="home-ecosystem-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        Partners already on the protocol
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 640,
      }}>
        Age verified once. Trusted everywhere. Reusable eligibility credentials work across cannabis,
        real estate, and identity. Not just one vertical.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
        {LIVE_ECOSYSTEM_PARTNERS.map((card) => (
          <PartnerCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
