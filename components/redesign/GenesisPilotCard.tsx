"use client";
// FILE: components/redesign/GenesisPilotCard.tsx
// Single compact Cielo showcase — one photo, no duplicate booking panel.

import Link from "next/link";
import { FLAGSHIP_PROPERTY } from "@/lib/data/flagshipProperty";
import { CIELO_PORCH_IMAGE } from "@/lib/data/cieloMedia";
import { CieloPhoto } from "@/components/cielo/CieloPhoto";
import { CIELO_ASSURANCE_CLAIMS } from "@/lib/assuranceTaxonomy";
import { AssuranceDrawer } from "@/components/compliance/AssuranceDrawer";
import { VerificationBadge } from "./VerificationBadge";
import { Btn } from "./ui";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const ACCENT = "#10B981";
const D = FLAGSHIP_PROPERTY;

export function GenesisPilotCard() {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
      gap: "1rem",
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid var(--border-strong)",
      background: "var(--surface-raised)",
    }}>
      <div style={{ position: "relative", minHeight: 240, background: "#06090B", aspectRatio: "4/3" }}>
        <CieloPhoto
          src={CIELO_PORCH_IMAGE.src}
          alt={CIELO_PORCH_IMAGE.alt}
          objectPosition="center 35%"
          style={{ position: "absolute", inset: 0, minHeight: "100%" }}
        />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(6,9,11,0.88) 0%, transparent 55%)",
          pointerEvents: "none",
        }} />
        <div style={{ position: "absolute", top: 12, left: 12 }}>
          <VerificationBadge label="Genesis pilot · L3 attested" color={ACCENT} check />
        </div>
      </div>

      <div style={{ padding: "1.15rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div>
          <div style={{
            fontFamily: FONT, fontSize: "0.62rem", fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase",
            color: "var(--text-muted)", marginBottom: "0.35rem",
          }}>
            Design partner pilot · not the whole registry
          </div>
          <h3 style={{ fontFamily: FONT, fontSize: "1.2rem", fontWeight: 800, margin: "0 0 0.35rem", color: "var(--text-primary)" }}>
            {D.title}
          </h3>
          <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.65, margin: 0 }}>
            $1.1M appraised · live Airbnb · book with Apple Pay or USDC on Sui.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "0.5rem" }}>
          {CIELO_ASSURANCE_CLAIMS.slice(0, 3).map(claim => (
            <AssuranceDrawer key={claim.label} claim={claim} compact />
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "auto" }}>
          <Btn href="/flagship" size="sm">Full dossier →</Btn>
          <Btn href={`/verify/${encodeURIComponent(D.id)}`} variant="secondary" size="sm">Verify asset</Btn>
          <Link href="/flagship" style={{
            fontFamily: FONT, fontSize: "0.72rem", fontWeight: 700,
            color: ACCENT, alignSelf: "center", textDecoration: "none",
          }}>
            Pay with Apple Pay →
          </Link>
        </div>
      </div>
    </div>
  );
}
