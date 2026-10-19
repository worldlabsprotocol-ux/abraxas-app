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
  /** Legacy field: sandbox integrity + policy gates passed (not standalone registry-backed Ed25519). */
  signature_authentic: boolean;
  currently_acceptable: boolean;
  signature_valid: boolean;
  currently_valid: boolean;
  invalidation_reasons: string[];
  session_independent: boolean;
  server_record_integrity_verified: boolean;
  standalone_cryptographic_verification: boolean;
  code?: string;
};

export async function buildSandboxReceiptValidationPayload(input: {
  receipt: PartnerFlowPublicReceipt;
  source: SandboxReceiptValidationPayload["source"];
  checkedAt?: Date;
}): Promise<SandboxReceiptValidationPayload> {
  const validation = await validateEphemeralSandboxTestResult(input.receipt, {
    mode: input.source,
    now: input.checkedAt,
  });
  const checkedAt = (input.checkedAt ?? new Date()).toISOString();
  const integrityAndTrustOk =
    validation.server_record_integrity_verified
    && validation.trust.signature_valid
    && validation.trust.currently_valid;
  return {
    ok: validation.ok,
    checked_at: checkedAt,
    source: input.source,
    test_only: true,
    production_usable: false,
    result_label: EPHEMERAL_SANDBOX_RESULT_LABEL,
    signature_authentic: integrityAndTrustOk,
    currently_acceptable: validation.trust.currently_valid && validation.server_record_integrity_verified,
    signature_valid: validation.trust.signature_valid && validation.server_record_integrity_verified,
    currently_valid: validation.trust.currently_valid && validation.server_record_integrity_verified,
    invalidation_reasons: validation.trust.invalidation_reasons,
    session_independent: validation.session_independent,
    server_record_integrity_verified: validation.server_record_integrity_verified,
    standalone_cryptographic_verification: validation.standalone_cryptographic_verification,
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
