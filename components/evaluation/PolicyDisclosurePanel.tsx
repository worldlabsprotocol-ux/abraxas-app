"use client";
// FILE: components/evaluation/PolicyDisclosurePanel.tsx
// Shows what each relying app receives vs what stays protected.

import { policyPackDisclosureForEval } from "@/lib/partner/twoAppEvaluation/evaluationUx";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

const body: React.CSSProperties = {
  fontFamily: FONT,
  fontSize: "0.84rem",
  lineHeight: 1.65,
  color: "var(--text-secondary)",
  margin: 0,
};

export function PolicyDisclosurePanel({ packId }: { packId: string }) {
  const disclosure = policyPackDisclosureForEval(packId);
  if (!disclosure) return null;

  return (
    <div
      style={{
        display: "grid",
        gap: "0.65rem",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
      }}
      aria-label="Privacy disclosure for evaluation policy"
    >
      <div style={{ padding: "0.75rem", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-inset)" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.68rem", fontWeight: 800, color: "#2DD4BF", marginBottom: "0.35rem" }}>
          Shared with each application
        </div>
        <p style={{ ...body, color: "var(--text-primary)", fontWeight: 600 }}>{disclosure.receives}</p>
      </div>
      <div style={{ padding: "0.75rem", borderRadius: 12, border: "1px solid var(--border)", background: "var(--surface-inset)" }}>
        <div style={{ fontFamily: MONO, fontSize: "0.68rem", fontWeight: 800, color: "var(--text-muted)", marginBottom: "0.35rem" }}>
          Not shared with relying apps
        </div>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: "0.25rem" }}>
          {disclosure.withheld.map((item) => (
            <li key={item} style={body}>{item}</li>
          ))}
        </ul>
        <p style={{ ...body, fontSize: "0.72rem", marginTop: "0.5rem", color: "var(--text-muted)" }}>
          Abraxas may retain verification records under your agreement. This panel describes partner-facing disclosure only.
        </p>
      </div>
    </div>
  );
}
