// FILE: lib/institutional/mandate/enforceInstitutionalAction.ts
// Build 886 — relying-party enforcement with trusted policy + sealed transaction context.

import type { SignedIssuerAuthorityStatement } from "@/lib/persistence/boundary/issuerAuthority/contract";
import {
  evaluateTransactionMandate,
  type MandateEnforcementOutcome,
  type ProposedInstitutionalTransaction,
  type SyntheticInstitutionalMandate,
} from "@/lib/institutional/transactionMandateEnforcement";
import type { SignedInstitutionalMandate } from "./contract";
import type { InstitutionalMandatePayload } from "./contract";
import { verifySignedInstitutionalMandate } from "./signVerify";
import {
  verifyEvidenceCommitment,
  EVIDENCE_COMMITMENT_SCHEMA,
  type EvidenceCommitmentEntryV1,
} from "@abraxas/independent-verifier";
import {
  assertTrustedPolicyMatchesMandate,
  type TrustedInstitutionalEnforcementPolicy,
} from "./enforcementPolicy";
import {
  sealProtectedActionExecutionContext,
  type ProtectedActionExecutionContext,
  verifyProtectedActionExecutionContext,
} from "./transactionContext";

export type IndependentReceiptContext = {
  /** Must be produced by @abraxas/independent-verifier (or equivalent), not client-asserted alone. */
  cryptographically_verified: boolean;
  outcome: "permit" | "deny" | "indeterminate";
  policy_id: string;
  policy_version: number;
  evidence_commitment?: { digest: string; entry_count: number } | null;
  evidence_manifest?: EvidenceCommitmentEntryV1[] | null;
};

export type RelyingPartyEnforcementResult = {
  enforcement_action: MandateEnforcementOutcome;
  mandate_outcome: MandateEnforcementOutcome;
  abraxas_outcome: MandateEnforcementOutcome | "not_evaluated";
  reasons: string[];
  trust_boundaries: string[];
  execution_id?: string;
};

export function mandatePayloadToSynthetic(payload: InstitutionalMandatePayload): SyntheticInstitutionalMandate {
  return {
    mandate_id: payload.mandate_id,
    issuer_id: payload.issuer_id,
    tenant_id: payload.tenant_id,
    policy_id: payload.policy_id,
    policy_version: payload.policy_version,
    authorized_actor_wallet: payload.authorized_actor_wallet,
    transaction_scope: {
      kind: payload.action_type,
      max_amount_usd: payload.max_amount_usd,
      destination_fingerprint: payload.destination_fingerprint,
    },
    not_before_iso: payload.not_before,
    not_after_iso: payload.not_after,
    revoked_at_iso: payload.revoked_at,
  };
}

function bindReceiptToMandate(input: {
  mandate: InstitutionalMandatePayload;
  receipt: IndependentReceiptContext;
  requireMandateBinding: boolean;
}): { ok: true } | { ok: false; reason: string; trust_boundary: string } {
  if (!input.receipt.cryptographically_verified) {
    return {
      ok: false,
      reason: "receipt_not_independently_verified",
      trust_boundary: "independent_proof",
    };
  }
  if (input.receipt.policy_id !== input.mandate.policy_id) {
    return { ok: false, reason: "receipt_policy_mismatch", trust_boundary: "policy_binding" };
  }
  if (input.receipt.policy_version !== input.mandate.policy_version) {
    return { ok: false, reason: "receipt_policy_version_mismatch", trust_boundary: "policy_version_binding" };
  }
  if (input.requireMandateBinding) {
    if (!input.receipt.evidence_commitment || !input.receipt.evidence_manifest) {
      return {
        ok: false,
        reason: "mandate_receipt_binding_required",
        trust_boundary: "mandate_receipt_binding",
      };
    }
  }
  if (input.receipt.evidence_commitment && input.receipt.evidence_manifest) {
    const commitmentOk = verifyEvidenceCommitment({
      commitment: {
        schema: EVIDENCE_COMMITMENT_SCHEMA,
        digest: input.receipt.evidence_commitment.digest,
        entry_count: input.receipt.evidence_commitment.entry_count,
      },
      manifest: input.receipt.evidence_manifest,
    });
    if (!commitmentOk.ok) {
      return { ok: false, reason: commitmentOk.reason, trust_boundary: "evidence_commitment_integrity" };
    }
    const bound = input.receipt.evidence_manifest.some(
      (e) => e.fact_id === input.mandate.mandate_id && e.dependency_type === "reusable_fact",
    );
    if (!bound) {
      return { ok: false, reason: "receipt_not_bound_to_mandate", trust_boundary: "mandate_receipt_binding" };
    }
  }
  return { ok: true };
}

export type EnforceProtectedInstitutionalActionInput = {
  signedMandate: SignedInstitutionalMandate;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  /** Trusted config — never from unauthenticated request body alone. */
  trustedEnforcementPolicy: TrustedInstitutionalEnforcementPolicy;
  /** Server-sealed transaction; digest must match transaction fields. */
  trustedExecution: ProtectedActionExecutionContext;
  now: Date;
  /** Required when trustedEnforcementPolicy.mode === mandate_and_abraxas_receipt */
  independentReceipt?: IndependentReceiptContext | null;
};

/**
 * Primary relying-party entrypoint (Build 886).
 * No optional bypass flags — mode comes from trustedEnforcementPolicy only.
 */
