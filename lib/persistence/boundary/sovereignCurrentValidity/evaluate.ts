// FILE: lib/persistence/boundary/sovereignCurrentValidity/evaluate.ts
// Complete current-validity on sovereign path — issuer trust from signed statements, not DB alone.

import type { DecisionReceiptRecord } from "@/lib/decisionReceipts/types";
import { buildCanonicalPayload } from "@/lib/decisionReceipts/canonical";
import { verifyReceiptSignature } from "@/lib/decisionReceipts/signing";
import { resolveReceiptStatus } from "@/lib/decisionReceipts/views";
import type { SignedIssuerAuthorityStatement } from "../issuerAuthority/contract";
import { resolveIssuerKeyFromSignedStatement } from "../issuerAuthority/resolveIssuerKey";
import { isReceiptSupersededOnSovereignPg } from "../verticalSlice/supersessionRead";
import { querySovereignStagingPg } from "../sovereignStagingPg";
import type { SovereignFreshnessEvaluation } from "../verticalSlice/freshnessEvaluation";

export type SovereignCurrentValidityResult = SovereignFreshnessEvaluation & {
  cryptographically_valid: boolean;
  superseded: boolean;
  lifecycle_status: "active" | "expired" | "revoked" | "superseded" | "invalidated";
};

type PartnerRow = { status: string };
type PolicyRow = { status: string; deprecate_effective_at: string | null; partner_id: string };

export async function evaluateSovereignCurrentValidity(input: {
  record: DecisionReceiptRecord;
  signedIssuerAuthority: SignedIssuerAuthorityStatement;
  trustAnchorPublicJwk: JsonWebKey;
  minimumRegistryVersion?: number;
  expectedPartnerId?: string;
  expectedPolicyId?: string;
  expectedEnvironment?: "demo" | "production";
  now?: Date;
  env?: Record<string, string | undefined>;
}): Promise<SovereignCurrentValidityResult> {
  const env = input.env ?? process.env;
  const now = input.now ?? new Date();
  const reasons: string[] = [];
  let storeAvailable = true;

  const runtimeEnv = input.expectedEnvironment
    ?? (input.record.decision_context === "production" ? "production" : "demo");

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

  const sigKey = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    keyId: input.record.signing_key_id,
    schemaVersion: input.record.schema_version,
    environment: runtimeEnv,
    mode: "signature_verification",
    now,
    minimumRegistryVersion: input.minimumRegistryVersion,
  });

  let cryptographicallyValid = false;
  if (sigKey.ok) {
    cryptographicallyValid = verifyReceiptSignature(
      payload,
      input.record.signature,
      sigKey.key.public_jwk,
    );
  } else {
    reasons.push(sigKey.reason);
  }
  if (!cryptographicallyValid) reasons.push("signature_invalid");

  const authKey = resolveIssuerKeyFromSignedStatement({
    statement: input.signedIssuerAuthority,
    trustAnchorPublicJwk: input.trustAnchorPublicJwk,
    keyId: input.record.signing_key_id,
    schemaVersion: input.record.schema_version,
    environment: runtimeEnv,
    mode: "current_authorization",
    now,
    minimumRegistryVersion: input.minimumRegistryVersion,
  });
  const issuerAuthorized = authKey.ok;
  if (!issuerAuthorized) reasons.push("issuer_not_authorized");

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

  let superseded = false;
  const supersession = await isReceiptSupersededOnSovereignPg(input.record.id, env);
  if ("store_unavailable" in supersession && supersession.store_unavailable) {
    storeAvailable = false;
    reasons.push("validity_store_unavailable");
  } else if (supersession.superseded) {
    superseded = true;
    reasons.push("receipt_superseded");
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
    `select status, deprecate_effective_at, partner_id from public.partner_policies
      where id = $1 and version = $2 limit 1`,
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

  const issuedApproved = cryptographicallyValid && input.record.decision_result === "approved";
  const currentlyAcceptable =
    issuedApproved
    && issuerAuthorized
    && policyAudienceMatch
    && partnerOperational
    && policyActive
    && storedStatus === "active"
    && !superseded
    && storeAvailable
    && !reasons.some((r) =>
      r === "receipt_revoked" || r === "receipt_expired" || r === "signature_invalid",
    );

  let lifecycle: SovereignCurrentValidityResult["lifecycle_status"] = "active";
  if (superseded) lifecycle = "superseded";
  else if (storedStatus === "revoked") lifecycle = "revoked";
  else if (storedStatus === "expired") lifecycle = "expired";
  else if (!currentlyAcceptable) lifecycle = "invalidated";

  return {
    signature_authentic: cryptographicallyValid,
    issuer_authorized: issuerAuthorized,
    policy_and_audience_match: policyAudienceMatch,
    currently_acceptable: currentlyAcceptable,
    cryptographically_valid: cryptographicallyValid,
    superseded,
    lifecycle_status: lifecycle,
    invalidation_reasons: Array.from(new Set(reasons)),
    store_available: storeAvailable,
    checked_at: now.toISOString(),
  };
}
