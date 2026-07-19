"use client";
// FILE: components/home/HomeStackPosition.tsx
// Where Abraxas sits in the RWA stack — demo first.

import { ABRAXAS_INFRA_POSITIONING } from "@/lib/infrastructurePositioning";
import { ConceptDemoLead, ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { StackLayerCinematicDemo } from "@/components/home/cinematic/StackLayerCinematicDemo";

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
      <ConceptDemoLead
        eyebrow="Ecosystem position"
        title={
          <>
            <span id="stack-heading">Who sits underneath </span>
            <span className="abx-gradient-text">all of them?</span>
          </>
        }
        body={ABRAXAS_INFRA_POSITIONING}
      />

      <ConceptDemoVideo demo={StackLayerCinematicDemo} id="stack-demo" />
    </section>
  );
}
