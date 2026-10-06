"use client";
// FILE: components/evaluation/EvaluationProgressStrip.tsx
// Compact orientation strip for multi-step sandbox evaluation.

import type { EvaluationProgressStep } from "@/lib/partner/twoAppEvaluation/evaluationUx";
import { ABRAXAS_FONT_SANS, ABRAXAS_FONT_MONO } from "@/lib/abraxasTypography";

const FONT = ABRAXAS_FONT_SANS;
const MONO = ABRAXAS_FONT_MONO;

export function EvaluationProgressStrip({
  steps,
  stageLabel,
}: {
  steps: EvaluationProgressStep[];
  stageLabel: string;
}) {
  return (
    <div
      role="list"
      aria-label="Evaluation progress"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.35rem 0.5rem",
        padding: "0.65rem 0.75rem",
        borderRadius: 12,
        border: "1px solid var(--border)",
        background: "var(--surface-inset)",
      }}
    >
      <span
        style={{
          fontFamily: FONT,
          fontSize: "0.68rem",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--text-muted)",
          marginRight: "0.25rem",
        }}
      >
        {stageLabel}
      </span>
      {steps.map((step, index) => {
        const color =
          step.status === "complete"
            ? "#2DD4BF"
            : step.status === "current"
              ? "var(--accent)"
              : "var(--text-muted)";
        return (
          <div key={step.id} role="listitem" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
            {index > 0 && (
              <span aria-hidden style={{ color: "var(--border)", fontFamily: MONO, fontSize: "0.65rem" }}>
                →
              </span>
            )}
            <span
              style={{
                fontFamily: FONT,
                fontSize: "0.72rem",
                fontWeight: step.status === "current" ? 800 : 600,
                color,
                padding: "0.2rem 0.45rem",
                borderRadius: 999,
                border: `1px solid ${step.status === "upcoming" ? "var(--border)" : `${color}55`}`,
                background: step.status === "upcoming" ? "transparent" : `${color}12`,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
