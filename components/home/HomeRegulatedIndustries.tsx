"use client";
// FILE: components/home/HomeRegulatedIndustries.tsx
// Who Abraxas serves — same trust layer across regulated verticals.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { REGULATED_INDUSTRY_PILLARS } from "@/lib/home/ecosystemContent";

const FONT = ABRAXAS_FONT_SANS;

export function HomeRegulatedIndustries() {
  return (
    <section aria-labelledby="home-regulated-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <div className="abx-home-intro">
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
        Designed for permissioned applications
      </h2>
      <p className="abx-home-section-lead">
        The same eligibility layer supports age-gated commerce, gaming, financial products,
        tokenized assets, and digital marketplaces—without each partner collecting a complete
        identity profile again.
      </p>
      </div>
      <div className="abx-home-use-case-grid">
        {REGULATED_INDUSTRY_PILLARS.map((item) => (
          <article
            key={item.id}
            style={{
              padding: "1rem 1.05rem",
              borderRadius: 12,
              background: "var(--surface-raised)",
              border: "1px solid var(--border-strong)",
              textAlign: "center",
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
