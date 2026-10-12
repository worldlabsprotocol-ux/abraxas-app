"use client";

import { INTEGRATION_STUDIO_GUIDED_STEPS } from "@/lib/product/integrationStudioGuidedCopy";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function IntegrationStudioGuidedStrip() {
  return (
    <section
      aria-label="Integration Studio steps"
      style={{
        marginBottom: "1.25rem",
        padding: "1rem 1.05rem",
        borderRadius: 14,
        border: "1px solid var(--border)",
        background: "var(--surface-inset)",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, margin: "0 0 0.65rem", color: "var(--text-primary)" }}>
        Guided path
      </p>
      <ol style={{ margin: 0, paddingLeft: "1.15rem", display: "grid", gap: "0.65rem" }}>
        {INTEGRATION_STUDIO_GUIDED_STEPS.map((step, index) => (
          <li key={step.id} style={{ fontFamily: FONT, fontSize: "0.76rem", lineHeight: 1.6, color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>
              {index + 1}. {step.title}
            </strong>
            {" — "}
            {step.why} {step.now}
            <span style={{ display: "block", marginTop: "0.2rem", color: "var(--text-muted)", fontSize: "0.72rem" }}>
              Next: {step.next}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
