"use client";
// FILE: components/home/HomeNetworkEffect.tsx

import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { NETWORK_ELITE_DEMO } from "@/lib/eliteDemoSlides";

export function HomeNetworkEffect() {
  return (
    <section
      id="network"
      aria-labelledby="network-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <EliteSectionLead
        eyebrow="Network"
        title={
          <>
            <span id="network-heading">Trust </span>
            <span className="abx-gradient-text">spreads</span>
          </>
        }
        headingId="network-heading"
      />

      <EliteConceptDemo config={NETWORK_ELITE_DEMO} id="network-demo" compact />
    </section>
  );
}
