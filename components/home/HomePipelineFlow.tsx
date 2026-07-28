"use client";
// FILE: components/home/HomePipelineFlow.tsx
// Reusable step flow — vertical on mobile, horizontal on wide screens.

import { ABRAXAS_FONT_SANS } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = "'JetBrains Mono',monospace";

export interface PipelineStep {
  label: string;
  detail?: string;
}

export function HomePipelineFlow({ steps, compact }: { steps: PipelineStep[]; compact?: boolean }) {
  return (
    <div
      className="home-pipeline-flow"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: compact ? "0.35rem" : "0.5rem",
      }}
    >
      {steps.map((step, i) => (
        <div key={step.label} className="home-pipeline-step" style={{ display: "flex", alignItems: "stretch", gap: "0.65rem" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
            <div style={{
              width: 28, height: 28, borderRadius: "50%",
              background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: MONO, fontSize: "0.65rem", fontWeight: 800, color: "#10B981",
            }}>
              {i + 1}
            </div>
            {i < steps.length - 1 && (
              <div style={{ flex: 1, width: 2, minHeight: compact ? 12 : 20, background: "rgba(16,185,129,0.25)", margin: "2px 0" }} />
            )}
          </div>
          <div style={{ paddingBottom: i < steps.length - 1 ? (compact ? 8 : 12) : 0, flex: 1 }}>
            <div style={{ fontFamily: FONT, fontSize: compact ? "0.82rem" : "0.88rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {step.label}
            </div>
            {step.detail && (
              <div style={{ fontFamily: FONT, fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2, lineHeight: 1.45 }}>
                {step.detail}
              </div>
            )}
          </div>
        </div>
      ))}
      <style jsx>{`
        @media (min-width: 720px) {
          .home-pipeline-flow {
            flex-direction: row !important;
            align-items: flex-start;
            gap: 0 !important;
          }
          .home-pipeline-step {
            flex: 1;
            flex-direction: column !important;
            align-items: center !important;
            text-align: center;
            position: relative;
          }
          .home-pipeline-step:not(:last-child)::after {
            content: "→";
            position: absolute;
            right: -0.35rem;
            top: 10px;
            color: rgba(16, 185, 129, 0.55);
            font-size: 1rem;
            font-weight: 700;
          }
          .home-pipeline-step > div:first-child {
            flex-direction: row !important;
            width: auto !important;
          }
          .home-pipeline-step > div:first-child > div:last-child {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
