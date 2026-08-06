"use client";
// FILE: components/home/HomeRoadmapBrief.tsx
// Current development milestones — public language, not internal engineering gates.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HOME_CURRENT_MILESTONES } from "@/lib/home/homeNarrative";

const FONT = ABRAXAS_FONT_SANS;

export function HomeRoadmapBrief() {
  return (
    <section aria-labelledby="home-roadmap-heading" id="roadmap" className="abx-home-section-center" style={{ width: "100%" }}>
      <div className="abx-home-intro">
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Current development
        </div>
        <h2 id="home-roadmap-heading" style={{
          fontFamily: FONT, fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 800,
          letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.75rem",
        }}>
          Now in production validation
        </h2>
      </div>
      <ol style={{
        margin: "0 auto 1rem",
        padding: 0,
        listStyle: "none",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
        maxWidth: 720,
        width: "100%",
      }}>
        {HOME_CURRENT_MILESTONES.map((milestone, index) => (
          <li
            key={milestone}
            style={{
              padding: "0.85rem 1rem",
              borderRadius: 12,
              background: "var(--surface-raised)",
              border: "1px solid var(--border-strong)",
              display: "flex",
              gap: "0.75rem",
              alignItems: "baseline",
              textAlign: "left",
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
              {milestone}
            </p>
          </li>
        ))}
      </ol>
      <Btn href="/roadmap" variant="secondary" size="sm">View development log</Btn>
    </section>
  );
}
