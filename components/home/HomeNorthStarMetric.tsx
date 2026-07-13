"use client";
// FILE: components/home/HomeNorthStarMetric.tsx
// One metric everywhere — repeated verifications eliminated.

import { NORTH_STAR_METRIC } from "@/lib/reusableTrust";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeNorthStarMetric() {
  return (
    <section aria-label={NORTH_STAR_METRIC.name} style={{
      margin: "0 0 clamp(1rem, 2.5vw, 1.5rem)",
      padding: "0.75rem 1rem",
      borderRadius: 12,
      border: `1px solid ${ACCENT}44`,
      background: `${ACCENT}08`,
      display: "flex",
      flexWrap: "wrap",
      alignItems: "center",
      gap: "0.65rem 1.25rem",
    }}>
      <div>
        <div style={{
          fontFamily: MONO, fontSize: "0.52rem", fontWeight: 700,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: ACCENT,
        }}>
          North Star
        </div>
        <div style={{
          fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800,
          color: "var(--text-primary)", lineHeight: 1.25,
        }}>
          {NORTH_STAR_METRIC.shortLabel}
        </div>
      </div>
      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)",
        lineHeight: 1.55, margin: 0, flex: "1 1 200px", maxWidth: 480,
      }}>
        {NORTH_STAR_METRIC.description}
      </p>
    </section>
  );
}
