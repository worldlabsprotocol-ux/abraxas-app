"use client";

import { AbxCard } from "@/components/design/AbxPrimitives";
import { INSTITUTIONAL_TRUST_BOUNDARIES } from "@/lib/home/institutionalHomeCopy";
import { ABX_FONT_SANS, ABX_TYPOGRAPHY } from "@/lib/design/abraxasDesignSystem";

const FONT = ABX_FONT_SANS;

export function TrustBoundaryPanel() {
  return (
    <section aria-labelledby="trust-boundaries-heading" className="abx-institutional-section">
      <h2
        id="trust-boundaries-heading"
        style={{
          margin: "0 0 0.85rem",
          fontFamily: FONT,
          fontSize: "var(--fs-h2)",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: "var(--text-primary)",
          textAlign: "left",
        }}
      >
        Architecture & trust boundaries
      </h2>
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        }}
      >
        {INSTITUTIONAL_TRUST_BOUNDARIES.map((row) => (
          <AbxCard key={row.id} accent="neutral" padding="1rem 1.05rem">
            <h3
              style={{
                margin: "0 0 0.35rem",
                fontFamily: FONT,
                fontSize: "0.88rem",
                fontWeight: 700,
                color: "var(--text-primary)",
              }}
            >
              {row.title}
            </h3>
            <p
              style={{
                margin: 0,
                fontFamily: FONT,
                ...ABX_TYPOGRAPHY.body,
                color: "var(--text-secondary)",
              }}
            >
              {row.body}
            </p>
          </AbxCard>
        ))}
      </div>
    </section>
  );
}
