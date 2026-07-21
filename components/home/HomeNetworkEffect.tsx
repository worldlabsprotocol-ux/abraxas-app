"use client";
// FILE: components/home/HomeNetworkEffect.tsx
// Compounding network — demo first, investor moat narrative.

import { RELYING_PARTY_NORTH_STAR } from "@/lib/positioningStrategy";
import { ConceptDemoLead, ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { NetworkEffectCinematicDemo } from "@/components/home/cinematic/NetworkEffectCinematicDemo";

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
      <ConceptDemoLead
        eyebrow="North star · relying party adoption"
        title={
          <>
            <span id="network-heading">Each app that accepts Passport makes the network </span>
            <span className="abx-gradient-text">more valuable</span>
          </>
        }
        body={RELYING_PARTY_NORTH_STAR}
      />

      <ConceptDemoVideo demo={NetworkEffectCinematicDemo} id="network-demo" />
    </section>
  );
}
