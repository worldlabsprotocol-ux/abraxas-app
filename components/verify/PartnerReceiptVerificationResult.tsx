"use client";
// FILE: components/verify/PartnerReceiptVerificationResult.tsx
// Partner receipt verification outcome — verification path + live decision receipt.

import { useMemo } from "react";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import type { PartnerFlowReceiptValidationResult } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  buildDecisionReceiptDisplayModel,
  partnerSafeDenialMessage,
} from "@/lib/protocol/decisionReceiptDisplay";
import { resolvePartnerDisplayName } from "@/lib/partner/partnerVerifyDisplay";
import { DecisionReceiptCard } from "@/components/protocol/DecisionReceiptCard";
import { ABX_FONT_MONO, ABX_FONT_SANS } from "@/lib/design/abraxasDesignSystem";

type VerificationStepId =
  | "request"
  | "receipt"
  | "policy"
  | "validity"
  | "action";

interface VerificationStep {
  id: VerificationStepId;
  label: string;
  state: "complete" | "active" | "failed" | "pending";
}

export interface PartnerReceiptVerificationResultProps {
  receipt: PartnerFlowPublicReceipt;
  validation: PartnerFlowReceiptValidationResult;
  partnerId?: string;
  policyId?: string;
  allowSandbox?: boolean;
  motionPhase?: "idle" | "verifying" | "resolved";
  showTechnicalJson?: boolean;
}

function buildVerificationSteps(
  receipt: PartnerFlowPublicReceipt,
  validation: PartnerFlowReceiptValidationResult,
  partnerId: string,
  policyId: string,
): VerificationStep[] {
  const receiptChecked = receipt.signature_valid === true && Boolean(receipt.receipt_id);
  const policyMatched =
    receiptChecked &&
    (!partnerId.trim() || receipt.partner_id === partnerId.trim()) &&
    (!policyId.trim() || receipt.policy_id === policyId.trim());
  const validityConfirmed =
    policyMatched &&
    receipt.currently_valid !== false &&
    receipt.decision_result === "approved" &&
    receipt.status !== "revoked" &&
    receipt.status !== "expired";
  const actionPermitted = validation.ok;

  return [
    { id: "request", label: "Request received", state: "complete" },
    {
      id: "receipt",
      label: "Receipt checked",
      state: receiptChecked ? "complete" : validation.ok ? "pending" : "failed",
    },
    {
      id: "policy",
      label: "Policy matched",
      state: policyMatched ? "complete" : receiptChecked ? "failed" : "pending",
    },
    {
      id: "validity",
      label: "Current validity confirmed",
      state: validityConfirmed ? "complete" : policyMatched ? "failed" : "pending",
    },
    {
      id: "action",
      label: actionPermitted ? "Action permitted" : "Action denied",
      state: actionPermitted ? "complete" : validityConfirmed ? "failed" : "pending",
    },
  ];
}

function partnerFacingDenialMessage(
  receipt: PartnerFlowPublicReceipt,
  validation: PartnerFlowReceiptValidationResult,
): string {
  if (receipt.partner_safe_reason) {
    return partnerSafeDenialMessage(receipt.partner_safe_reason) ?? "Unable to verify receipt";
  }
  if (receipt.status === "expired" || receipt.lifecycle_status === "expired") {
    return "Receipt expired";
  }
  if (receipt.status === "revoked" || receipt.lifecycle_status === "revoked") {
    return "Receipt no longer valid";
  }
  if (receipt.signature_valid === false) {
    return "Unable to verify receipt";
  }
  if (validation.errors.some((e) => e.startsWith("policy"))) {
    return "Receipt does not match this request";
  }
  if (!validation.ok) {
    return "Unable to verify receipt";
  }
  return "Unable to verify receipt";
}

export function PartnerReceiptVerificationResult({
  receipt,
  validation,
  partnerId = "",
  policyId = "",
  allowSandbox = false,
  motionPhase = "resolved",
  showTechnicalJson = false,
}: PartnerReceiptVerificationResultProps) {
  const partnerName = receipt.partner_id
    ? resolvePartnerDisplayName(receipt.partner_id)
    : undefined;

  const model = useMemo(
    () =>
      buildDecisionReceiptDisplayModel(receipt, {
        partnerName,
        actionPermitted: validation.ok,
      }),
    [receipt, partnerName, validation.ok],
  );

  const steps = useMemo(
    () => buildVerificationSteps(receipt, validation, partnerId, policyId),
    [receipt, validation, partnerId, policyId],
  );

  const denialMessage = partnerFacingDenialMessage(receipt, validation);

  return (
    <div className="abx-partner-receipt-verify">
      <ol className="abx-partner-receipt-verify__path" aria-label="Verification steps">
        {steps.map((step) => (
          <li
            key={step.id}
            className={`abx-partner-receipt-verify__step abx-partner-receipt-verify__step--${step.state}`}
          >
            <span className="abx-partner-receipt-verify__step-marker" aria-hidden />
            <span className="abx-partner-receipt-verify__step-label" style={{ fontFamily: ABX_FONT_MONO }}>
              {step.label}
            </span>
          </li>
        ))}
      </ol>

      <div
        className={`abx-partner-receipt-verify__outcome ${validation.ok ? "abx-partner-receipt-verify__outcome--permitted" : "abx-partner-receipt-verify__outcome--denied"}`}
        role="status"
      >
        <p className="abx-partner-receipt-verify__outcome-title" style={{ fontFamily: ABX_FONT_SANS }}>
          {validation.ok
            ? allowSandbox && model.environment === "sandbox"
              ? "Sandbox receipt verified — action permitted for pilot testing"
              : "Receipt verified — action permitted"
            : denialMessage}
        </p>
        {!validation.ok ? (
          <p className="abx-partner-receipt-verify__outcome-detail" style={{ fontFamily: ABX_FONT_SANS }}>
            Do not grant access until a valid receipt is confirmed for this request.
          </p>
        ) : null}
      </div>

      <DecisionReceiptCard model={model} motionPhase={motionPhase} />

      {showTechnicalJson ? (
        <details className="abx-partner-receipt-verify__json">
          <summary style={{ fontFamily: ABX_FONT_MONO, cursor: "pointer" }}>
            Integrator JSON (server-side diagnostics)
          </summary>
          <pre>{JSON.stringify(receipt, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}
