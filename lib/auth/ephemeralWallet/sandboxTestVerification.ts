// FILE: lib/auth/ephemeralWallet/sandboxTestVerification.ts
// Signed sandbox-only test results for ephemeral wallet workspaces (no Production authority).

import { randomBytes } from "crypto";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import { EPHEMERAL_TTL } from "./retention";
import {
  EPHEMERAL_SANDBOX_TEST_PARTNER_ID,
  resolveEphemeralSandboxTestPolicy,
  type EphemeralSandboxTestPolicy,
} from "./sandboxTestPolicies";
import { ephemeralKvGet, ephemeralKvSet } from "./redisKv";
import { processTransientStateAllowed, resolveTransientStateBackend } from "./transientStatePolicy";
import { EphemeralStateUnavailableError } from "./errors";

export const EPHEMERAL_SANDBOX_RESULT_LABEL = "ephemeral_sandbox_test_only" as const;

const RESULT_PREFIX = "abraxas:ephemeral:sandbox-result:v1:";

const memoryResults = new Map<string, PartnerFlowPublicReceipt>();

function memoryAllowed(env: Record<string, string | undefined>): boolean {
  return processTransientStateAllowed(env);
}

function resultKey(receiptId: string): string {
  return `${RESULT_PREFIX}${receiptId}`;
}

export type EphemeralSandboxTestResult = PartnerFlowPublicReceipt &
  Record<string, unknown> & {
    result_label: typeof EPHEMERAL_SANDBOX_RESULT_LABEL;
    test_only: true;
    production_usable: false;
    workspace_id: string;
    notice: string;
  };

export function issueEphemeralSandboxTestResult(input: {
  workspaceId: string;
  walletAddress: string;
  policy: EphemeralSandboxTestPolicy;
  now?: Date;
}): EphemeralSandboxTestResult {
  const key = generateTestSigningKeyPair();
  const now = input.now ?? new Date();
  const evaluatedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + EPHEMERAL_TTL.sandboxTestReceiptSec * 1000).toISOString();
  const payload = buildCanonicalPayload({
    receipt_id: `dr_esbx_${randomBytes(8).toString("hex")}`,
    decision_id: `00000000-0000-4000-8000-${randomBytes(6).toString("hex").slice(0, 12)}`,
    policy_id: input.policy.policy_id,
    policy_version: input.policy.policy_version,
    partner_id: EPHEMERAL_SANDBOX_TEST_PARTNER_ID,
    subject_pseudonym_id: subjectPseudonymId(input.walletAddress),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: "approved",
    reason_codes: ["ephemeral_sandbox_test"],
    evaluated_claim_refs: [{
      claim_id: "claim-esbx",
      claim_type: input.policy.claim_type,
      issuer_id: "issuer:abraxas_sandbox",
      status: "active",
      issued_at: evaluatedAt,
      expires_at: null,
    }],
    issuer_refs: ["issuer:abraxas_sandbox"],
    decision_context: "sandbox_only",
    evaluated_at: evaluatedAt,
    expires_at: expiresAt,
  });
  const { payloadHash, signature } = signReceiptPayload(payload, key.privateKeyJwk);
  const signatureValid = verifyReceiptSignature(payload, signature, key.publicKeyJwk);
  return {
    receipt_id: payload.receipt_id,
    schema_version: payload.schema_version,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    partner_id: payload.partner_id,
    subject_pseudonym_id: payload.subject_pseudonym_id,
    decision_result: payload.decision_result,
    reason_codes: payload.reason_codes,
    evaluated_claim_refs: payload.evaluated_claim_refs,
    issuer_refs: payload.issuer_refs,
    decision_context: payload.decision_context,
    production_usable: false,
    evaluated_at: payload.evaluated_at,
    expires_at: payload.expires_at,
    status: "active",
    payload_hash: payloadHash,
    signature,
    signing_key_id: key.signingKeyId,
    signature_valid: signatureValid,
    currently_valid: signatureValid,
    validity: "active",
    invalidation_reasons: [],
    artifact_type: "eligibility_decision_receipt",
    anchor_reference: null,
    result_label: EPHEMERAL_SANDBOX_RESULT_LABEL,
    test_only: true,
    workspace_id: input.workspaceId,
    notice:
      "Ephemeral sandbox test result only. Not Production verification, KYB, or institutional approval.",
  };
}

export async function storeEphemeralSandboxTestResult(
  result: EphemeralSandboxTestResult,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  const ttl = EPHEMERAL_TTL.sandboxTestReceiptSec;
  const key = resultKey(String(result.receipt_id));
  if (resolveTransientStateBackend(env) !== "redis") {
    if (!memoryAllowed(env)) throw new EphemeralStateUnavailableError();
    memoryResults.set(String(result.receipt_id), result);
    return;
  }
  await ephemeralKvSet(key, result, ttl, env);
}

export async function loadEphemeralSandboxTestResult(
  receiptId: string,
  env: Record<string, string | undefined> = process.env,
): Promise<EphemeralSandboxTestResult | null> {
  if (resolveTransientStateBackend(env) === "redis") {
    const fromKv = await ephemeralKvGet<EphemeralSandboxTestResult>(resultKey(receiptId), env);
    if (fromKv) return fromKv;
  }
  if (memoryAllowed(env)) {
    return (memoryResults.get(receiptId) as EphemeralSandboxTestResult | undefined) ?? null;
  }
  return null;
}

type EphemeralSandboxReceiptFields = PartnerFlowPublicReceipt & {
  signature?: string;
  payload_hash?: string;
  receipt_id?: string;
};

export type EphemeralSandboxValidationMode = "server_cache" | "presented_receipt";

