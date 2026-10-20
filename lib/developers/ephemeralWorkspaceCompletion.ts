// FILE: lib/developers/ephemeralWorkspaceCompletion.ts

import type { ReceiptValidationUiState } from "@/lib/developers/mapReceiptValidationOutcome";

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
  receiptRepresents: string;
  validationModeLine: string | null;
  checklist: SandboxCompletionChecklistItem[];
  primaryAction: SandboxCompletionPrimaryAction | null;
  showIntegrateHint: boolean;
};

const INTEGRATION_STUDIO_HREF = "/developers/integration-studio";
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

function primaryActionForPolicy(policyId: string): SandboxCompletionPrimaryAction {
  if (policyId === "age_21_retail") {
    return {
      label: "Integrate verification",
      href: INTEGRATION_STUDIO_HREF,
      description: "Configure partner flows and policy fit in Integration Studio.",
    };
  }
  return {
    label: "Integrate verification",
    href: INTEGRATION_STUDIO_HREF,
    description: "Connect Abraxas verification to your application using Integration Studio and developer docs.",
  };
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

export function buildEphemeralSandboxCompletionView(input: {
  policyId: string;
  policyLabel: string;
  decision: string | null;
  receiptValidation: ReceiptValidationUiState;
}): EphemeralSandboxCompletionView {
  const decisionNorm = normalizeDecision(input.decision);
  const approved = isApprovedDecision(decisionNorm);
  const validated = input.receiptValidation.status === "validated";
  const validationFailed = input.receiptValidation.status === "failed";
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

  let summary: string;
  if (validationFailed) {
    summary = input.receiptValidation.message;
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

  const checklist: SandboxCompletionChecklistItem[] = [
    {
      id: "wallet_auth",
      label: "Wallet authorization completed",
      state: "done",
    },
    {
      id: "receipt",
      label: validated ? "Sandbox receipt validated" : validationFailed ? "Sandbox receipt check failed" : "Sandbox receipt ready to validate",
      state: validated ? "done" : validationFailed ? "blocked" : "pending",
    },
    {
      id: "integrate",
      label: approved
        ? "Next: Connect this verification to an application"
        : "Next: Review policy requirements or run another test",
      state: approved ? "next" : "next",
    },
  ];

  let primaryAction: SandboxCompletionPrimaryAction | null = null;
  if (approved) {
    primaryAction = primaryActionForPolicy(input.policyId);
  } else if (validationFailed && input.receiptValidation.recovery) {
    primaryAction = {
      label: "Developer documentation",
      href: DOCS_HREF,
      description: input.receiptValidation.recovery,
    };
  }

  let tone: EphemeralSandboxCompletionView["tone"] = "neutral";
  if (validationFailed || (!approved && decisionNorm !== "unknown")) tone = "caution";
  else if (approved && validated) tone = "success";
  else if (approved) tone = "neutral";

  const statusEyebrow = validationFailed
    ? "SANDBOX TEST — VALIDATION ISSUE"
    : approved
      ? "SANDBOX TEST COMPLETE"
      : "SANDBOX TEST RESULT";

  return {
    statusEyebrow,
    headline: headlineForDecision(input.policyId, input.policyLabel, decisionNorm),
    summary,
    tone,
    sandboxOnlyNote,
    whatVerified,
    policyLine,
    decisionLine,
    receiptRepresents,
    validationModeLine: validationModeLineFromState(input.receiptValidation),
    checklist,
    primaryAction,
    showIntegrateHint: approved,
  };
}
