"use client";

import { AbxCard } from "@/components/design/AbxPrimitives";
import { Btn } from "@/components/redesign/ui";
import { INSTITUTIONAL_JOURNEY_PATHS } from "@/lib/home/institutionalHomeCopy";
import { ABX_FONT_SANS, ABX_TYPOGRAPHY } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

export function HomeJourneyPaths() {
  return (
    <section aria-labelledby="journey-paths-heading" className="abx-institutional-section">
      <h2 id="journey-paths-heading" className="abx-institutional-section__title">
        Entry points
      </h2>
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {INSTITUTIONAL_JOURNEY_PATHS.map((path) => (
          <AbxCard key={path.id} accent={path.accent} padding="1.1rem 1.15rem">
            <h3 style={{ margin: "0 0 0.35rem", fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)", textAlign: "left" }}>
              {path.title}
            </h3>
            <p style={{ margin: "0 0 0.85rem", fontFamily: FONT, ...ABX_TYPOGRAPHY.body, color: "var(--text-secondary)", textAlign: "left" }}>
              {path.description}
            </p>
            <Btn href={path.href} size="sm">
              {path.cta}
            </Btn>
          </AbxCard>
        ))}
      </div>
    </section>
  );
}
