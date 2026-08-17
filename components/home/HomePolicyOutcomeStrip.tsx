"use client";
// FILE: components/home/HomePolicyOutcomeStrip.tsx
// Plain-language policy-outcome flow above the fold.

import { POLICY_OUTCOME_STEPS } from "@/lib/activation/activationCopy";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function HomePolicyOutcomeStrip() {
  return (
    <section aria-labelledby="home-policy-outcome-heading" className="abx-home-section-center" style={{ width: "100%" }}>
      <h2
        id="home-policy-outcome-heading"
        className="abx-home-section-title"
        style={{ marginBottom: "0.85rem", fontSize: "clamp(1rem, 2.5vw, 1.15rem)" }}
      >
        How it works
      </h2>
      <ol
        style={{
          listStyle: "none",
          margin: 0,
          padding: 0,
          display: "grid",
          gap: "0.65rem",
          maxWidth: 720,
          width: "100%",
        }}
      >
        {POLICY_OUTCOME_STEPS.map((step, index) => (
          <li
            key={step.title}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.75rem",
              alignItems: "start",
              padding: "0.85rem 1rem",
              borderRadius: 14,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
              textAlign: "left",
            }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: "0.72rem",
                fontWeight: 800,
                background: "rgba(16,185,129,0.12)",
                color: "#10B981",
                border: "1px solid rgba(16,185,129,0.3)",
                flexShrink: 0,
              }}
            >
              {index + 1}
            </span>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.88rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                {step.title}
              </div>
              <p style={{ fontFamily: FONT, fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                {step.body}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
