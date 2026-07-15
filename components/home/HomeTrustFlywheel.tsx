"use client";
// FILE: components/home/HomeTrustFlywheel.tsx
// Network effect — why Abraxas becomes more valuable over time.

import { TRUST_FLYWHEEL_STEPS } from "@/lib/reusableTrust";

const FONT = "'Inter',system-ui,-apple-system,sans-serif";
const MONO = "'JetBrains Mono','SF Mono',ui-monospace,monospace";
const ACCENT = "#10B981";

export function HomeTrustFlywheel({ embedded }: { embedded?: boolean }) {
  return (
    <section id={embedded ? undefined : "flywheel"} aria-labelledby="flywheel-heading" style={{
      padding: embedded ? 0 : "clamp(1.25rem, 3vw, 2rem) 0",
      borderTop: embedded ? "none" : "1px solid var(--border-strong)",
    }}>
      <p style={{
        fontFamily: MONO, fontSize: "0.55rem", fontWeight: 700,
        letterSpacing: "0.12em", textTransform: "uppercase",
        color: ACCENT, margin: "0 0 0.45rem",
      }}>
        Network effect
      </p>
      <h2 id="flywheel-heading" style={{
        fontFamily: FONT, fontSize: "var(--fs-h2)", fontWeight: 800,
        letterSpacing: "-0.02em", color: "var(--text-primary)",
        margin: "0 0 0.35rem", maxWidth: 560, lineHeight: 1.15,
      }}>
        The reusable trust flywheel
      </h2>
      <p style={{
        fontFamily: FONT, fontSize: "0.82rem", color: "var(--text-secondary)",
        lineHeight: 1.65, maxWidth: 520, margin: "0 0 1.15rem",
      }}>
        Every verification completed once should reduce friction for the next transaction. That compounding loop is the network.
      </p>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
        gap: "0.5rem",
        maxWidth: 720,
      }}>
        {TRUST_FLYWHEEL_STEPS.map((step, i) => (
          <div key={step.id} style={{ position: "relative" }}>
            <div style={{
              padding: "0.75rem 0.85rem", borderRadius: 12, height: "100%",
              border: `1px solid ${i === 0 || i === TRUST_FLYWHEEL_STEPS.length - 1 ? `${ACCENT}55` : "var(--border)"}`,
              background: i === 0 || i === TRUST_FLYWHEEL_STEPS.length - 1 ? `${ACCENT}10` : "var(--surface-raised)",
            }}>
              <div style={{
                fontFamily: MONO, fontSize: "0.48rem", color: "var(--text-muted)",
                marginBottom: 4,
              }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800,
                color: "var(--text-primary)", marginBottom: "0.25rem", lineHeight: 1.25,
              }}>
                {step.label}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: "0.65rem", color: "var(--text-muted)", lineHeight: 1.45,
              }}>
                {step.outcome}
              </div>
            </div>
            {i < TRUST_FLYWHEEL_STEPS.length - 1 && (
              <span aria-hidden style={{
                display: "none",
              }} />
            )}
          </div>
        ))}
      </div>

      <p style={{
        fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)",
        margin: "1rem 0 0", lineHeight: 1.55, maxWidth: 520,
      }}>
        More reuse → lower cost → more partners → more places proof works → more users verify once.
      </p>
    </section>
  );
}