export function enforceProtectedInstitutionalAction(
  input: EnforceProtectedInstitutionalActionInput,
): RelyingPartyEnforcementResult {
  const fail = (
    reason: string,
    boundary: string,
    abraxas: MandateEnforcementOutcome | "not_evaluated" = "not_evaluated",
  ): RelyingPartyEnforcementResult => ({
    enforcement_action: "indeterminate",
    mandate_outcome: "indeterminate",
    abraxas_outcome: abraxas,
    reasons: [reason],
    trust_boundaries: [boundary],
    execution_id: input.trustedExecution.execution_id,
  });

  const ctxOk = verifyProtectedActionExecutionContext(input.trustedExecution);
  if (!ctxOk.ok) {
    return fail(ctxOk.reason, "protected_transaction_context");
  }

  const verified = verifySignedInstitutionalMandate({
    signed: input.signedMandate,
    signedIssuerAuthority: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    environment: input.trustedEnforcementPolicy.environment,
    now: input.now,
  });
  if (!verified.ok) {
    return fail(verified.reason, verified.trust_boundary);
  }

  const policyOk = assertTrustedPolicyMatchesMandate({
    trustedPolicy: input.trustedEnforcementPolicy,
    mandatePolicyId: verified.payload.policy_id,
    mandatePolicyVersion: verified.payload.policy_version,
    mandateTenantId: verified.payload.tenant_id,
    mandateEnvironment: verified.payload.environment,
  });
  if (!policyOk.ok) {
    return fail(policyOk.reason, policyOk.trust_boundary);
  }

  const transaction = input.trustedExecution.transaction;
  const synthetic = mandatePayloadToSynthetic(verified.payload);
  const mode = input.trustedEnforcementPolicy.mode;

  let abraxasOutcome: MandateEnforcementOutcome | "not_evaluated" = "not_evaluated";
  let abraxasReceiptVerified = false;
  let abraxasDecision: "permit" | "deny" | "indeterminate" | undefined;
  let abraxasGate: "required" | "skipped" = "skipped";

  if (mode === "mandate_and_abraxas_receipt") {
    abraxasGate = "required";
    if (!input.independentReceipt) {
      return fail("independent_receipt_required", "independent_proof");
    }
    const binding = bindReceiptToMandate({
      mandate: verified.payload,
      receipt: input.independentReceipt,
      requireMandateBinding: true,
    });
    if (!binding.ok) {
      return fail(binding.reason, binding.trust_boundary, "indeterminate");
    }
    abraxasReceiptVerified = true;
    abraxasDecision = input.independentReceipt.outcome;
    abraxasOutcome = input.independentReceipt.outcome;
    if (abraxasDecision !== "permit") {
      return {
        enforcement_action: abraxasDecision === "deny" ? "deny" : "indeterminate",
        mandate_outcome: "indeterminate",
        abraxas_outcome: abraxasOutcome,
        reasons: [`abraxas_${abraxasDecision}`],
        trust_boundaries: ["independent_proof"],
        execution_id: input.trustedExecution.execution_id,
      };
    }
  } else if (input.independentReceipt) {
    return fail("receipt_not_permitted_for_mandate_only_policy", "trusted_application_policy");
  }

  const mandateEval = evaluateTransactionMandate({
    mandate: synthetic,
    transaction,
    now: input.now,
    abraxas_gate: abraxasGate,
    abraxas_receipt_verified: abraxasReceiptVerified,
    abraxas_outcome: abraxasDecision,
  });

  const trust_boundaries: string[] = ["protected_transaction_context", "issuer_authority_verified"];
  if (mode === "mandate_and_abraxas_receipt") {
    trust_boundaries.push("independent_proof", "mandate_receipt_binding");
  }

  return {
    enforcement_action: mandateEval.outcome,
    mandate_outcome: mandateEval.outcome,
    abraxas_outcome: abraxasOutcome,
    reasons: mandateEval.reasons,
    trust_boundaries: mandateEval.outcome === "permit" ? [...trust_boundaries, "mandate_scope_satisfied"] : trust_boundaries,
    execution_id: input.trustedExecution.execution_id,
  };
}

/** @deprecated Use enforceProtectedInstitutionalAction — retained for migration tests only. */
export function enforceInstitutionalAction(input: {
  signedMandate: SignedInstitutionalMandate;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  environment: "demo" | "production";
  transaction: ProposedInstitutionalTransaction;
  now: Date;
  independentReceipt?: IndependentReceiptContext | null;
  requireIndependentReceipt?: boolean;
}): RelyingPartyEnforcementResult {
  const trustedPolicy: TrustedInstitutionalEnforcementPolicy = {
    mode: input.requireIndependentReceipt ? "mandate_and_abraxas_receipt" : "mandate_only",
    policy_id: input.signedMandate.payload.policy_id,
    policy_version: input.signedMandate.payload.policy_version,
    tenant_id: input.signedMandate.payload.tenant_id,
    environment: input.environment,
  };
  return enforceProtectedInstitutionalAction({
    signedMandate: input.signedMandate,
    signedIssuerAuthority: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    trustedEnforcementPolicy: trustedPolicy,
    trustedExecution: sealProtectedActionExecutionContext("legacy_compat", input.transaction),
    now: input.now,
    independentReceipt: input.independentReceipt,
  });
}
