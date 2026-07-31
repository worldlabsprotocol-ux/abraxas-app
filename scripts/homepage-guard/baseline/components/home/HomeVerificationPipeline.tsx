"use client";
// FILE: components/home/HomeVerificationPipeline.tsx
// How the protocol works — five steps from verification to Trust Decision.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";
import { HOME_PROTOCOL_STEPS } from "@/lib/home/homeNarrative";

const FONT = ABRAXAS_FONT_SANS;
const ACCENT = "#10B981";

export function HomeVerificationPipeline() {
  return (
    <section aria-labelledby="home-how-it-works" className="abx-home-section-center" style={{ width: "100%" }}>
      <div className="abx-home-intro">
        <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
          Protocol
        </div>
        <h2 id="home-how-it-works" style={{
          fontFamily: FONT, fontSize: "clamp(1.15rem, 3vw, 1.45rem)", fontWeight: 800,
          letterSpacing: "-0.03em", color: "var(--text-primary)", margin: "0 0 0.5rem",
        }}>
          How it works
        </h2>
        <p className="abx-home-section-lead">
          From one-time verification to a signed decision partners can rely on.
        </p>
      </div>
      <ol style={{
        margin: "0 auto",
        padding: 0,
        listStyle: "none",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
        maxWidth: 720,
        width: "100%",
      }}>
        {HOME_PROTOCOL_STEPS.map((item) => (
          <li
            key={item.step}
            style={{
              padding: "0.85rem 1rem",
              borderRadius: 12,
              background: "var(--surface-raised)",
              border: "1px solid var(--border-strong)",
              display: "flex",
              gap: "0.85rem",
              alignItems: "flex-start",
              textAlign: "left",
            }}
          >
            <span style={{
              fontFamily: FONT,
              fontSize: "0.72rem",
              fontWeight: 800,
              color: ACCENT,
              flexShrink: 0,
              width: "1.5rem",
              height: "1.5rem",
              borderRadius: "50%",
              border: `1px solid ${ACCENT}44`,
              background: `${ACCENT}12`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {item.step}
            </span>
            <div>
              <div style={{
                fontFamily: FONT,
                fontSize: "0.88rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "0.2rem",
                lineHeight: 1.4,
              }}>
                {item.label}
              </div>
              <p style={{
                fontFamily: FONT,
                fontSize: "0.78rem",
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}>
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
