"use client";
// FILE: components/home/HomeAudiencePanels.tsx
// For people / For businesses — two concise panels.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import {
  SIMPLIFIED_AUDIENCE_BUSINESS,
  SIMPLIFIED_AUDIENCE_PEOPLE,
} from "@/lib/home/simplifiedHomeCopy";

const FONT = ABRAXAS_FONT_SANS;
const GOLD = "#E8C547";

const PANELS = [SIMPLIFIED_AUDIENCE_PEOPLE, SIMPLIFIED_AUDIENCE_BUSINESS] as const;

export function HomeAudiencePanels() {
  return (
    <section aria-labelledby="home-audience-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <h2 id="home-audience-heading" className="sr-only">
        Who Abraxas is for
      </h2>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))",
          gap: "1rem",
          maxWidth: 820,
          width: "100%",
          textAlign: "left",
        }}
      >
        {PANELS.map((panel) => (
          <article
            key={panel.title}
            style={{
              padding: "1.25rem 1.3rem",
              borderRadius: 16,
              border: `1px solid ${GOLD}22`,
              background: "rgba(232,197,71,0.04)",
            }}
          >
            <h3 style={{ margin: "0 0 0.45rem", fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: GOLD }}>
              {panel.title}
            </h3>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.86rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
              {panel.body}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
