// FILE: lib/institutionalCertification/build546/independentVerifier.ts
// Standalone receipt verifier — no Abraxas sessions, no Supabase, no internal APIs required.

import { evaluateReceiptIntegrity } from "@/lib/decisionReceipts/receiptIntegrityDiagnostics";
import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { evaluatePublicReceiptTrust } from "@/lib/decisionReceipts/trustEvaluation";
import {
  resolveVerificationKey,
  verifyRecordSignatureWithRegistry,
} from "@/lib/decisionReceipts/verificationKeyLifecycle";
import type { PartnerFlowPublicReceipt } from "@/lib/partner/verifyPartnerFlowReceipt";
import {
  validatePartnerFlowPublicReceipt,
  type PartnerFlowReceiptExpectations,
} from "@/lib/partner/verifyPartnerFlowReceipt";
import { evaluateConformance, evaluateVectorConformance } from "@/lib/partner/onchainVerifierConformance/verify";
import { CONFORMANCE_VECTOR_PACKAGE } from "@/lib/partner/onchainVerifierConformance/vectors";

export type IndependentVerifierVerdict = "authorize" | "reject" | "blocked";

export type RevocationSourceState =
  | { available: true; status: "active" | "revoked" | "unknown" }
  | { available: false; reason: "unavailable" | "rpc_failure" };

export interface IndependentVerifierExpectations {
  partnerId: string;
  policyId: string;
  allowSandbox?: boolean;
  audiencePartnerId?: string;
}

export interface IndependentVerifierInput {
  /** Full signed record enables local Ed25519 + registry verification. */
  signedRecord?: DecisionReceiptRecord;
  /** Public/partner view — may rely on issuer-computed flags when record absent. */
  publicReceipt?: PartnerFlowPublicReceipt;
  expectations: IndependentVerifierExpectations;
  now?: Date;
  env?: Record<string, string | undefined>;
  revocationSource?: RevocationSourceState;
  /** Optional chain attestation package (EVM/Solana conformance vectors). */
  chainPackage?: unknown;
  chainRpcAvailable?: boolean;
}

export interface IndependentVerifierPhase {
  id: string;
  status: "pass" | "fail" | "blocked" | "skipped";
  detail: string;
}

export interface IndependentVerifierResult {
  verdict: IndependentVerifierVerdict;
  cryptographically_authentic: boolean;
  /** Never true from signature alone — requires freshness + revocation when mandated. */
  currently_authorizable: boolean;
  phases: IndependentVerifierPhase[];
  failure_codes: string[];
  checks_possible_offline: string[];
  checks_requiring_live_authority: string[];
  disclaimer: string;
}

const OFFLINE_CHECKS = [
  "payload_hash_recomputation",
  "ed25519_signature",
  "verification_key_registry",
  "policy_and_partner_binding",
  "artifact_schema",
  "not_before_expiry_window",
  "chain_vector_conformance",
] as const;

const LIVE_CHECKS = [
  "current_revocation_status",
  "claim_dependency_refresh",
  "supersession",
  "live_chain_observation",
] as const;

