"use client";
// FILE: components/account/TrustExecutionTrace.tsx

import styles from "./EphemeralDeveloperWorkspace.module.css";

export type TrustExecutionStageId =
  | "application"
  | "authorization"
  | "evidence"
  | "policy"
  | "decision"
  | "validation";

export type TrustExecutionStageState = "pending" | "active" | "complete" | "failed" | "requirements";

export type TrustExecutionStage = {
  id: TrustExecutionStageId;
  label: string;
  state: TrustExecutionStageState;
  detail?: string;
};

export type ReceiptValidationTraceStatus =
  | "idle"
  | "checking"
  | "validated"
  | "failed"
  | "not_applicable";

const STAGE_ORDER: TrustExecutionStageId[] = [
  "application",
  "authorization",
  "evidence",
  "policy",
  "decision",
  "validation",
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
  receiptValidationStatus: ReceiptValidationTraceStatus;
  errorActive: boolean;
}): TrustExecutionStage[] {
  const inFlow =
    input.phase === "disclosure"
    || input.phase === "review"
    || input.phase === "signing"
    || input.phase === "submitting"
    || input.phase === "result";

  let applicationState: TrustExecutionStageState = "pending";
  let authorizationState: TrustExecutionStageState = "pending";
  let evidenceState: TrustExecutionStageState = "pending";
  let policyState: TrustExecutionStageState = "pending";
  let decisionState: TrustExecutionStageState = "pending";
  let validationState: TrustExecutionStageState = "pending";

  if (input.phase === "workspace" && input.policySelected) {
    applicationState = "active";
    if (input.evidenceRequired && !input.presentationPrepared) {
      evidenceState = "requirements";
    }
  } else if (input.phase === "disclosure") {
    applicationState = "complete";
    authorizationState = "requirements";
    evidenceState = input.presentationPrepared ? "active" : "requirements";
  } else if (input.phase === "review" || input.phase === "signing") {
    applicationState = "complete";
    authorizationState = "active";
    if (input.evidenceRequired) {
      evidenceState = input.presentationPrepared ? "complete" : "requirements";
    } else {
      evidenceState = "pending";
    }
  } else if (input.phase === "submitting") {
    applicationState = "complete";
    authorizationState = "complete";
    evidenceState = input.evidenceRequired ? "complete" : "active";
    policyState = "active";
  } else if (input.phase === "result") {
    applicationState = "complete";
    authorizationState = "complete";
    evidenceState = "complete";
    policyState = "complete";
    decisionState = input.errorActive
      ? "failed"
      : input.decision === "approved"
        ? "complete"
        : input.decision
          ? "failed"
          : "pending";

    if (input.receiptValidationStatus === "validated") {
      validationState = "complete";
    } else if (input.receiptValidationStatus === "failed") {
      validationState = "failed";
    } else if (input.receiptValidationStatus === "checking") {
      validationState = "active";
    } else if (input.receiptValidationStatus === "idle") {
      validationState = "active";
    } else {
      validationState = "pending";
    }
  } else if (inFlow) {
    applicationState = input.policySelected ? "active" : "pending";
  }

  if (input.errorActive && input.phase === "submitting") {
    policyState = "failed";
  }

  return [
    {
      id: "application",
      label: "Application",
      state: applicationState,
      detail: applicationState === "active" ? "Choose policy" : "Policy request",
    },
    {
      id: "authorization",
      label: "Authorization",
      state: authorizationState,
      detail: "Holder consent",
    },
    {
      id: "evidence",
      label: "Evidence",
      state: evidenceState,
      detail: input.evidenceRequired ? "Issuer credential" : "Wallet binding",
    },
    {
      id: "policy",
      label: "Policy",
      state: policyState,
      detail: "Evaluation",
    },
    {
      id: "decision",
      label: "Decision",
      state: decisionState,
      detail: "Signed receipt",
    },
    {
      id: "validation",
      label: "Validation",
      state: validationState,
      detail:
        input.receiptValidationStatus === "validated"
          ? "Receipt checked"
          : input.receiptValidationStatus === "checking"
            ? "Checking receipt"
            : input.receiptValidationStatus === "idle" && input.phase === "result"
              ? "Run validate"
              : "Independent check",
    },
  ];
}
