"use client";
// FILE: components/home/HomeVerifiedAssets.tsx
// Verified assets on the protocol — trust signals, not reference examples.

import Link from "next/link";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { VERIFIED_ASSET_CARDS, type EcosystemPartnerCard } from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

function AssetCard({ card }: { card: EcosystemPartnerCard }) {
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

export function HomeVerifiedAssets() {
  return (
    <section aria-labelledby="home-verified-assets-heading">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Verified assets
      </div>
      <h2
        id="home-verified-assets-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        Assets verified through Abraxas
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 640,
      }}>
        Protocol activity across industries — not tied to a single vertical.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
        {VERIFIED_ASSET_CARDS.map((card) => (
          <AssetCard key={card.id} card={card} />
        ))}
      </div>
    </section>
  );
}
