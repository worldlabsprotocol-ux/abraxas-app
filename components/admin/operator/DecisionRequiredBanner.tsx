"use client";
// FILE: components/admin/operator/DecisionRequiredBanner.tsx

import type { OperatorReviewState } from "@/lib/admin/operatorPresentation";

const FONT = "'Inter',system-ui,sans-serif";
const MONO = "'JetBrains Mono',monospace";

const STATE_COLORS: Record<OperatorReviewState, string> = {
  needs_review: "#F59E0B",
  waiting: "#94A3B8",
  blocked: "#F87171",
  escalated: "#FB923C",
  completed: "#10B981",
};

export function DecisionRequiredBanner({
  decisionPrompt,
  stateLabel,
  stateTone,
  reason,
  waitingLabel,
}: {
  decisionPrompt: string;
  stateLabel: string;
  stateTone: OperatorReviewState;
  reason: string;
  waitingLabel?: string | null;
}) {
  return (
    <div
      style={{
        marginBottom: "0.85rem",
        padding: "0.85rem 0.95rem",
        borderRadius: 10,
        border: `1px solid ${STATE_COLORS[stateTone]}44`,
        background: `${STATE_COLORS[stateTone]}12`,
      }}
    >
      <p style={{ fontFamily: MONO, fontSize: "0.58rem", letterSpacing: "0.08em", textTransform: "uppercase", color: STATE_COLORS[stateTone], margin: "0 0 0.35rem" }}>
        Decision required
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.84rem", fontWeight: 700, margin: "0 0 0.35rem", color: "#f0f0f0" }}>
        {decisionPrompt}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.74rem", margin: "0 0 0.25rem", color: "rgba(255,255,255,0.72)" }}>
        Current state: <strong>{stateLabel}</strong>
        {waitingLabel ? ` · ${waitingLabel}` : ""}
      </p>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", margin: 0, color: "rgba(255,255,255,0.58)", lineHeight: 1.5 }}>
        Why review: {reason}
      </p>
    </div>
  );
}
