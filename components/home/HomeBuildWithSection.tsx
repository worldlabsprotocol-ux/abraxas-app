"use client";
// FILE: components/home/HomeBuildWithSection.tsx
// Developer-first — demo shows the integration loop, then depth.

import { Btn } from "@/components/redesign/ui";
import { BUILD_WITH_OUTCOMES, HOME_BUILD_BRIDGE } from "@/lib/infrastructurePositioning";
import { BUILDER_PROOF_EXAMPLES } from "@/lib/positioningStrategy";
import { ConceptDemoLead, ConceptDemoVideo } from "@/components/home/ConceptDemoVideo";
import { BuildIntegrateCinematicDemo } from "@/components/home/cinematic/BuildIntegrateCinematicDemo";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";

export function HomeBuildWithSection() {
  return (
    <section
      id="build"
      aria-labelledby="build-heading"
      style={{
        padding: "clamp(1.5rem, 4vw, 2.25rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <ConceptDemoLead
        eyebrow="Live proof · Cielo · Chickasaw reference"
        title="Build with Abraxas"
        body={HOME_BUILD_BRIDGE}
      />

      <ConceptDemoVideo demo={BuildIntegrateCinematicDemo} id="build-demo" />

      <div
        style={{
          padding: "clamp(1rem, 2.5vw, 1.35rem)",
          borderRadius: 16,
          border: "1px solid rgba(232,197,71,0.28)",
          background: "rgba(232,197,71,0.04)",
        }}
      >
        <p
          id="build-heading"
          style={{
            fontFamily: FONT,
            fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
            fontWeight: 700,
            color: "var(--text-secondary)",
            margin: "0 0 1rem",
            lineHeight: 1.4,
            maxWidth: 520,
          }}
        >
          Embed Passport into your application.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}>
          {BUILDER_PROOF_EXAMPLES.map(ex => (
            <a
              key={ex.name}
              href={ex.href}
              style={{
                display: "block",
                padding: "0.65rem 0.75rem",
                borderRadius: 10,
                border: "1px solid rgba(232,197,71,0.28)",
                background: "rgba(232,197,71,0.06)",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {ex.name} →
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.68rem", color: "var(--text-muted)", lineHeight: 1.45 }}>
                {ex.outcome}
              </div>
            </a>
          ))}
        </div>

        <ul
          style={{
            listStyle: "none",
            margin: "0 0 1.15rem",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
            gap: "0.5rem",
          }}
        >
          {BUILD_WITH_OUTCOMES.map(item => (
            <li
              key={item.label}
              style={{
                padding: "0.6rem 0.75rem",
                borderRadius: 10,
                background: "rgba(0,0,0,0.25)",
                border: "1px solid var(--border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", gap: "0.45rem" }}>
                <span style={{ color: "var(--accent)", fontWeight: 800, fontSize: "0.85rem", lineHeight: 1.4 }}>✓</span>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: "0.82rem", fontWeight: 700, color: "var(--text-primary)" }}>
                    {item.label}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>
                    {item.outcome}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem" }}>
          <Btn href="/developers" size="lg">
            Read docs →
          </Btn>
          <Btn href="/design-partner" variant="secondary" size="lg">
            Book integration →
          </Btn>
          <Btn href="/passport" variant="ghost" size="lg">
            Launch app →
          </Btn>
        </div>
      </div>
    </section>
  );
}
