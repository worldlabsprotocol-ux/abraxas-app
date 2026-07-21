"use client";

import { Btn } from "@/components/redesign/ui";
import { EliteConceptDemo } from "@/components/home/ConceptDemoVideo";
import { PARTNERS_ELITE_DEMO } from "@/lib/eliteDemoSlides";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

/** Minimum proof demo — featured at top of homepage. */
export function HomeMinimumProofDemo() {
  return (
    <section
      id="minimum-proof"
      aria-labelledby="minimum-proof-heading"
      className="abx-home-section"
      style={{
        paddingTop: 0,
        paddingBottom: "clamp(2rem, 5vw, 3rem)",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "clamp(1.25rem, 3vw, 1.75rem)" }}>
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.45rem" }}>
          Partners · policy engine
        </div>
        <h2
          id="minimum-proof-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1.35rem, 3.5vw, 1.85rem)",
            fontWeight: 900,
            letterSpacing: "-0.04em",
            color: "var(--text-primary)",
            margin: "0 0 0.45rem",
            lineHeight: 1.15,
          }}
        >
          Minimum proof
        </h2>
        <p
          style={{
            fontFamily: FONT,
            fontSize: "0.88rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            maxWidth: 520,
            margin: "0 auto",
          }}
        >
          Separate attestations. Server-side gates. Portable trust — the verify layer partners actually need.
        </p>
      </div>

      <EliteConceptDemo config={PARTNERS_ELITE_DEMO} id="minimum-proof-demo" />

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          justifyContent: "center",
          marginTop: "1.25rem",
        }}
      >
        <Btn href="/integrate" size="sm">
          Integrate →
        </Btn>
        <Btn href="/mainnet" variant="secondary" size="sm">
          Mainnet scoreboard →
        </Btn>
      </div>
    </section>
  );
}
