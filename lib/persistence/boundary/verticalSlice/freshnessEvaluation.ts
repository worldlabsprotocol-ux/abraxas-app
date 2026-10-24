// FILE: lib/persistence/boundary/verticalSlice/freshnessEvaluation.ts
// Read-only current authorization from sovereign PostgreSQL (no Supabase SDK).

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import { querySovereignStagingPg } from "../sovereignStagingPg";

export type SovereignFreshnessLayer = {
  signature_authentic: boolean;
  issuer_authorized: boolean;
  policy_and_audience_match: boolean;
  currently_acceptable: boolean;
};

export type SovereignFreshnessEvaluation = SovereignFreshnessLayer & {
  invalidation_reasons: string[];
  store_available: boolean;
  checked_at: string;
};

type PartnerRow = { status: string };
type PolicyRow = {
  status: string;
  deprecate_effective_at: string | null;
  partner_id: string;
};
type IssuerRow = { status: string };

export async function evaluateReceiptFreshnessFromSovereignPg(input: {
  record: DecisionReceiptRecord;
  issuerPublicJwk: JsonWebKey;
  expectedPartnerId?: string;
  expectedPolicyId?: string;
  now?: Date;
  env?: Record<string, string | undefined>;
}): Promise<SovereignFreshnessEvaluation> {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const checkedAt = now.toISOString();
  const reasons: string[] = [];
  let storeAvailable = true;

  const payload = buildCanonicalPayload({
    receipt_id: input.record.id,
    decision_id: input.record.verification_decision_id,
    policy_id: input.record.policy_id,
    policy_version: input.record.policy_version,
    partner_id: input.record.partner_id,
    subject_pseudonym_id: input.record.subject_pseudonym_id,
    wallet_binding_ref: input.record.wallet_binding_ref,
    consent_receipt_id: input.record.consent_receipt_id,
    decision_result: input.record.decision_result,
    reason_codes: input.record.reason_codes,
    evaluated_claim_refs: input.record.evaluated_claim_refs,
    issuer_refs: input.record.issuer_refs,
    decision_context: input.record.decision_context,
    evaluated_at: input.record.evaluated_at,
    expires_at: input.record.expires_at,
  });

  const signatureAuthentic = verifyReceiptSignature(
    payload,
    input.record.signature,
    input.issuerPublicJwk,
  );
  if (!signatureAuthentic) reasons.push("signature_invalid");

  const issuerResult = await querySovereignStagingPg<IssuerRow>(
    `select status from public.issuer_signing_keys where signing_key_id = $1 limit 1`,
    [input.record.signing_key_id],
    env,
  );
  if ("error" in issuerResult) {
    storeAvailable = false;
    reasons.push("validity_store_unavailable");
  }
  const issuerAuthorized =
    !("error" in issuerResult)
    && issuerResult.rows[0]?.status === "active";
  if (!issuerAuthorized && storeAvailable) reasons.push("issuer_not_authorized");

  const expectedPartner = input.expectedPartnerId ?? input.record.partner_id;
  const expectedPolicy = input.expectedPolicyId ?? input.record.policy_id;
  const policyAudienceMatch =
    input.record.partner_id === expectedPartner && input.record.policy_id === expectedPolicy;
  if (!policyAudienceMatch) reasons.push("environment_mismatch");

  const storedStatus = resolveReceiptStatus(input.record);
  if (storedStatus === "revoked") reasons.push("receipt_revoked");
  if (
    storedStatus === "expired"
    || (input.record.expires_at && new Date(input.record.expires_at).getTime() <= now.getTime())
  ) {
    reasons.push("receipt_expired");
  }

  const partnerResult = await querySovereignStagingPg<PartnerRow>(
    `select status from public.partners where partner_id = $1 limit 1`,
    [input.record.partner_id],
    env,
  );
  if ("error" in partnerResult) {
    storeAvailable = false;
    reasons.push("validity_store_unavailable");
  }
  const partnerOperational =
    !("error" in partnerResult) && partnerResult.rows[0]?.status === "active";
  if (!partnerOperational && storeAvailable) reasons.push("partner_inactive");

  const policyResult = await querySovereignStagingPg<PolicyRow>(
    `select status, deprecate_effective_at, partner_id
       from public.partner_policies
      where id = $1 and version = $2
      limit 1`,
    [input.record.policy_id, input.record.policy_version],
    env,
  );
  if ("error" in policyResult) {
    storeAvailable = false;
    reasons.push("validity_store_unavailable");
  }
  let policyActive = false;
  if (!("error" in policyResult) && policyResult.rows[0]) {
    const row = policyResult.rows[0];
    policyActive =
      row.partner_id === input.record.partner_id
      && row.status === "active"
      && !(row.deprecate_effective_at && new Date(row.deprecate_effective_at).getTime() <= now.getTime());
  }
  if (!policyActive && storeAvailable) reasons.push("policy_no_longer_valid");

  const issuedApproved = signatureAuthentic && input.record.decision_result === "approved";
  const currentlyAcceptable =
    issuedApproved
    && issuerAuthorized
    && policyAudienceMatch
    && partnerOperational
    && policyActive
    && storedStatus === "active"
    && storeAvailable
    && !reasons.some((r) =>
      r === "receipt_revoked" || r === "receipt_expired" || r === "signature_invalid",
    );

  return {
    signature_authentic: signatureAuthentic,
    issuer_authorized: issuerAuthorized,
    policy_and_audience_match: policyAudienceMatch,
    currently_acceptable: currentlyAcceptable,
    invalidation_reasons: Array.from(new Set(reasons)),
    store_available: storeAvailable,
    checked_at: checkedAt,
  };
}
