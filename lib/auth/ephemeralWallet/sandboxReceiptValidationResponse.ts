// FILE: lib/auth/ephemeralWallet/sandboxReceiptValidationResponse.ts

import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  EPHEMERAL_SANDBOX_RESULT_LABEL,
  validateEphemeralSandboxTestResult,
} from "./sandboxTestVerification";

export type SandboxReceiptValidationPayload = {
  ok: boolean;
  checked_at: string;
  source: "server_cache" | "presented_receipt";
  test_only: true;
  production_usable: false;
  result_label: typeof EPHEMERAL_SANDBOX_RESULT_LABEL;
  signature_authentic: boolean;
  currently_acceptable: boolean;
  signature_valid: boolean;
  currently_valid: boolean;
  invalidation_reasons: string[];
  code?: string;
};

export function buildSandboxReceiptValidationPayload(input: {
  receipt: PartnerFlowPublicReceipt;
  source: SandboxReceiptValidationPayload["source"];
  checkedAt?: Date;
}): SandboxReceiptValidationPayload {
  const validation = validateEphemeralSandboxTestResult(input.receipt);
  const checkedAt = (input.checkedAt ?? new Date()).toISOString();
  return {
    ok: validation.ok,
    checked_at: checkedAt,
    source: input.source,
    test_only: true,
    production_usable: false,
    result_label: EPHEMERAL_SANDBOX_RESULT_LABEL,
    signature_authentic: validation.trust.signature_valid,
    currently_acceptable: validation.trust.currently_valid,
    signature_valid: validation.trust.signature_valid,
    currently_valid: validation.trust.currently_valid,
    invalidation_reasons: validation.trust.invalidation_reasons,
  };
}

export function isPresentedSandboxTestReceipt(value: unknown): value is PartnerFlowPublicReceipt {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.result_label === EPHEMERAL_SANDBOX_RESULT_LABEL
    && record.test_only === true
    && typeof record.receipt_id === "string"
    && typeof record.signature === "string"
    && typeof record.payload_hash === "string"
  );
}
