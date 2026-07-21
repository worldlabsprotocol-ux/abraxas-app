"use client";
// FILE: components/home/HomePartnersBrief.tsx

import Link from "next/link";
import { Btn } from "@/components/redesign/ui";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { PARTNERS_ELITE_DEMO } from "@/lib/eliteDemoSlides";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomePartnersBrief() {
  return (
    <section
      style={{ padding: "clamp(1.5rem, 4vw, 2.5rem) 0", borderTop: "1px solid var(--border-strong)" }}
      aria-labelledby="partners-heading"
    >
      <EliteSectionLead
        eyebrow="Partners"
        title={<span id="partners-heading">Minimum proof</span>}
        headingId="partners-heading"
      />

      <EliteConceptDemo config={PARTNERS_ELITE_DEMO} compact id="partners-demo" />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.65rem" }}>
        <Btn href="/design-partner" variant="secondary" size="sm">Relying party →</Btn>
        <Link href="/integrate" style={{ fontFamily: FONT, fontSize: "0.74rem", fontWeight: 700, color: "var(--accent)", alignSelf: "center", textDecoration: "none" }}>
          Integrate →
        </Link>
      </div>
    </section>
  );
}
