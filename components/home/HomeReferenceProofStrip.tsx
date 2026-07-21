"use client";
// FILE: components/home/HomeReferenceProofStrip.tsx

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { CIELO_REGISTRY_IMAGE } from "@/lib/data/registryAssetImages";
import { CPG_ASSET, formatUsd, CPG_PRICING } from "@/lib/cpgLandCaseStudy";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { REFERENCE_ELITE_DEMO } from "@/lib/eliteDemoSlides";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

const REFERENCES = [
  {
    id: "cielo",
    name: "Cielo Sunrise",
    value: "$1.1M",
    image: CIELO_REGISTRY_IMAGE.src,
    href: "/case-studies/cielo",
  },
  {
    id: "chickasaw",
    name: CPG_ASSET.name,
    value: formatUsd(CPG_PRICING.lots234Bundle),
    image: CPG_ASSET.image,
    href: CPG_ASSET.caseStudyPath,
  },
] as const;

export function HomeReferenceProofStrip() {
  return (
    <section
      id="reference-proof"
      aria-labelledby="reference-proof-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <EliteSectionLead eyebrow="Proof" title={<span id="reference-proof-heading">Live references</span>} headingId="reference-proof-heading" />

      <EliteConceptDemo config={REFERENCE_ELITE_DEMO} id="reference-demo" compact />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: "0.65rem", margin: "0.75rem 0" }}>
        {REFERENCES.map(ref => (
          <Link
            key={ref.id}
            href={ref.href}
            className="abx-cosmic-card"
            style={{
              textDecoration: "none",
              color: "inherit",
              borderRadius: 14,
              overflow: "hidden",
              display: "grid",
              gridTemplateRows: "100px auto",
            }}
          >
            <div style={{ background: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.8)), url(${ref.image}) center/cover` }} />
            <div style={{ padding: "0.65rem 0.75rem" }}>
              <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 800 }}>{ref.name}</div>
              <div style={{ fontFamily: MONO, fontSize: "0.62rem", color: "var(--cosmic-cyan, var(--accent))", marginTop: 4 }}>{ref.value}</div>
            </div>
          </Link>
        ))}
      </div>

      <Btn href="/verify" variant="secondary" size="sm">Verify →</Btn>
    </section>
  );
}
