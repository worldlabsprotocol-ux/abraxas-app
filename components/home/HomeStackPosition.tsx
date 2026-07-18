"use client";
// FILE: components/home/HomeStackPosition.tsx
// Where Abraxas sits in the RWA stack — ecosystem positioning (Jeff Yan frame).

import { RWA_STACK_LAYERS, ABRAXAS_INFRA_POSITIONING } from "@/lib/infrastructurePositioning";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";

export function HomeStackPosition() {
  return (
    <section
      id="stack"
      aria-labelledby="stack-heading"
      style={{
        padding: "clamp(1.25rem, 3vw, 2rem) 0",
        borderBottom: "1px solid var(--border-strong)",
      }}
    >
      <div className="abx-eyebrow-violet" style={{ marginBottom: "0.5rem" }}>
        Ecosystem position
      </div>
      <h2
        id="stack-heading"
        style={{
          fontFamily: FONT,
          fontSize: "var(--fs-h2)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          lineHeight: 1.1,
          color: "var(--text-primary)",
          margin: "0 0 0.55rem",
          maxWidth: 560,
        }}
      >
        Who sits underneath{" "}
        <span className="abx-gradient-text">all of them?</span>
      </h2>
      <p
        style={{
          fontFamily: FONT,
          fontSize: "0.84rem",
          color: "var(--text-secondary)",
          lineHeight: 1.65,
          margin: "0 0 1.15rem",
          maxWidth: 620,
        }}
      >
        {ABRAXAS_INFRA_POSITIONING}
      </p>

      <div
        className="abx-glass-panel"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.55rem",
          padding: "clamp(0.85rem, 2vw, 1.1rem)",
          borderRadius: 16,
          border: "1px solid var(--border-strong)",
        }}
      >
        {[...RWA_STACK_LAYERS].reverse().map(layer => (
          <div
            key={layer.id}
            style={{
              padding: "0.85rem 1rem",
              borderRadius: 12,
              border: layer.highlight
                ? "1px solid rgba(232,197,71,0.45)"
                : "1px solid var(--border)",
              background: layer.highlight ? "rgba(232,197,71,0.08)" : "var(--surface)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
                flexWrap: "wrap",
                marginBottom: "0.35rem",
              }}
            >
              <div
                style={{
                  fontFamily: FONT,
                  fontSize: layer.highlight ? "0.92rem" : "0.82rem",
                  fontWeight: layer.highlight ? 800 : 700,
                  color: layer.highlight ? "var(--accent-pale)" : "var(--text-primary)",
                }}
              >
                {layer.label}
              </div>
              {layer.highlight && (
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "0.52rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    padding: "0.2rem 0.5rem",
                    borderRadius: 999,
                    border: "1px solid rgba(232,197,71,0.35)",
                  }}
                >
                  Abraxas
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: "0.58rem",
                color: layer.highlight ? "var(--accent-pale)" : "var(--text-muted)",
                marginBottom: "0.25rem",
              }}
            >
              {layer.examples}
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: "0.72rem",
                color: "var(--text-secondary)",
                lineHeight: 1.55,
              }}
            >
              {layer.role}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
