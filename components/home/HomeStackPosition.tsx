"use client";
// FILE: components/home/HomeStackPosition.tsx

import { ABRAXAS_INFRA_POSITIONING } from "@/lib/infrastructurePositioning";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { STACK_ELITE_DEMO } from "@/lib/eliteDemoSlides";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeStackPosition() {
  return (
    <section
      id="stack"
      aria-labelledby="stack-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <EliteSectionLead
        eyebrow="Stack"
        title={
          <>
            <span id="stack-heading">Trust underneath </span>
            <span className="abx-gradient-text">everything</span>
          </>
        }
        headingId="stack-heading"
      />

      <EliteConceptDemo config={STACK_ELITE_DEMO} id="stack-demo" compact />

      <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-muted)", margin: "0.65rem 0 0", maxWidth: 480, lineHeight: 1.55 }}>
        {ABRAXAS_INFRA_POSITIONING}
      </p>
    </section>
  );
}
