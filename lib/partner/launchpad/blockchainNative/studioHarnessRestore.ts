import type { PartnerHarnessCaseResult } from "@/lib/partner/launchpad/partnerTestHarness";
import type { PartnerHarnessScenarioId } from "@/lib/partner/launchpad/partnerTestHarness";
import type {
  DecisionReceiptContext,
  DecisionReceiptRecord,
  DecisionReceiptResult,
  DecisionReceiptStatus,
  EvaluatedClaimRef,
} from "@/lib/decisionReceipts/types";
import { DECISION_RECEIPT_SCHEMA_VERSION } from "@/lib/decisionReceipts/types";

export type PortableHarnessPersistence = NonNullable<PartnerHarnessCaseResult["persistence"]>;

const EMPTY_CALLBACK = {
  receipt_id: "",
  decision: "",
  status: "",
};

/** Rebuild harness wrapper from a prior prepare response (portable persistence only). */
export function partnerHarnessFromPortablePersistence(
  persistence: PortableHarnessPersistence,
  scenarioId: PartnerHarnessScenarioId = "approved",
): PartnerHarnessCaseResult {
  const approved = scenarioId === "approved";
  return {
    scenario_id: scenarioId,
    simulated: false,
    passed: approved,
    expected_access: "allow_sandbox",
    observed_access: approved ? "allow" : "deny",
    validity: approved ? "valid" : "invalid",
    invalidation_reasons: [],
    signature_valid: true,
    production_usable: false,
    callback_params: EMPTY_CALLBACK,
    pii_scan_passed: true,
    signing_source: "configured_issuer_key",
    verification_path: "evaluatePublicReceiptTrust+validatePartnerFlowPublicReceipt",
    persistence,
  };
}

export function portablePersistencePartnerId(persistence: PortableHarnessPersistence): string | null {
  const partnerId = (persistence.public_payload as { partner_id?: string }).partner_id;
  return typeof partnerId === "string" && partnerId.trim() ? partnerId.trim() : null;
}

/** Map harness portable persistence to a decision record for independent verification. */
export function harnessPersistenceToDecisionRecord(persistence: PortableHarnessPersistence): DecisionReceiptRecord {
  const pub = persistence.public_payload as Record<string, unknown>;
  const status = (pub.status as DecisionReceiptStatus) ?? "active";
  const evaluatedAt = String(pub.evaluated_at ?? new Date().toISOString());
  return {
    id: persistence.receipt_id,
    verification_decision_id: String(pub.verification_decision_id ?? ""),
    consent_receipt_id: (pub.consent_receipt_id as string | null) ?? null,
    partner_id: String(pub.partner_id ?? ""),
    policy_id: String(pub.policy_id ?? ""),
    policy_version: Number(pub.policy_version ?? 1),
    subject_pseudonym_id: String(pub.subject_pseudonym_id ?? ""),
    wallet_binding_ref: (pub.wallet_binding_ref as string | null) ?? null,
    decision_result: pub.decision_result as DecisionReceiptResult,
    reason_codes: Array.isArray(pub.reason_codes) ? (pub.reason_codes as string[]) : [],
    evaluated_claim_refs: Array.isArray(pub.evaluated_claim_refs)
      ? (pub.evaluated_claim_refs as EvaluatedClaimRef[])
      : [],
    issuer_refs: Array.isArray(pub.issuer_refs) ? (pub.issuer_refs as string[]) : [],
    decision_context: (pub.decision_context as DecisionReceiptContext) ?? "sandbox_only",
    evaluated_at: evaluatedAt,
    expires_at: (pub.expires_at as string | null) ?? persistence.expires_at,
    revoked_at: status === "revoked" ? evaluatedAt : null,
    issuance_finalized_at: evaluatedAt,
    status,
    schema_version: String(pub.schema_version ?? DECISION_RECEIPT_SCHEMA_VERSION),
    payload_hash: String(pub.payload_hash ?? ""),
    signature: persistence.signature,
    signing_key_id: String(pub.signing_key_id ?? ""),
    anchor_reference: (pub.anchor_reference as string | null) ?? null,
    idempotency_key: null,
    created_at: evaluatedAt,
  };
}