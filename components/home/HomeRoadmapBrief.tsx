"use client";
// FILE: components/home/HomeRoadmapBrief.tsx
// Public beta overview on the homepage — factual customer-facing copy only.

import { Btn } from "@/components/redesign/ui";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  AUDIENCE_PARTNER,
  HOME_BETA_READINESS_DISCLAIMER,
  HOME_BETA_READINESS_EYEBROW,
  HOME_BETA_READINESS_HEADING,
  HOME_BETA_READINESS_POINTS,
} from "@/lib/activation/activationCopy";

const FONT = ABRAXAS_FONT_SANS;

export function HomeRoadmapBrief() {
  return (
    <section aria-labelledby="home-beta-readiness-heading" id="how-it-works" className="abx-home-section-center" style={{ width: "100%" }}>
      <div className="abx-home-intro">
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        {HOME_BETA_READINESS_EYEBROW}
      </div>
      <h2 id="home-beta-readiness-heading" style={{
        fontFamily: FONT, fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 800,
        letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.75rem",
      }}>
        {HOME_BETA_READINESS_HEADING}
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
        {HOME_BETA_READINESS_POINTS.map((point, index) => (
          <li
            key={point}
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
              {point}
            </p>
          </li>
        ))}
      </ol>
      <p style={{
        fontFamily: FONT,
        fontSize: "0.78rem",
        color: "var(--text-muted)",
        margin: "0 auto 1rem",
        maxWidth: 720,
        lineHeight: 1.55,
      }}>
        {HOME_BETA_READINESS_DISCLAIMER}
      </p>
      <Btn href={AUDIENCE_PARTNER.href} variant="secondary" size="sm">{AUDIENCE_PARTNER.cta}</Btn>
    </section>
  );
}
