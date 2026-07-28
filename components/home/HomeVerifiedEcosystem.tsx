"use client";
// FILE: components/home/HomeVerifiedEcosystem.tsx
// Verified ecosystem — live partners and integrations on the protocol.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { VERIFIED_ECOSYSTEM_CARDS, type EcosystemPartnerCard } from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

function EcosystemCard({ card }: { card: EcosystemPartnerCard }) {
  const inner = (
    <article
      style={{
        height: "100%",
        padding: "1rem 1.05rem",
        borderRadius: 12,
        background: "var(--surface-raised)",
        border: "1px solid var(--border-strong)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.35rem" }}>
        <span style={{ fontSize: "1.1rem" }} aria-hidden>{card.icon}</span>
        <h3 style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
          {card.title}
        </h3>
      </div>
      <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: ACCENT, margin: 0, fontWeight: 700 }}>
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

export function HomeVerifiedEcosystem() {
  return (
    <section aria-labelledby="home-verified-ecosystem-heading">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Verified ecosystem
      </div>
      <h2
        id="home-verified-ecosystem-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        Trusted network on the protocol
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 640,
      }}>
        From Cielo Sunrise — the genesis proof — to cannabis eligibility and land diligence. One protocol,
        multiple regulated industries.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
        {VERIFIED_ECOSYSTEM_CARDS.map((card) => (
          <EcosystemCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
