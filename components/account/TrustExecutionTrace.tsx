"use client";
// FILE: components/account/TrustExecutionTrace.tsx

import styles from "./EphemeralDeveloperWorkspace.module.css";

export type TrustExecutionStageId =
  | "application"
  | "authorization"
  | "evidence"
  | "policy"
  | "decision"
  | "verification";

export type TrustExecutionStageState = "pending" | "active" | "complete" | "failed" | "requirements";

export type TrustExecutionStage = {
  id: TrustExecutionStageId;
  label: string;
  state: TrustExecutionStageState;
  detail?: string;
};

const STAGE_ORDER: TrustExecutionStageId[] = [
  "application",
  "authorization",
  "evidence",
  "policy",
  "decision",
  "verification",
];

const STATE_CLASS: Record<TrustExecutionStageState, string> = {
  pending: styles.trustStagePending,
  active: styles.trustStageActive,
  complete: styles.trustStageComplete,
  failed: styles.trustStageFailed,
  requirements: styles.trustStageRequirements,
};

export function TrustExecutionTrace({ stages }: { stages: TrustExecutionStage[] }) {
  const byId = new Map(stages.map((s) => [s.id, s]));
  return (
    <div className={styles.trustTrace} aria-label="Trust execution progress">
      <ol className={styles.trustTraceList}>
        {STAGE_ORDER.map((id) => {
          const stage = byId.get(id);
          if (!stage) return null;
          return (
            <li
              key={id}
              className={`${styles.trustTraceItem} ${STATE_CLASS[stage.state]}`}
              aria-current={stage.state === "active" ? "step" : undefined}
            >
              <span className={styles.trustTraceLabel}>{stage.label}</span>
              {stage.detail ? <span className={styles.trustTraceDetail}>{stage.detail}</span> : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function deriveTrustExecutionStages(input: {
  phase: string;
  policySelected: boolean;
  presentationPrepared: boolean;
  evidenceRequired: boolean;
  decision: string | null;
  validation: {
    signature_authentic?: boolean;
    signature_valid?: boolean;
    currently_acceptable?: boolean;
    currently_valid?: boolean;
  } | null;
  errorActive: boolean;
}): TrustExecutionStage[] {
  const signatureOk =
    input.validation?.signature_authentic ?? input.validation?.signature_valid ?? false;
  const currentOk =
    input.validation?.currently_acceptable ?? input.validation?.currently_valid ?? false;

  const applicationState: TrustExecutionStageState = input.policySelected ? "complete" : "active";
  let authorizationState: TrustExecutionStageState = "pending";
  let evidenceState: TrustExecutionStageState = "pending";
  let policyState: TrustExecutionStageState = "pending";
  let decisionState: TrustExecutionStageState = "pending";
  let verificationState: TrustExecutionStageState = "pending";

  if (input.phase === "disclosure") {
    authorizationState = "requirements";
    evidenceState = input.presentationPrepared ? "active" : "requirements";
  } else if (input.phase === "review" || input.phase === "signing") {
    authorizationState = "active";
    evidenceState = input.evidenceRequired
      ? input.presentationPrepared
        ? "complete"
        : "requirements"
      : "pending";
  } else if (input.phase === "submitting") {
    authorizationState = "complete";
    evidenceState = input.evidenceRequired ? "complete" : "active";
    policyState = "active";
  } else if (input.phase === "result") {
    authorizationState = "complete";
    evidenceState = "complete";
    policyState = "complete";
    decisionState = input.errorActive ? "failed" : input.decision === "approved" ? "complete" : "failed";
    verificationState = input.validation ? (currentOk ? "complete" : signatureOk ? "requirements" : "failed") : "active";
  } else if (input.phase === "workspace" && input.policySelected) {
    authorizationState = "pending";
    if (input.evidenceRequired && !input.presentationPrepared) {
      evidenceState = "requirements";
    }
  }

  if (input.errorActive && input.phase !== "result") {
    if (input.phase === "submitting") policyState = "failed";
  }

  return [
    { id: "application", label: "Application", state: applicationState, detail: "Policy request" },
    { id: "authorization", label: "Authorization", state: authorizationState, detail: "Holder consent" },
    {
      id: "evidence",
      label: "Evidence",
      state: evidenceState,
      detail: input.evidenceRequired ? "Issuer credential" : "Wallet binding",
    },
    { id: "policy", label: "Policy", state: policyState, detail: "Evaluation" },
    { id: "decision", label: "Decision", state: decisionState, detail: "Signed receipt" },
    {
      id: "verification",
      label: "Verification",
      state: verificationState,
      detail: signatureOk
        ? currentOk
          ? "Currently acceptable"
          : "Signature authentic"
        : "Independent check",
    },
  ];
}
