"use client";
// FILE: components/home/HomePartnersBrief.tsx

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { PARTNERS_ELITE_DEMO } from "@/lib/eliteDemoSlides";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomePartnersBrief() {
  return (
    <section
      style={{ padding: "clamp(1.5rem, 4vw, 2.5rem) 0", borderTop: "1px solid var(--border-strong)" }}
      aria-labelledby="partners-heading"
    >
      <EliteSectionLead
        eyebrow="Partners"
        title={<span id="partners-heading">Only ask for what you need</span>}
        headingId="partners-heading"
      />

      <EliteConceptDemo config={PARTNERS_ELITE_DEMO} compact id="partners-demo" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
        <Btn href="/design-partner" variant="secondary" size="sm">Apply to integrate</Btn>
        <Link href="/integrate" style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          How it works
        </Link>
      </div>
    </section>
  );
}
