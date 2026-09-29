"use client";
// FILE: components/demo/RelyingPartyProgressSteps.tsx

import { RELYING_PARTY_PILOT_STEPS, type RelyingPartyPilotStepId } from "@/lib/demo/relyingPartyPilot/contract";
import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;

export function RelyingPartyProgressSteps({ activeStep }: { activeStep: RelyingPartyPilotStepId }) {
  const activeIndex = RELYING_PARTY_PILOT_STEPS.findIndex((step) => step.id === activeStep);

  return (
    <ol style={{ display: "grid", gap: "0.45rem", padding: 0, margin: 0, listStyle: "none" }}>
      {RELYING_PARTY_PILOT_STEPS.map((step, index) => {
        const state = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
        return (
          <li
            key={step.id}
            style={{
              display: "grid",
              gridTemplateColumns: "1.6rem minmax(0, 1fr)",
              gap: "0.65rem",
              padding: "0.55rem 0.65rem",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: state === "active" ? "rgba(16,185,129,0.08)" : "var(--surface)",
            }}
          >
            <span style={{
              width: "1.6rem",
              height: "1.6rem",
              borderRadius: 999,
              display: "grid",
              placeItems: "center",
              fontFamily: FONT,
              fontWeight: 800,
              fontSize: "0.72rem",
              color: state === "pending" ? "var(--text-muted)" : "var(--accent)",
              background: state === "pending" ? "var(--surface-inset)" : "rgba(16,185,129,0.14)",
            }}
            >
              {index + 1}
            </span>
            <div>
              <div style={{ fontFamily: FONT, fontSize: "0.78rem", fontWeight: 800, color: "var(--text-primary)" }}>
                {step.label}
              </div>
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
                {step.detail}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
