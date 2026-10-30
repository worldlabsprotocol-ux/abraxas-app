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
  description: string;
  kind: "link" | "check_proof" | "inline_integrate";
  href?: string;
};

export type ApplicationIntegrationHandoffStep = {
  id: string;
  label: string;
  detail: string;
  state: "done" | "current" | "upcoming";
};

export type ApplicationIntegrationHandoff = {
  title: string;
  summary: string;
  steps: ApplicationIntegrationHandoffStep[];
  studioHref: string;
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
  applicationHandoff: ApplicationIntegrationHandoff | null;
};

const DOCS_HREF = "/docs";
const EXPLORE_VERIFICATION_HREF = "/docs#verification";

function normalizeDecision(decision: string | null | undefined): string {
  return (decision ?? "unknown").trim().toLowerCase();
}

/** Wallet demo complete with validated receipt — safe to continue into embedded Studio (same workspace). */
export function sandboxIntegrationStudioEligible(input: {
  decision: string | null;
  receiptValidation: ReceiptValidationUiState;
}): boolean {
  const decisionNorm = normalizeDecision(input.decision);
  const approved = isApprovedDecision(decisionNorm);
  const validated = input.receiptValidation.status === "validated";
  const failedValidation = input.receiptValidation.status === "failed" ? input.receiptValidation : null;
  const currentlyAcceptable =
    validated && input.receiptValidation.status === "validated"
      ? input.receiptValidation.currentlyAcceptable
      : null;
  return approved && !failedValidation && validated && currentlyAcceptable !== false;
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
    if (policyId === "wallet_control") return "Wallet control confirmed";
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

function buildApplicationIntegrationHandoff(input: {
  policyId: string;
  policyLabel: string;
  integrateEligible: boolean;
}): ApplicationIntegrationHandoff | null {
  if (!input.integrateEligible) return null;
  const studioHref = buildIntegrationStudioHandoffUrl({ policyId: input.policyId });
  const policyName = policyVerifiedLabel(input.policyId, input.policyLabel);
  return {
    title: "Put it in your app",
    summary:
      "Your verification works in sandbox. Next, connect a test application so Abraxas can request this check and return a signed result your code can verify independently.",
    studioHref,
    steps: [
      {
        id: "policy",
        label: "Verification policy selected",
        detail: policyName,
        state: "done",
      },
      {
        id: "sandbox_test",
        label: "Test verification completed",
        detail: "Signed receipt issued and independently checked.",
        state: "done",
      },
      {
        id: "connect_app",
        label: "Connect your application",
        detail: "Create or select a sandbox app, set an allowed callback, and run a real integration request.",
        state: "current",
      },
      {
        id: "handoff",
        label: "Plan the integration handoff",
        detail: "Use request examples, verifier checks, and production review requirements in Integration Studio.",
        state: "upcoming",
      },
    ],
  };
}

function acceptabilityLine(receiptValidation: ReceiptValidationUiState): string {
  if (receiptValidation.status === "idle") {
    return "Proof status: not checked yet. Use Check your proof to confirm the receipt is authentic and still valid.";
  }
  if (receiptValidation.status === "checking") {
    return "Proof status: checking…";
  }
  if (receiptValidation.status === "failed") {
    return "Proof status: could not be established. Do not use this receipt for an application action.";
  }
  if (receiptValidation.currentlyAcceptable) {
    return "Your proof checks out — authentic, authorized, and currently valid for this sandbox test.";
  }
  const reasons = receiptValidation.invalidationReasons?.length
    ? ` Reasons: ${receiptValidation.invalidationReasons.join(", ")}.`
    : "";
  return `This proof is not currently valid for reliance.${reasons}`;
}

export function buildEphemeralSandboxCompletionView(input: {
  policyId: string;
  policyLabel: string;
  decision: string | null;
  receiptValidation: ReceiptValidationUiState;
  /** Keep create-app on homepage builder — no `/developers/ephemeral-sandbox` hop. */
  inlineIntegrationHandoff?: boolean;
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

  const policyLine = `What was checked: ${input.policyLabel || input.policyId}`;
  const decisionLine = approved
    ? "Result: approved for this sandbox test only."
    : `Result: ${decisionNorm} (sandbox test only).`;

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
      "Abraxas confirmed your verification receipt is authentic and currently valid. This proves wallet control for this test — not broader identity or live eligibility.";
  } else if (validated && !approved) {
    summary =
      "The proof checked out technically, but the policy decision is not approval. Do not treat this as authorization for a live action.";
  } else if (approved) {
    summary =
      "Wallet verification completed. Abraxas is checking the receipt before continuing.";
  } else {
    summary =
      "Review the decision and receipt details. Run another test or adjust your integration policy if you expected approval.";
  }

  const integrateEligible = sandboxIntegrationStudioEligible({
    decision: input.decision,
    receiptValidation: input.receiptValidation,
  });

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
          ? "Proof checked — not currently valid"
          : "Proof checked independently"
        : failedValidation
          ? "Proof check failed"
          : "Proof ready to check",
      state: validated ? (currentlyAcceptable === false ? "blocked" : "done") : failedValidation ? "blocked" : "pending",
    },
    {
      id: "integrate",
      label: integrateEligible
        ? "Next: Connect your application"
        : approved
          ? "Next: Confirm the receipt, then connect your application"
          : "Next: Review what this policy requires or run another test",
      state: integrateEligible ? "next" : approved && !validated ? "pending" : "next",
    },
  ];

  let primaryAction: SandboxCompletionPrimaryAction | null = null;
  let secondaryAction: SandboxCompletionPrimaryAction | null = null;

  if (integrateEligible) {
    primaryAction = {
      kind: input.inlineIntegrationHandoff ? "inline_integrate" : "link",
      label: "Connect your application",
      href: input.inlineIntegrationHandoff
        ? undefined
        : buildIntegrationStudioHandoffUrl({ policyId: input.policyId }),
      description:
        "Choose a new or existing sandbox application.",
    };
    secondaryAction = {
      kind: "link",
      label: "Explore how verification works",
      href: EXPLORE_VERIFICATION_HREF,
      description: "Read how signed receipts and independent checks fit together.",
    };
  } else if (approved && !validated && !failedValidation) {
    primaryAction = {
      kind: "check_proof",
      label: "Check your proof",
      description:
        "Confirm your receipt is authentic and still valid. No additional wallet signature is needed.",
    };
  } else if (!approved && !failedValidation) {
    primaryAction = {
      kind: "link",
      label: "Review policy in Integration Studio",
      href: buildIntegrationStudioHandoffUrl({ policyId: input.policyId }),
      description:
        "Compare the Launchpad policy pack and integration path with what you tested. Adjust requirements or run another sandbox test.",
    };
    secondaryAction = {
      kind: "link",
      label: "Run another sandbox test",
      href: integrationStudioReturnToWorkspaceHref(),
      description: "Return to the Developer Workspace policy screen.",
    };
  } else if (failedValidation) {
    primaryAction = {
      kind: "link",
      label: "Run another sandbox test",
      href: integrationStudioReturnToWorkspaceHref(),
      description: failedValidation.recovery ?? "Start a fresh verification in the Developer Workspace.",
    };
    if (failedValidation.technicalCode === "result_not_found") {
      secondaryAction = {
        kind: "link",
        label: "Developer documentation",
        href: DOCS_HREF,
        description: "Sandbox test records expire after 24 hours; credential validity and signing challenges use separate rules.",
      };
    } else {
      secondaryAction = {
        kind: "link",
        label: "Developer documentation",
        href: DOCS_HREF,
        description: failedValidation.recovery ?? "Review receipt verification guidance before sharing results.",
      };
    }
  } else if (validated && currentlyAcceptable === false) {
    primaryAction = {
      kind: "link",
      label: "Run another sandbox test",
      href: integrationStudioReturnToWorkspaceHref(),
      description: "Expired or policy-gated receipts should not authorize actions. Create a fresh test result.",
    };
    secondaryAction = {
      kind: "link",
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
        : approved && !validated
          ? "Wallet control confirmed"
          : integrateEligible
            ? "Your proof checks out"
            : "SANDBOX TEST COMPLETE";

  let headline = headlineForDecision(input.policyId, input.policyLabel, decisionNorm);
  if (approved && !validated && !failedValidation) {
    headline = "Check your proof";
    summary =
      "Confirm your verification receipt is authentic and still valid. No additional wallet signature is needed.";
  } else if (integrateEligible) {
    headline = "Your proof checks out";
  }

  const applicationHandoff = buildApplicationIntegrationHandoff({
    policyId: input.policyId,
    policyLabel: input.policyLabel,
    integrateEligible,
  });

  return {
    statusEyebrow,
    headline,
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
    applicationHandoff,
  };
}
