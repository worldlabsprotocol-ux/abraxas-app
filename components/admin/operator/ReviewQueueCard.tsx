"use client";
// FILE: components/admin/operator/ReviewQueueCard.tsx

import { DecisionRequiredBanner } from "./DecisionRequiredBanner";
import { EvidenceSection, type EvidenceRow } from "./EvidenceSection";
import { OperatorActionPanel, type OperatorAction } from "./OperatorActionPanel";
import type { OperatorQueuePresentation } from "@/lib/admin/operatorPresentation";

const FONT = "'Inter',system-ui,sans-serif";

export function ReviewQueueCard({
  presentation,
  decisionPrompt,
  evidenceRows,
  technicalDetails,
  actions,
  confirmSlot,
}: {
  presentation: OperatorQueuePresentation;
  decisionPrompt: string;
  evidenceRows: EvidenceRow[];
  technicalDetails?: React.ReactNode;
  actions: OperatorAction[];
  confirmSlot?: React.ReactNode;
}) {
  return (
    <article
      aria-label={`${presentation.reviewType}: ${presentation.subjectLabel}`}
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 12,
        padding: "1rem",
        background: "rgba(255,255,255,0.03)",
      }}
    >
      <p style={{ fontFamily: FONT, fontSize: "0.62rem", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", margin: "0 0 0.35rem" }}>
        {presentation.reviewType}
      </p>
      <h3 style={{ fontFamily: FONT, fontSize: "1rem", margin: "0 0 0.15rem" }}>{presentation.subjectLabel}</h3>
      <p style={{ fontFamily: FONT, fontSize: "0.72rem", color: "rgba(255,255,255,0.58)", margin: "0 0 0.65rem", lineHeight: 1.45 }}>
        Next: {presentation.nextAction}
      </p>

      <DecisionRequiredBanner
        decisionPrompt={decisionPrompt}
        stateLabel={presentation.stateLabel}
        stateTone={presentation.stateTone}
        reason={presentation.reasonEntered}
        waitingLabel={presentation.waitingLabel}
      />

      <EvidenceSection title="Evidence" rows={evidenceRows} technicalDetails={technicalDetails} />

      {actions.length > 0 && <OperatorActionPanel actions={actions} />}
      {confirmSlot}
    </article>
  );
}
