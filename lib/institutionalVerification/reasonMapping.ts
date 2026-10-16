// FILE: lib/institutionalVerification/reasonMapping.ts

import type { IndependentVerifierResult } from "@/lib/institutionalCertification/build546/independentVerifier";
import type { ProofFirstVerificationOutcome } from "@/lib/protocol/proofFirst/proofFirstRelyingParty";
import type { InstitutionalVerifierRejectionReason } from "./contract";

const RECEIPT_CODE_MAP: Record<string, InstitutionalVerifierRejectionReason> = {
  payload_tampered: "payload_tampered",
  signature_invalid: "signature_invalid",
  unknown_key: "issuer_untrusted",
  unknown_key_id: "issuer_untrusted",
  historical_not_allowed: "issuer_key_retired",
  expired: "expired",
  partner_mismatch: "tenant_partner_mismatch",
  policy_mismatch: "tenant_policy_mismatch",
  audience_mismatch: "audience_mismatch",
  revoked: "revoked",
  receipt_revoked: "revoked",
  revocation_unavailable: "revocation_unavailable",
  sandbox_not_allowed: "authorization_denied",
};

export function mapReceiptFailureCodes(
  underlying: IndependentVerifierResult,
): InstitutionalVerifierRejectionReason[] {
  const mapped = new Set<InstitutionalVerifierRejectionReason>();
  for (const code of underlying.failure_codes) {
    const direct = RECEIPT_CODE_MAP[code];
    if (direct) {
      mapped.add(direct);
      continue;
    }
    if (code.includes("unknown_key")) mapped.add("issuer_untrusted");
    else if (code.includes("expired")) mapped.add("expired");
    else if (code.includes("partner")) mapped.add("tenant_partner_mismatch");
    else if (code.includes("policy")) mapped.add("tenant_policy_mismatch");
    else if (code.includes("revocation")) mapped.add("revocation_unavailable");
    else mapped.add("authorization_denied");
  }
  if (underlying.verdict === "blocked" && mapped.size === 0) {
    mapped.add("revocation_unavailable");
  }
  return Array.from(mapped);
}

export function mapPresentationFailure(
  outcome: ProofFirstVerificationOutcome,
): InstitutionalVerifierRejectionReason[] {
  const mapped = new Set<InstitutionalVerifierRejectionReason>();
  if (outcome.replay_detected) mapped.add("replay_detected");
  if (outcome.unsigned_revocation_hint_rejected) mapped.add("portable_revocation_unsigned");
  if (outcome.portable_revocation_authenticated === false) {
    mapped.add("portable_revocation_unsigned");
  }
  for (const code of outcome.portable_revocation_codes ?? []) {
    if (code.includes("stale")) mapped.add("revocation_stale");
    else if (code.includes("issuer")) mapped.add("issuer_untrusted");
    else mapped.add("revocation_stale");
  }
  for (const code of outcome.presentation_binding_deny_codes ?? []) {
    mapped.add("presentation_binding_invalid");
  }
  for (const code of mapReceiptFailureCodes(outcome.verifier)) {
    mapped.add(code);
  }
  if (outcome.outcome !== "granted" && mapped.size === 0) {
    mapped.add("authorization_denied");
  }
  return Array.from(mapped);
}

export function receiptVerdictFromUnderlying(
  underlying: IndependentVerifierResult,
): "valid" | "invalid" | "blocked" {
  if (underlying.verdict === "authorize" && underlying.currently_authorizable) return "valid";
  if (underlying.verdict === "blocked") return "blocked";
  return "invalid";
}

export function presentationVerdictFromOutcome(
  outcome: ProofFirstVerificationOutcome,
): "valid" | "invalid" | "blocked" {
  if (outcome.outcome === "granted" && outcome.authorization_verified) return "valid";
  if (outcome.outcome === "blocked") return "blocked";
  return "invalid";
}
