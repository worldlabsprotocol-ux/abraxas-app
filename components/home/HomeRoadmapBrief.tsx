"use client";
// FILE: components/home/HomeRoadmapBrief.tsx
// Current focus on the homepage — three objectives, not a manifesto.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { CURRENT_FOCUS } from "@/lib/positioningStrategy";

const FONT = ABRAXAS_FONT_SANS;

export function HomeRoadmapBrief() {
  return (
    <section aria-labelledby="home-roadmap-heading" id="roadmap">
      <p className="abx-section-label" style={{ marginBottom: "0.5rem" }}>
        Current focus
      </p>
      <h2 id="home-roadmap-heading" className="abx-home-h2" style={{ marginBottom: "0.75rem" }}>
        What we are shipping now
      </h2>
      <ol style={{
        margin: "0 0 1rem",
        padding: 0,
        listStyle: "none",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}>
        {CURRENT_FOCUS.map((objective, index) => (
          <li
            key={objective}
            style={{
              padding: "0.85rem 1rem",
              borderRadius: 12,
              background: "var(--surface-raised)",
              border: "1px solid var(--border-strong)",
              display: "flex",
              gap: "0.75rem",
              alignItems: "baseline",
            }}
          >
            <span style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 800,
              color: "var(--text-muted)",
              flexShrink: 0,
            }}>
              {index + 1}
            </span>
            <p style={{
              fontFamily: FONT,
              fontSize: "0.84rem",
              color: "var(--text-secondary)",
              margin: 0,
              lineHeight: 1.55,
            }}>
              {objective}
            </p>
          </li>
        ))}
      </ol>
      <Btn href="/roadmap" variant="secondary" size="sm">View full roadmap</Btn>
    </section>
  );
}
