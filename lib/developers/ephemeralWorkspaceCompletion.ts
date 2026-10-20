// FILE: lib/developers/ephemeralWorkspaceCompletion.ts

import type { ReceiptValidationUiState } from "@/lib/developers/mapReceiptValidationOutcome";
import {
  buildIntegrationStudioHandoffUrl,
  integrationStudioReturnToWorkspaceHref,
} from "@/lib/developers/sandboxIntegrationHandoff";

export type SandboxCompletionChecklistItem = {
  id: string;
  label: string;
  state: "done" | "next" | "pending" | "blocked";
};

export type SandboxCompletionPrimaryAction = {
  label: string;
  href: string;
  description: string;
};

export type EphemeralSandboxCompletionView = {
  statusEyebrow: string;
  headline: string;
  summary: string;
  tone: "success" | "caution" | "neutral" | "error";
  sandboxOnlyNote: string;
  whatVerified: string;
  policyLine: string;
  decisionLine: string;
  acceptabilityLine: string;
  receiptRepresents: string;
  receiptUseLine: string;
  validationModeLine: string | null;
  checklist: SandboxCompletionChecklistItem[];
  primaryAction: SandboxCompletionPrimaryAction | null;
  secondaryAction: SandboxCompletionPrimaryAction | null;
};

const DOCS_HREF = "/docs";

function normalizeDecision(decision: string | null | undefined): string {
  return (decision ?? "unknown").trim().toLowerCase();
}

function isApprovedDecision(decision: string): boolean {
  return decision === "approved" || decision === "allow" || decision === "granted";
}

function policyVerifiedLabel(policyId: string, policyLabel: string): string {
  if (policyId === "wallet_control") return "Wallet control";
  if (policyId === "age_21_retail") return "Age 21 demonstration";
  return policyLabel || policyId;
}

function headlineForDecision(policyId: string, policyLabel: string, decision: string): string {
  const subject = policyVerifiedLabel(policyId, policyLabel);
  if (isApprovedDecision(decision)) {
    if (policyId === "wallet_control") return "Wallet control verified";
    if (policyId === "age_21_retail") return "Age 21 demonstration complete";
    return `${subject} verified`;
  }
  if (decision === "denied" || decision === "rejected" || decision === "not_approved") {
    return `${subject} not approved for this test`;
  }
  if (decision === "unknown") return "Verification finished";
  return `${subject}: ${decision}`;
}

function validationModeLineFromState(receiptValidation: ReceiptValidationUiState): string | null {
  if (receiptValidation.status !== "validated") return null;
  if (receiptValidation.standaloneCryptographicVerification === false) {
    return "Validation mode: session-independent check against Abraxas sandbox records and policy gates (not registry-backed standalone cryptography).";
  }
  if (receiptValidation.standaloneCryptographicVerification === true) {
    return "Validation mode: standalone cryptographic verification against trusted signing authority.";
  }
  return "Validation mode: independent receipt check completed.";
}

function acceptabilityLine(receiptValidation: ReceiptValidationUiState): string {
  if (receiptValidation.status === "idle") {
    return "Current acceptability: not checked yet. Run Validate receipt before relying on this result.";
  }
  if (receiptValidation.status === "checking") {
    return "Current acceptability: checking…";
  }
  if (receiptValidation.status === "failed") {
    return "Current acceptability: could not be established. Do not use this receipt for an application action.";
  }
  if (receiptValidation.currentlyAcceptable) {
    return "Current acceptability: yes for this sandbox test context.";
  }
  const reasons = receiptValidation.invalidationReasons?.length
    ? ` Reasons: ${receiptValidation.invalidationReasons.join(", ")}.`
    : "";
  return `Current acceptability: no — this receipt should not authorize an action right now.${reasons}`;
}

