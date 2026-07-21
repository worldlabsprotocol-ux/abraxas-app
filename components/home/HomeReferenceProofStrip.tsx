"use client";
// FILE: components/home/HomeReferenceProofStrip.tsx
// Homepage proof strip — demo first, Cielo + Chickasaw reference cards.

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { CIELO_REGISTRY_IMAGE } from "@/lib/data/registryAssetImages";
import { CPG_ASSET, formatUsd, CPG_PRICING } from "@/lib/cpgLandCaseStudy";
import {
  HOME_REFERENCE_PROOF_BODY,
  HOME_REFERENCE_PROOF_DISCLAIMER,
  HOME_REFERENCE_PROOF_HEADLINE,
  REGISTRY_INSTITUTIONAL_BODY,
} from "@/lib/institutionalRegistry";
import { ConceptDemoLead, ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { ReferenceProofCinematicDemo } from "@/components/home/cinematic/ReferenceProofCinematicDemo";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const REFERENCES = [
  {
    id: "cielo",
    name: "Cielo Sunrise",
    class: "Hospitality · genesis pilot",
    location: "Mineral Bluff, Georgia",
    image: CIELO_REGISTRY_IMAGE.src,
    detail: "Verified guest policy · USDC settlement path · live STR",
    href: "/case-studies/cielo",
    verify: "/verify/ABX-RE-HOSP-001",
  },
  {
    id: "chickasaw",
    name: CPG_ASSET.name,
    class: "Land · reference diligence",
    location: "Grady County, Oklahoma",
    image: CPG_ASSET.image,
    detail: `~270 ac · from ${formatUsd(CPG_PRICING.lots234Bundle)} contiguous bundle`,
    href: CPG_ASSET.caseStudyPath,
    verify: CPG_ASSET.verifyPath,
  },
] as const;

export function HomeReferenceProofStrip() {
  return (
    <section
      id="reference-proof"
      aria-labelledby="reference-proof-heading"
      style={{
        paddingTop: "clamp(0.5rem, 2vw, 1rem)",
        paddingBottom: "clamp(1.25rem, 3vw, 2rem)",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <ConceptDemoLead
        eyebrow="Protocol reference"
        headingId="reference-proof-heading"
        title={HOME_REFERENCE_PROOF_HEADLINE}
        body={`${HOME_REFERENCE_PROOF_BODY} ${REGISTRY_INSTITUTIONAL_BODY}`}
      />

      <ConceptDemoVideo demo={ReferenceProofCinematicDemo} id="reference-demo" />

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
        gap: "0.85rem",
        marginBottom: "0.85rem",
      }}>
        {REFERENCES.map(ref => (
          <Link
            key={ref.id}
            href={ref.href}
            style={{
              textDecoration: "none",
              color: "inherit",
              borderRadius: 14,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "120px auto",
            }}
          >
            <div style={{
              background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.75) 100%), url(${ref.image}) center/cover`,
            }} />
            <div style={{ padding: "0.85rem 1rem" }}>
              <div style={{ fontFamily: MONO, fontSize: "0.48rem", color: "var(--accent)", letterSpacing: "0.08em", marginBottom: 4 }}>
                {ref.class.toUpperCase()}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {ref.name}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", marginBottom: 6 }}>
                {ref.location}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {ref.detail}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)",
        margin: "0 0 0.75rem", lineHeight: 1.5,
      }}>
        {HOME_REFERENCE_PROOF_DISCLAIMER}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/verify" variant="secondary" size="sm">How verification works →</Btn>
        <Btn href="/build" variant="ghost" size="sm">Position your asset →</Btn>
      </div>
    </section>
  );
}
