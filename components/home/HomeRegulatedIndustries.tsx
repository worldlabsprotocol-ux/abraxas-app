"use client";
// FILE: components/home/HomeRegulatedIndustries.tsx
// Who Abraxas serves — same trust layer across regulated verticals.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { REGULATED_INDUSTRY_PILLARS } from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;

export function HomeRegulatedIndustries() {
  return (
    <section aria-labelledby="home-regulated-heading">
      <h2
        id="home-regulated-heading"
        style={{
          fontFamily: FONT,
          fontSize: "clamp(1.15rem, 3vw, 1.45rem)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          color: "var(--text-primary)",
          margin: "0 0 0.5rem",
        }}
      >
        Built for regulated industries
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.86rem", color: "var(--text-secondary)",
        lineHeight: 1.65, margin: "0 0 1rem", maxWidth: 640,
      }}>
        The same verification layer solves different regulatory problems: age eligibility, property
        ownership, wallet identity, and financial compliance.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem" }}>
        {REGULATED_INDUSTRY_PILLARS.map((item) => (
          <article
            key={item.id}
            style={{
              padding: "1rem 1.05rem",
              borderRadius: 12,
              background: "var(--surface-raised)",
              border: "1px solid var(--border-strong)",
            }}
          >
            <h3 style={{ fontFamily: FONT, fontSize: "0.9rem", fontWeight: 800, color: "var(--text-primary)", margin: "0 0 0.35rem" }}>
              {item.title}
            </h3>
            <p style={{ fontFamily: FONT, fontSize: "0.76rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
              {item.summary}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
