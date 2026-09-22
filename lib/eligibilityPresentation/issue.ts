// FILE: lib/eligibilityPresentation/issue.ts

import { randomBytes } from "node:crypto";
import {
  ELIGIBILITY_PRESENTATION_ISSUER,
  ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
  ELIGIBILITY_PRESENTATION_VERSION,
} from "./contract";
import { nonceHash, opaquePresentationRef, partnerHmac } from "./opaque";
import { loadPresentationRequest, savePresentation, savePresentationRequest } from "./store";
import { ORGANIZATION_RESULT_CATEGORIES } from "@/lib/organizationEligibility/contract";
import {
  SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT,
  isSandboxInstitutionalProtocolAccessPolicyId,
} from "@/lib/partner/sandboxInstitutionalProtocolAccess";
import { requireLiveOrganizationEligibility } from "@/lib/organizationEligibility/revoke";
import { assertReceiptMatchesRequest, loadBoundSourceReceipt } from "./complete";
import { signPresentationPayload } from "./sign";
import { operatorSandboxHolderBinding } from "@/lib/partner/sandboxInstitutionalOperatorResult/holderBinding";
import type { EligibilityPresentationEnvelope, EligibilityPresentationPayload } from "./types";

export const ISSUE_REQUEST_KEYS = ["request_ref", "verifier_nonce"] as const;

function fail(code: string): never {
  throw Object.assign(new Error(code), { code });
}

export async function issueEligibilityPresentation(input: {
  partnerId: string;
  request_ref: string;
  verifier_nonce: string;
}): Promise<EligibilityPresentationEnvelope> {
  const request = await loadPresentationRequest(input.request_ref);
  if (!request) fail("not_found");
  if (request.partner_hmac !== partnerHmac(input.partnerId)) fail("cross_partner");
  if (request.status === "issued" || request.status === "consumed") fail("replayed");
  if (request.status === "expired") fail("expired");
  if (request.status !== "completed") fail("no_completed_result");
  if (new Date(request.expires_at).getTime() <= Date.now()) fail("expired");
  if (nonceHash(input.verifier_nonce) !== request.nonce_hash) fail("nonce_mismatch");
  if (isSandboxInstitutionalProtocolAccessPolicyId(request.policy_id)
    && request.result_category !== SANDBOX_INSTITUTIONAL_PROTOCOL_ACCESS_RESULT) {
    fail("policy_mismatch");
  }
  const receipt = await loadBoundSourceReceipt(request);
  assertReceiptMatchesRequest(request, receipt, input.partnerId);
  if ((ORGANIZATION_RESULT_CATEGORIES as readonly string[]).includes(request.result_category)) {
    await requireLiveOrganizationEligibility({
      partnerId: input.partnerId,
      result_category: request.result_category,
      policy_id: request.policy_id,
      policy_version: request.policy_version,
      action: request.action,
      environment: request.environment,
      subject_binding_hash: isSandboxInstitutionalProtocolAccessPolicyId(request.policy_id)
        ? operatorSandboxHolderBinding(input.partnerId, receipt.subject_pseudonym_id)
        : undefined,
    });
  }

  const presentation_ref = opaquePresentationRef(`${request.request_ref}:${randomBytes(8).toString("hex")}`);
  const issued_at = new Date().toISOString();
  const payload: EligibilityPresentationPayload = {
    schema_version: ELIGIBILITY_PRESENTATION_VERSION,
    presentation_ref,
    issuer: ELIGIBILITY_PRESENTATION_ISSUER,
    audience_hash: request.audience_hash,
    policy_id: request.policy_id,
    policy_version: request.policy_version,
    result_category: request.result_category,
    currently_valid: true,
    environment: request.environment,
    issued_at,
    expires_at: request.expires_at,
    verifier_nonce: input.verifier_nonce,
    signing_key_id: "",
    receipt_verification_ref: receipt.id,
    selective_disclosure_summary: "result_only",
  };
  const signed = signPresentationPayload({ ...payload, signing_key_id: "pending" });
  if (!signed) fail("signing_unavailable");
  payload.signing_key_id = signed.signingKeyId;
  const resigned = signPresentationPayload(payload);
  if (!resigned) fail("signing_unavailable");

  await savePresentation({
    presentation_ref,
    request_ref: request.request_ref,
    partner_hmac: request.partner_hmac,
    audience_hash: request.audience_hash,
    policy_id: request.policy_id,
    policy_version: request.policy_version,
    action: request.action,
    action_scope: request.action_scope,
    environment: request.environment,
    result_category: request.result_category,
    nonce_hash: request.nonce_hash,
    receipt_verification_ref: receipt.id,
    signing_key_id: resigned.signingKeyId,
    payload_hash: resigned.payloadHash,
    signature: resigned.signature,
    status: "issued",
    issued_at,
    expires_at: request.expires_at,
    consumed_at: null,
    revoked_at: null,
    consent_bound: true,
  });
  await savePresentationRequest({
    ...request,
    status: "issued",
    presentation_ref,
    consent_bound: true,
  });

  return {
    media_type: ELIGIBILITY_PRESENTATION_MEDIA_TYPE,
    payload,
    signature: resigned.signature,
  };
}
