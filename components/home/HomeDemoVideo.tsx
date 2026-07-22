"use client";
// FILE: components/home/HomeDemoVideo.tsx
// Homepage demo — cinematic 7× verification debt → verify once → cryptographic proof.

import { HomeCinematicDemo } from "./HomeCinematicDemo";
import { ConceptDemoLead } from "./ConceptDemoVideo";
import {
  BLOCKCHAIN_ORIGINAL_THESIS,
  CINEMATIC_DEMO_LEAD,
} from "@/lib/intersectionThesis";

export function HomeDemoVideo() {
  return (
    <section
      id="demo"
      aria-labelledby="demo-heading"
      className="hero-demo-breakout"
      style={{
        margin: "clamp(1.25rem, 3vw, 2rem) 0 clamp(1.75rem, 4vw, 2.5rem)",
        width: "100%",
      }}
    >
      <ConceptDemoLead
        eyebrow="The problem"
        headingId="demo-heading"
        title={
          <>
            You verify <span style={{ color: "var(--accent)" }}>7×</span>. You should verify once.
          </>
        }
        body={`${CINEMATIC_DEMO_LEAD} ${BLOCKCHAIN_ORIGINAL_THESIS}`}
      />
      <HomeCinematicDemo hero />
      <style jsx>{`
        @media (min-width: 900px) {
          .hero-demo-breakout {
            width: min(1120px, calc(100% + 4rem));
            margin-left: auto;
            margin-right: auto;
          }
        }
      `}</style>
    </section>
  );
}
