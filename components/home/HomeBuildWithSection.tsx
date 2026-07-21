"use client";
// FILE: components/home/HomeBuildWithSection.tsx

import { Btn } from "@/components/redesign/ui";
import { BUILDER_PROOF_EXAMPLES } from "@/lib/positioningStrategy";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { EliteSectionLead } from "@/components/home/elite/EliteSectionLead";
import { BUILD_ELITE_DEMO } from "@/lib/eliteDemoSlides";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomeBuildWithSection() {
  return (
    <section
      id="build"
      aria-labelledby="build-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <EliteSectionLead
        eyebrow="Build"
        title={<span id="build-heading">Embed Passport</span>}
        headingId="build-heading"
      />

      <EliteConceptDemo config={BUILD_ELITE_DEMO} id="build-demo" />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))", gap: "0.45rem", margin: "0.75rem 0 1rem" }}>
        {BUILDER_PROOF_EXAMPLES.map(ex => (
          <a
            key={ex.name}
            href={ex.href}
            className="abx-cosmic-card"
            style={{
              display: "block",
              padding: "0.6rem 0.7rem",
              borderRadius: 12,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "0.76rem", fontWeight: 800, color: "var(--text-primary)" }}>{ex.name} →</div>
          </a>
        ))}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        <Btn href="/developers" size="lg">Docs →</Btn>
        <Btn href="/design-partner" variant="secondary" size="lg">Integrate →</Btn>
      </div>
    </section>
  );
}
