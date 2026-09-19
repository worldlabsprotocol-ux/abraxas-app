// FILE: lib/settlement/circle/receiptGate.ts
// Server-verified signed receipts are the only eligibility proof. Wallet addresses are not.

import { getPublicReceipt } from "@/lib/decisionReceipts/service";
import { outcomeFromValidationErrors } from "@/lib/partner/integrationKit/outcomes";
import { isInadequateCircleSettlementReceipt } from "@/lib/partner/eligibilityMethods";
import { validatePartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { CIRCLE_PUBLIC_CODES, type CirclePublicCode } from "@/lib/settlement/circle/codes";

export interface SettlementReceiptGateInput {
  receiptId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  now?: Date;
}

export interface SettlementReceiptGateResult {
  ok: boolean;
  code: CirclePublicCode;
  receipt_id: string;
  policy_id?: string;
  policy_version?: number;
}

function mapReceiptCode(errors: string[]): CirclePublicCode {
  const outcome = outcomeFromValidationErrors(errors);
  switch (outcome) {
    case "invalid_signature":
      return CIRCLE_PUBLIC_CODES.receipt_unsigned;
    case "denied":
      return CIRCLE_PUBLIC_CODES.receipt_denied;
    case "expired":
      return CIRCLE_PUBLIC_CODES.receipt_expired;
    case "revoked":
      return CIRCLE_PUBLIC_CODES.receipt_revoked;
    case "wrong_partner":
      return CIRCLE_PUBLIC_CODES.receipt_wrong_partner;
    case "wrong_policy":
      return CIRCLE_PUBLIC_CODES.receipt_wrong_policy;
    case "wrong_policy_version":
      return CIRCLE_PUBLIC_CODES.receipt_wrong_policy_version;
    default:
      break;
  }
  const blob = errors.join(" ").toLowerCase();
  if (blob.includes("receipt_missing") || blob.includes("receipt_not_found")) {
    return CIRCLE_PUBLIC_CODES.receipt_missing;
  }
  if (blob.includes("signature")) return CIRCLE_PUBLIC_CODES.receipt_unsigned;
  if (blob.includes("denied") || blob.includes("decision_not_approved")) {
    return CIRCLE_PUBLIC_CODES.receipt_denied;
  }
  if (blob.includes("expired")) return CIRCLE_PUBLIC_CODES.receipt_expired;
  if (blob.includes("revoked")) return CIRCLE_PUBLIC_CODES.receipt_revoked;
  if (blob.includes("partner_mismatch")) return CIRCLE_PUBLIC_CODES.receipt_wrong_partner;
  if (blob.includes("policy_mismatch")) return CIRCLE_PUBLIC_CODES.receipt_wrong_policy;
  if (blob.includes("policy_version")) return CIRCLE_PUBLIC_CODES.receipt_wrong_policy_version;
  return CIRCLE_PUBLIC_CODES.receipt_invalid;
}

export async function gateSettlementReceipt(
  input: SettlementReceiptGateInput,
): Promise<SettlementReceiptGateResult> {
  const receiptId = input.receiptId.trim();
  if (!receiptId) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.receipt_missing, receipt_id: receiptId };
  }

  const publicReceipt = await getPublicReceipt(receiptId);
  if (!publicReceipt) {
    return { ok: false, code: CIRCLE_PUBLIC_CODES.receipt_missing, receipt_id: receiptId };
  }

  const validated = validatePartnerFlowPublicReceipt(publicReceipt, {
    partnerId: input.partnerId,
    policyId: input.policyId,
    mode: "sandbox",
    now: input.now,
  });
  if (!validated.ok) {
    return {
      ok: false,
      code: mapReceiptCode(validated.errors),
      receipt_id: receiptId,
      policy_id: publicReceipt.policy_id,
      policy_version: publicReceipt.policy_version,
    };
  }

  if (publicReceipt.policy_version !== input.policyVersion) {
    return {
      ok: false,
      code: CIRCLE_PUBLIC_CODES.receipt_wrong_policy_version,
      receipt_id: receiptId,
      policy_id: publicReceipt.policy_id,
      policy_version: publicReceipt.policy_version,
    };
  }

  const inadequate = isInadequateCircleSettlementReceipt(publicReceipt);
  if (inadequate.inadequate) {
    return {
      ok: false,
      code: CIRCLE_PUBLIC_CODES.receipt_inadequate,
      receipt_id: receiptId,
      policy_id: publicReceipt.policy_id,
      policy_version: publicReceipt.policy_version,
    };
  }

  return {
    ok: true,
    code: CIRCLE_PUBLIC_CODES.pending,
    receipt_id: receiptId,
    policy_id: publicReceipt.policy_id,
    policy_version: publicReceipt.policy_version,
  };
}
