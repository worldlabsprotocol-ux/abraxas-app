"use client";
// FILE: components/home/HomeNetworkEffect.tsx
// Compounding network — investor moat narrative.

import { NETWORK_EFFECT_STEPS } from "@/lib/infrastructurePositioning";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeNetworkEffect() {
  return (
    <section
      id="network"
      aria-labelledby="network-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Network effect
      </div>
      <h2
        id="network-heading"
        style={{
          fontFamily: FONT,
          fontSize: "var(--fs-h2)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          margin: "0 0 1rem",
          maxWidth: 520,
        }}
      >
        Each participant makes every Passport{" "}
        <span className="abx-gradient-text">more valuable</span>
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
          gap: "0.65rem",
        }}
      >
        {NETWORK_EFFECT_STEPS.map(step => (
          <div
            key={step.step}
            style={{
              padding: "1rem 1.05rem",
              borderRadius: 14,
              border: "1px solid var(--border-strong)",
              background: "var(--surface-raised)",
            }}
          >
            <div
              style={{
                fontFamily: MONO,
                fontSize: "0.55rem",
                fontWeight: 700,
                letterSpacing: "0.1em",
                color: "var(--accent)",
                marginBottom: "0.4rem",
              }}
            >
              {step.step}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: "0.88rem",
                fontWeight: 800,
                color: "var(--text-primary)",
                marginBottom: "0.35rem",
                lineHeight: 1.25,
              }}
            >
              {step.title}
            </div>
            <p
              style={{
                fontFamily: FONT,
                fontSize: "0.74rem",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {step.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