export function verifyReceiptIndependently(input: IndependentVerifierInput): IndependentVerifierResult {
  const now = input.now ?? new Date();
  const env = input.env ?? {};
  const phases: IndependentVerifierPhase[] = [];
  const failure_codes: string[] = [];
  let cryptographically_authentic = false;
  let currently_authorizable = false;

  const push = (id: string, status: IndependentVerifierPhase["status"], detail: string, code?: string) => {
    phases.push({ id, status, detail });
    if (code && (status === "fail" || status === "blocked")) failure_codes.push(code);
  };

  if (input.signedRecord) {
    const record = input.signedRecord;
    const integrity = evaluateReceiptIntegrity(record);
    push(
      "payload_integrity",
      integrity.payload_hash_matches_recomputed ? "pass" : "fail",
      integrity.payload_hash_matches_recomputed
        ? "Canonical payload hash matches signed artifact."
        : "Payload hash mismatch — tampered receipt body.",
      integrity.payload_hash_matches_recomputed ? undefined : "payload_tampered",
    );

    const keyResolved = resolveVerificationKey({
      keyId: record.signing_key_id,
      schemaVersion: record.schema_version,
      now,
      env,
    });
    if (!keyResolved.ok) {
      push("issuer_key", "fail", `Signing key rejected: ${keyResolved.reason}`, keyResolved.reason);
    } else {
      push("issuer_key", "pass", `Trusted issuer key ${record.signing_key_id} (${keyResolved.key.status}).`);
    }

    const sigOk = verifyRecordSignatureWithRegistry(record, now, env);
    cryptographically_authentic = integrity.payload_hash_matches_recomputed && sigOk && keyResolved.ok;
    push(
      "signature_authenticity",
      sigOk && integrity.payload_hash_matches_recomputed ? "pass" : "fail",
      sigOk ? "Ed25519 signature verified against registry public key." : "Signature verification failed.",
      sigOk ? undefined : "signature_invalid",
    );
  } else if (input.publicReceipt) {
    push(
      "signature_authenticity",
      "skipped",
      "Public view without full signed record — cannot recompute Ed25519 locally; use signedRecord for offline crypto proof.",
    );
    cryptographically_authentic = input.publicReceipt.signature_valid === true;
  } else {
    push("input", "fail", "No receipt material supplied.", "receipt_missing");
  }

  const receiptView: PartnerFlowPublicReceipt | null = input.publicReceipt
    ?? (input.signedRecord ? {
      receipt_id: input.signedRecord.id,
      schema_version: input.signedRecord.schema_version,
      partner_id: input.signedRecord.partner_id,
      policy_id: input.signedRecord.policy_id,
      decision_result: input.signedRecord.decision_result,
      signature_valid: cryptographically_authentic,
      expires_at: input.signedRecord.expires_at,
      status: input.signedRecord.status,
      production_usable: input.signedRecord.decision_context === "production",
      artifact_type: "eligibility_decision_receipt",
    } : null);

  const expectations: PartnerFlowReceiptExpectations = {
    partnerId: input.expectations.partnerId,
    policyId: input.expectations.policyId,
    now,
    allowSandbox: input.expectations.allowSandbox,
  };

  if (receiptView) {
    const evaluatedAt = input.signedRecord?.evaluated_at;
    if (evaluatedAt) {
      const evaluatedMs = new Date(evaluatedAt).getTime();
      const future = !Number.isNaN(evaluatedMs) && evaluatedMs > now.getTime();
      push(
        "temporal_validity",
        future ? "fail" : "pass",
        future ? "Receipt evaluated_at is in the future relative to verifier clock." : "Issuance timestamp not in the future.",
        future ? "receipt_future_dated" : undefined,
      );
    }

    const validation = validatePartnerFlowPublicReceipt(receiptView, expectations);
    push(
      "policy_scope",
      validation.ok ? "pass" : "fail",
      validation.ok ? "Partner and policy binding satisfied." : validation.errors.join("; "),
      validation.ok ? undefined : validation.errors.join(";"),
    );

    const audience = input.expectations.audiencePartnerId ?? input.expectations.partnerId;
    const audienceOk = receiptView.partner_id === audience;
    push(
      "audience_binding",
      audienceOk ? "pass" : "fail",
      audienceOk
        ? `Receipt audience partner ${receiptView.partner_id} matches relying party.`
        : `Cross-application misuse: expected partner ${audience}, got ${receiptView.partner_id ?? "missing"}.`,
      audienceOk ? undefined : "audience_mismatch",
    );

    const trust = evaluatePublicReceiptTrust(receiptView, {
      partnerId: input.expectations.partnerId,
      policyId: input.expectations.policyId,
      allowSandbox: input.expectations.allowSandbox,
      now,
    });

    push(
      "issuance_trust_fields",
      trust.signature_valid ? "pass" : "fail",
      trust.signature_valid ? "Trust evaluation accepts signature field." : trust.invalidation_reasons.join("; "),
      trust.signature_valid ? undefined : "signature_invalid",
    );

    if (input.revocationSource?.available === false) {
      push(
        "revocation_freshness",
        "blocked",
        `Revocation source unavailable (${input.revocationSource.reason}) — cannot establish current validity.`,
        "revocation_source_unavailable",
      );
    } else if (input.revocationSource?.available === true && input.revocationSource.status === "revoked") {
      push("revocation_freshness", "fail", "Authority reports receipt revoked.", "receipt_revoked");
    } else if (input.revocationSource?.available === true) {
      push("revocation_freshness", "pass", "Authority reports receipt not revoked at check time.");
    } else {
      push(
        "revocation_freshness",
        "blocked",
        "No live revocation feed supplied — current validity not proven (signature-only insufficient).",
        "revocation_not_checked",
      );
    }

    const liveRevocationPass = phases.find((p) => p.id === "revocation_freshness")?.status === "pass";
    const validationPass = phases.find((p) => p.id === "policy_scope")?.status === "pass";
    const audiencePass = phases.find((p) => p.id === "audience_binding")?.status === "pass";
    const temporalPass = phases.find((p) => p.id === "temporal_validity")?.status !== "fail";
    currently_authorizable =
      cryptographically_authentic
      && trust.currently_valid
      && validationPass
      && audiencePass
      && temporalPass
      && liveRevocationPass === true;
  }

  if (input.chainPackage !== undefined) {
    if (input.chainRpcAvailable === false) {
      push("chain_evidence", "blocked", "Chain RPC unavailable — cannot validate live on-chain attestation.", "chain_rpc_failure");
    } else {
      const conformance =
        input.chainPackage === CONFORMANCE_VECTOR_PACKAGE
          ? evaluateVectorConformance()
          : evaluateConformance({
              raw: input.chainPackage,
              nowSeconds: Math.floor(now.getTime() / 1000),
              receiptRefetched: true,
            });
      push(
        "chain_evidence",
        conformance.ok ? "pass" : "fail",
        conformance.ok
          ? `Chain package conforms (${conformance.gate_type}, ${conformance.network_id}).`
          : conformance.reasons.join("; "),
        conformance.ok ? undefined : "chain_mismatch",
      );
    }
  }

  const hasBlocked = phases.some((p) => p.status === "blocked");
  const hasFail = phases.some((p) => p.status === "fail");
  let verdict: IndependentVerifierVerdict = "authorize";
  if (hasBlocked) verdict = "blocked";
  else if (hasFail || !currently_authorizable) verdict = "reject";

  return {
    verdict,
    cryptographically_authentic,
    currently_authorizable,
    phases,
    failure_codes,
    checks_possible_offline: [...OFFLINE_CHECKS],
    checks_requiring_live_authority: [...LIVE_CHECKS],
    disclaimer:
      "cryptographically_authentic proves signed artifact integrity. currently_authorizable requires explicit revocation/freshness evidence — never infer from signature alone.",
  };
}

/** Reference chain vector package for offline conformance checks (no RPC). */
export function build546ReferenceChainPackage() {
  return CONFORMANCE_VECTOR_PACKAGE;
}
