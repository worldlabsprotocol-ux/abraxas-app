// FILE: lib/protocolVerification/executeVerification.ts

import { randomBytes } from "crypto";
import { evaluatePolicyRules } from "@/lib/policy/evaluatePolicy";
import { inferPolicyPackFromPolicyId } from "@/lib/partner/launchpad/policyPacks";
import { materializeCredentialClaims } from "./materializeClaims";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import {
  generateTestSigningKeyPair,
  loadReceiptSigningKey,
  signReceiptPayload,
  verifyReceiptSignature,
} from "@/lib/decisionReceipts/signing";
import { subjectPseudonymId } from "@/lib/decisionReceipts/pseudonym";
import { evaluateEvidencePresentation } from "./evidenceAdapters";
import type {
  BoundVerificationRequest,
  EvidencePresentation,
  ProtocolVerificationContext,
  ProtocolVerificationOutcome,
} from "./types";
import { EPHEMERAL_SANDBOX_TEST_PARTNER_ID } from "@/lib/auth/ephemeralWallet/sandboxTestPolicies";

function policyRulesForPolicyId(policyId: string) {
  const pack = inferPolicyPackFromPolicyId(policyId);
  return pack?.rules ?? null;
}

export async function executeProtocolVerification(input: {
  context: ProtocolVerificationContext;
  request: BoundVerificationRequest;
  evidence: EvidencePresentation[];
  now?: Date;
}): Promise<ProtocolVerificationOutcome> {
  const now = input.now ?? new Date();
  if (new Date(input.request.expires_at) < now) {
    return { ok: false, code: "request_expired" };
  }

  if (input.context === "production") {
    const productionKey = loadReceiptSigningKey();
    if (!productionKey) {
      return { ok: false, code: "production_signing_unavailable", unsupported: true };
    }
  }

  const evidenceResults = await Promise.all(
    input.evidence.map((presentation) =>
      evaluateEvidencePresentation({
        presentation,
        partnerId: input.request.partner_id,
        policyId: input.request.policy_id,
        walletSubject: input.request.wallet_subject,
      }),
    ),
  );

  const unsupported = evidenceResults.find((r) => !r.ok && r.unsupported);
  if (unsupported && !unsupported.ok) {
    return { ok: false, code: unsupported.code, unsupported: true };
  }

  const claimRefs = evidenceResults
    .filter((r): r is Extract<typeof r, { ok: true }> => r.ok)
    .flatMap((r) => r.claim_refs);

  const rules = policyRulesForPolicyId(input.request.policy_id);
  if (!rules) {
    return { ok: false, code: "policy_not_found" };
  }

  const onlyWalletBinding =
    input.evidence.length === 1 && input.evidence[0]?.kind === "wallet_session_binding";
  if (onlyWalletBinding && input.request.policy_id !== "wallet_control") {
    return {
      ok: false,
      code: "insufficient_evidence_for_policy",
      unsupported: false,
    };
  }

  const materializedClaims = materializeCredentialClaims({
    walletSubject: input.request.wallet_subject,
    claimRefs,
    now,
    sandboxOnly: input.context !== "production",
  });

  const evaluation = evaluatePolicyRules(rules, materializedClaims, {
    partnerId: input.request.partner_id,
    policyId: input.request.policy_id,
    policyRules: rules,
  });
  const decision = evaluation.decision === "approved" ? "approved" : "denied";
  const reason_codes =
    evaluation.decision === "approved" ? ["policy_satisfied", ...evaluation.reason_codes] : evaluation.reason_codes;

  const key =
    input.context === "production"
      ? loadReceiptSigningKey()!
      : generateTestSigningKeyPair();

  const evaluatedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const payload = buildCanonicalPayload({
    receipt_id: `dr_pv_${randomBytes(8).toString("hex")}`,
    decision_id: `00000000-0000-4000-8000-${randomBytes(6).toString("hex").slice(0, 12)}`,
    policy_id: input.request.policy_id,
    policy_version: input.request.policy_version,
    partner_id: input.request.partner_id,
    subject_pseudonym_id: subjectPseudonymId(input.request.wallet_subject),
    wallet_binding_ref: null,
    consent_receipt_id: null,
    decision_result: decision,
    reason_codes,
    evaluated_claim_refs: materializedClaims.map((c) => ({
      claim_id: c.id,
      claim_type: c.claim_type,
      issuer_id: c.issuer_id,
      status: c.status,
      issued_at: c.issued_at,
      expires_at: c.expires_at,
    })),
    issuer_refs: ["issuer:abraxas_protocol_verification"],
    decision_context: input.context === "production" ? "production" : "sandbox_only",
    evaluated_at: evaluatedAt,
    expires_at: expiresAt,
  });

  const { payloadHash, signature } = signReceiptPayload(payload, key.privateKeyJwk);
  const signatureValid = verifyReceiptSignature(payload, signature, key.publicKeyJwk);

  const resultLabel =
    input.context === "production"
      ? "production_eligibility_decision"
      : "ephemeral_sandbox_test_only";

  const receipt = {
    ...payload,
    receipt_id: payload.receipt_id,
    payload_hash: payloadHash,
    signature,
    signing_key_id: key.signingKeyId,
    signature_valid: signatureValid,
    production_usable: input.context === "production",
    result_label: resultLabel,
    request_id: input.request.request_id,
    test_only: input.context !== "production",
  };

  return {
    ok: true,
    decision,
    reason_codes,
    result_label: resultLabel,
    receipt,
    validate_path: `/api/auth/wallet/sandbox/validate?receipt_id=${encodeURIComponent(String(payload.receipt_id))}`,
  };
}

export function bindVerificationRequest(input: {
  requestId: string;
  partnerId: string;
  policyId: string;
  policyVersion: number;
  operation: string;
  resource: string;
  walletAddress: string;
  ttlSec?: number;
}): BoundVerificationRequest {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (input.ttlSec ?? 300) * 1000);
  return {
    request_id: input.requestId,
    partner_id: input.partnerId,
    policy_id: input.policyId,
    policy_version: input.policyVersion,
    operation: input.operation,
    resource: input.resource,
    wallet_subject: input.walletAddress,
    expires_at: expiresAt.toISOString(),
    disclosure: "minimal",
  };
}

export const SANDBOX_PROTOCOL_PARTNER_ID = EPHEMERAL_SANDBOX_TEST_PARTNER_ID;
