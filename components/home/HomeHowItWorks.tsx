"use client";
// FILE: components/home/HomeHowItWorks.tsx
// Three-step how-it-works cards.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { SIMPLIFIED_HOW_IT_WORKS } from "@/lib/home/simplifiedHomeCopy";

const FONT = ABRAXAS_FONT_SANS;
const TEAL = "#2DD4BF";

export function HomeHowItWorks() {
  return (
    <section aria-labelledby="home-how-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <h2
        id="home-how-heading"
        className="abx-home-section-title"
        style={{ marginBottom: "1.25rem", fontSize: "clamp(1.1rem, 2.8vw, 1.35rem)" }}
      >
        How it works
      </h2>
      <ul
        aria-label="How Abraxas works"
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: "1rem",
          maxWidth: 900,
          width: "100%",
          textAlign: "left",
        }}
      >
        {SIMPLIFIED_HOW_IT_WORKS.map((step, index) => (
          <li
            key={step.id}
            style={{
              padding: "1.15rem 1.2rem",
              borderRadius: 16,
              background: "rgba(12,14,24,0.55)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", marginBottom: "0.5rem" }}>
              <span
                aria-hidden="true"
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontFamily: FONT,
                  fontWeight: 800,
                  fontSize: "0.75rem",
                  color: "#04130f",
                  background: `linear-gradient(135deg, ${TEAL}, #14b8a6)`,
                }}
              >
                {index + 1}
              </span>
              <h3 style={{ margin: 0, fontFamily: FONT, fontSize: "0.95rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {step.title}
              </h3>
            </div>
            <p style={{ margin: 0, fontFamily: FONT, fontSize: "0.84rem", lineHeight: 1.55, color: "var(--text-secondary)" }}>
              {step.body}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