export type EphemeralSandboxValidationMetadata = {
  server_record_integrity_verified: boolean;
  /** Ed25519 verified against Abraxas verification-key registry (not ephemeral per-receipt test keys). */
  standalone_cryptographic_verification: boolean;
  session_independent: boolean;
};

export type EphemeralSandboxValidationResult = EphemeralSandboxValidationMetadata & {
  ok: boolean;
  trust: ReturnType<typeof evaluatePublicReceiptTrust>;
  result_label: string | null;
};

function verifyPresentedAgainstStored(
  receipt: EphemeralSandboxReceiptFields,
  stored: EphemeralSandboxTestResult | null,
): { ok: true; stored: EphemeralSandboxTestResult } | { ok: false; invalidation_reasons: string[] } {
  const receiptId = typeof receipt.receipt_id === "string" ? receipt.receipt_id.trim() : "";
  if (!receiptId) {
    return { ok: false, invalidation_reasons: ["receipt_id_missing"] };
  }
  if (!stored) {
    return { ok: false, invalidation_reasons: ["server_record_not_found"] };
  }
  if (String(stored.receipt_id) !== receiptId) {
    return { ok: false, invalidation_reasons: ["receipt_id_mismatch"] };
  }
  const presentedSignature = receipt.signature;
  if (typeof presentedSignature !== "string" || !presentedSignature.trim()) {
    return { ok: false, invalidation_reasons: ["signature_missing"] };
  }
  const presentedPayloadHash = receipt.payload_hash;
  if (typeof presentedPayloadHash !== "string" || !presentedPayloadHash.trim()) {
    return { ok: false, invalidation_reasons: ["payload_hash_missing"] };
  }
  if (presentedSignature !== stored.signature) {
    return { ok: false, invalidation_reasons: ["signature_mismatch"] };
  }
  if (presentedPayloadHash !== stored.payload_hash) {
    return { ok: false, invalidation_reasons: ["payload_hash_mismatch"] };
  }
  return { ok: true, stored };
}

function trustEvaluationFailed(invalidationReasons: string[]): ReturnType<typeof evaluatePublicReceiptTrust> {
  return {
    currently_valid: false,
    validity: "signature_invalid",
    signature_valid: false,
    production_usable: false,
    invalidation_reasons: invalidationReasons,
  };
}

export async function validateEphemeralSandboxTestResult(
  receipt: PartnerFlowPublicReceipt,
  options?: {
    requireProduction?: boolean;
    mode?: EphemeralSandboxValidationMode;
    now?: Date;
  },
): Promise<EphemeralSandboxValidationResult> {
  const mode = options?.mode ?? "presented_receipt";
  const session_independent = true;
  const standalone_cryptographic_verification = false;

  const receiptId = typeof receipt.receipt_id === "string" ? receipt.receipt_id.trim() : "";
  const stored = receiptId ? await loadEphemeralSandboxTestResult(receiptId) : null;

  let receiptForTrust: PartnerFlowPublicReceipt = receipt;
  let server_record_integrity_verified = false;

  if (mode === "presented_receipt") {
    const integrity = verifyPresentedAgainstStored(receipt, stored);
    if (!integrity.ok) {
      const trust = trustEvaluationFailed(integrity.invalidation_reasons);
      return {
        ok: false,
        trust,
        result_label: EPHEMERAL_SANDBOX_RESULT_LABEL,
        server_record_integrity_verified: false,
        standalone_cryptographic_verification,
        session_independent,
      };
    }
    server_record_integrity_verified = true;
    receiptForTrust = integrity.stored;
  } else {
    if (!stored || String(stored.receipt_id) !== receiptId) {
      const trust = trustEvaluationFailed(["server_record_not_found"]);
      return {
        ok: false,
        trust,
        result_label: EPHEMERAL_SANDBOX_RESULT_LABEL,
        server_record_integrity_verified: false,
        standalone_cryptographic_verification,
        session_independent,
      };
    }
    server_record_integrity_verified = true;
    receiptForTrust = stored;
  }

  const trust = evaluatePublicReceiptTrust(receiptForTrust, {
    partnerId: EPHEMERAL_SANDBOX_TEST_PARTNER_ID,
    policyId: receiptForTrust.policy_id ?? "",
    allowSandbox: true,
    productionUsableRaw: receiptForTrust.production_usable,
    now: options?.now,
  });

  const requireProduction = options?.requireProduction ?? false;
  const productionBlocked = requireProduction || receiptForTrust.decision_context === "production";
  const ok = trust.currently_valid && !productionBlocked && receiptForTrust.production_usable !== true;

  return {
    ok,
    trust,
    result_label: EPHEMERAL_SANDBOX_RESULT_LABEL,
    server_record_integrity_verified,
    standalone_cryptographic_verification,
    session_independent,
  };
}

export async function runEphemeralSandboxTestVerification(input: {
  workspaceId: string;
  walletAddress: string;
  policyId: string;
}): Promise<
  | { ok: true; result: EphemeralSandboxTestResult }
  | { ok: false; code: "unknown_policy" | "store_unavailable" }
> {
  const policy = resolveEphemeralSandboxTestPolicy(input.policyId);
  if (!policy) return { ok: false, code: "unknown_policy" };
  const result = issueEphemeralSandboxTestResult({
    workspaceId: input.workspaceId,
    walletAddress: input.walletAddress,
    policy,
  });
  try {
    await storeEphemeralSandboxTestResult(result);
  } catch (error) {
    if (error instanceof EphemeralStateUnavailableError) {
      return { ok: false, code: "store_unavailable" };
    }
    throw error;
  }
  return { ok: true, result };
}

export function resetEphemeralSandboxTestStoreForTests(): void {
  memoryResults.clear();
}
