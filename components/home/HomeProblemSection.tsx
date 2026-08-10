"use client";
// FILE: components/home/HomeProblemSection.tsx
// The problem — why repeated identity collection creates friction and risk.

import { HOME_PROBLEM_BODY, HOME_PROBLEM_HEADLINE } from "@/lib/home/commercialHomeContent";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function HomeProblemSection() {
  return (
    <section aria-labelledby="home-problem-heading" className="abx-home-prose">
      <h2
        id="home-problem-heading"
        className="abx-home-section-title"
        style={{ fontFamily: FONT }}
      >
        {HOME_PROBLEM_HEADLINE}
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "clamp(0.95rem, 2.2vw, 1.05rem)",
          fontWeight: 500,
          color: "var(--text-secondary)",
          lineHeight: 1.7,
          margin: 0,
        }}
      >
        {HOME_PROBLEM_BODY}
      </p>
    </section>
  );
}
