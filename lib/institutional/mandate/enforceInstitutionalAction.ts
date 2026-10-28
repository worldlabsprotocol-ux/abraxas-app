// FILE: lib/institutional/mandate/enforceInstitutionalAction.ts
// Relying-party enforcement: verified mandate + optional Abraxas receipt + transaction scope.

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

export type IndependentReceiptContext = {
  /** Must come from independent verification — never trust client-asserted flags alone. */
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

/**
 * Full relying-party gate: issuer-backed mandate + transaction scope + optional independent receipt.
 * Wallet control alone never satisfies this function.
 */
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
  const trust_boundaries: string[] = [];
  const reasons: string[] = [];

  const verified = verifySignedInstitutionalMandate({
    signed: input.signedMandate,
    signedIssuerAuthority: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    environment: input.environment,
    now: input.now,
  });
  if (!verified.ok) {
    return {
      enforcement_action: "indeterminate",
      mandate_outcome: "indeterminate",
      abraxas_outcome: "not_evaluated",
      reasons: [verified.reason],
      trust_boundaries: [verified.trust_boundary],
    };
  }

  const synthetic = mandatePayloadToSynthetic(verified.payload);
  let abraxasOutcome: MandateEnforcementOutcome | "not_evaluated" = "not_evaluated";
  let abraxasReceiptVerified = false;
  let abraxasDecision: "permit" | "deny" | "indeterminate" | undefined;

  if (input.independentReceipt) {
    const binding = bindReceiptToMandate({
      mandate: verified.payload,
      receipt: input.independentReceipt,
    });
    if (!binding.ok) {
      return {
        enforcement_action: "indeterminate",
        mandate_outcome: "indeterminate",
        abraxas_outcome: "indeterminate",
        reasons: [binding.reason],
        trust_boundaries: [binding.trust_boundary],
      };
    }
    abraxasReceiptVerified = true;
    abraxasDecision = input.independentReceipt.outcome;
    abraxasOutcome = input.independentReceipt.outcome;
  } else if (input.requireIndependentReceipt) {
    return {
      enforcement_action: "indeterminate",
      mandate_outcome: "indeterminate",
      abraxas_outcome: "not_evaluated",
      reasons: ["independent_receipt_required"],
      trust_boundaries: ["independent_proof"],
    };
  }

  const mandateEval = evaluateTransactionMandate({
    mandate: synthetic,
    transaction: input.transaction,
    now: input.now,
    abraxas_receipt_verified: abraxasReceiptVerified,
    abraxas_outcome: abraxasDecision,
  });

  reasons.push(...mandateEval.reasons);
  if (mandateEval.outcome === "permit") {
    trust_boundaries.push("mandate_scope_satisfied", "issuer_authority_verified");
  }

  return {
    enforcement_action: mandateEval.outcome,
    mandate_outcome: mandateEval.outcome,
    abraxas_outcome: abraxasOutcome,
    reasons,
    trust_boundaries,
  };
}