export function buildEphemeralSandboxCompletionView(input: {
  policyId: string;
  policyLabel: string;
  decision: string | null;
  receiptValidation: ReceiptValidationUiState;
}): EphemeralSandboxCompletionView {
  const decisionNorm = normalizeDecision(input.decision);
  const approved = isApprovedDecision(decisionNorm);
  const validated = input.receiptValidation.status === "validated";
  const currentlyAcceptable =
    validated && input.receiptValidation.status === "validated"
      ? input.receiptValidation.currentlyAcceptable
      : null;

  const subject = policyVerifiedLabel(input.policyId, input.policyLabel);

  const sandboxOnlyNote =
    "Sandbox test only. This result does not grant live access, real-world eligibility, or institutional authorization.";

  const whatVerified =
    input.policyId === "wallet_control"
      ? "Control of your connected wallet for this signed sandbox request."
      : input.policyId === "age_21_retail"
        ? "A sandbox Age 21 policy evaluation using demonstration evidence only."
        : `Policy evaluation for ${subject}.`;

  const policyLine = `Policy evaluated: ${input.policyLabel || input.policyId}`;
  const decisionLine = approved
    ? "Decision: approved for this sandbox test."
    : `Decision: ${decisionNorm} (sandbox test only).`;

  const receiptRepresents =
    "A signed eligibility decision receipt your application can verify before allowing an action.";

  const receiptUseLine =
    "Useful for: gating a partner action after server-side receipt verification — not for storing identity or bypassing holder consent.";

  const failedValidation = input.receiptValidation.status === "failed" ? input.receiptValidation : null;

  let summary: string;
  if (failedValidation) {
    summary = failedValidation.message;
  } else if (validated && approved && currentlyAcceptable === false) {
    summary =
      "The receipt checked out cryptographically or against sandbox records, but it is not currently acceptable for reliance. Run a new test or review expiry and policy gates.";
  } else if (validated && approved) {
    summary =
      "Your signed request was evaluated and the resulting receipt passed an independent validation check.";
  } else if (validated && !approved) {
    summary =
      "The receipt was checked successfully, but the policy decision is not approval. Do not treat this as authorization for a live action.";
  } else if (approved) {
    summary =
      "Your signed request was evaluated. Run Validate receipt for an independent check before relying on this result.";
  } else {
    summary =
      "Review the decision and receipt details. Run another test or adjust your integration policy if you expected approval.";
  }

  const integrateEligible =
    approved && !failedValidation && (currentlyAcceptable === null || currentlyAcceptable === true);

  const checklist: SandboxCompletionChecklistItem[] = [
    {
      id: "wallet_auth",
      label: "Wallet authorization completed",
      state: "done",
    },
    {
      id: "receipt",
      label: validated
        ? currentlyAcceptable === false
          ? "Receipt checked — not currently acceptable"
          : "Sandbox receipt validated"
        : failedValidation
          ? "Sandbox receipt check failed"
          : "Sandbox receipt ready to validate",
      state: validated ? (currentlyAcceptable === false ? "blocked" : "done") : failedValidation ? "blocked" : "pending",
    },
    {
      id: "integrate",
      label: integrateEligible
        ? "Next: Create a sandbox application with the same policy"
        : approved
          ? "Next: Validate receipt, then connect to your application"
          : "Next: Review policy requirements or run another test",
      state: integrateEligible ? "next" : approved && !validated ? "pending" : "next",
    },
  ];

  let primaryAction: SandboxCompletionPrimaryAction | null = null;
  let secondaryAction: SandboxCompletionPrimaryAction | null = null;

  if (integrateEligible) {
    primaryAction = {
      label: "Continue in Integration Studio",
      href: buildIntegrationStudioHandoffUrl({ policyId: input.policyId }),
      description:
        "Policy pack and integration path are preselected. Create a private sandbox application to verify from your server (no Production access until review).",
    };
    secondaryAction = {
      label: "Back to Developer Workspace",
      href: integrationStudioReturnToWorkspaceHref(),
      description: "Run another sandbox test or validate the receipt again.",
    };
  } else if (approved && !validated && !failedValidation) {
    primaryAction = {
      label: "Continue in Integration Studio",
      href: buildIntegrationStudioHandoffUrl({ policyId: input.policyId }),
      description:
        "Prepare your application integration while you validate the receipt here, or validate first if you plan to rely on this result immediately.",
    };
  } else if (!approved && !failedValidation) {
    primaryAction = {
      label: "Review policy in Integration Studio",
      href: buildIntegrationStudioHandoffUrl({ policyId: input.policyId }),
      description:
        "Compare the Launchpad policy pack and integration path with what you tested. Adjust requirements or run another sandbox test.",
    };
    secondaryAction = {
      label: "Run another sandbox test",
      href: integrationStudioReturnToWorkspaceHref(),
      description: "Return to the Developer Workspace policy screen.",
    };
  } else if (failedValidation) {
    primaryAction = {
      label: "Run another sandbox test",
      href: integrationStudioReturnToWorkspaceHref(),
      description: failedValidation.recovery ?? "Start a fresh verification in the Developer Workspace.",
    };
    if (failedValidation.technicalCode === "result_not_found") {
      secondaryAction = {
        label: "Developer documentation",
        href: DOCS_HREF,
        description: "Sandbox test records expire after 24 hours; credential validity and signing challenges use separate rules.",
      };
    } else {
      secondaryAction = {
        label: "Developer documentation",
        href: DOCS_HREF,
        description: failedValidation.recovery ?? "Review receipt verification guidance before sharing results.",
      };
    }
  } else if (validated && currentlyAcceptable === false) {
    primaryAction = {
      label: "Run another sandbox test",
      href: integrationStudioReturnToWorkspaceHref(),
      description: "Expired or policy-gated receipts should not authorize actions. Create a fresh test result.",
    };
    secondaryAction = {
      label: "Review policy in Integration Studio",
      href: buildIntegrationStudioHandoffUrl({ policyId: input.policyId }),
      description: "Confirm receipt lifetime and policy version expectations for your integration.",
    };
  }

  let tone: EphemeralSandboxCompletionView["tone"] = "neutral";
  if (failedValidation || !approved || currentlyAcceptable === false) tone = "caution";
  else if (approved && validated) tone = "success";
  else if (approved) tone = "neutral";

  const statusEyebrow = failedValidation
    ? "SANDBOX TEST — VALIDATION ISSUE"
    : !approved
      ? "SANDBOX TEST RESULT"
      : currentlyAcceptable === false
        ? "SANDBOX TEST — NOT ACCEPTABLE"
        : "SANDBOX TEST COMPLETE";

  return {
    statusEyebrow,
    headline: headlineForDecision(input.policyId, input.policyLabel, decisionNorm),
    summary,
    tone,
    sandboxOnlyNote,
    whatVerified,
    policyLine,
    decisionLine,
    acceptabilityLine: acceptabilityLine(input.receiptValidation),
    receiptRepresents,
    receiptUseLine,
    validationModeLine: validationModeLineFromState(input.receiptValidation),
    checklist,
    primaryAction,
    secondaryAction,
  };
}
